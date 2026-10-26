from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from plantacion.models import Plantacion
from plantacion.serializers import PlantacionSerializer
from .models import Actividad
from .serializers import ActividadSerializer

FREQ_RIEGO_DEFAULT = 2          # días entre riegos
MAX_RIEGOS_DIA     = 2          # más de esto = ahogo
DIAS_SEQUIA        = 6          # días sin riego = muerte por sequía


def _calcular_estado_por_tiempo(plantacion, hoy):
    """
    Recalcula el estado de crecimiento basado en días transcurridos.
    No sobreescribe estados terminales (muerta, cosechado).
    """
    if plantacion.estado in ("muerta_sequia","muerta_ahogo","cosechado","pasada"):
        return plantacion.estado

    duracion = getattr(plantacion.cultivo_tipo, "duracion_dias", 60) or 60
    dias = (hoy - plantacion.fecha_siembra).days

    # Verificar sequía
    if plantacion.ultimo_riego:
        dias_sin_agua = (hoy - plantacion.ultimo_riego).days
    else:
        dias_sin_agua = dias  # nunca regada

    if dias_sin_agua >= DIAS_SEQUIA:
        return "muerta_sequia"

    # Verificar si se pasó de cosecha
    dias_post = dias - duracion
    if dias_post > duracion * 0.5:
        return "pasada"

    # Progreso de crecimiento
    pct = dias / duracion
    if pct < 0.10: return "sembrado"
    if pct < 0.30: return "germinacion"
    if pct < 0.60: return "crecimiento"
    if pct < 0.90: return "maduracion"
    return "listo"


class RegarView(APIView):
    """
    POST /api/actividad/<id>/regar/
    
    Lógica de riego con control de ahogo:
    - 1ª vez en el día: riego normal
    - 2ª vez: advertencia "exceso leve"
    - 3ª vez o más: planta muere por ahogo
    """
    def post(self, request, plantacion_id):
        try:
            p = Plantacion.objects.get(id=plantacion_id)
        except Plantacion.DoesNotExist:
            return Response({"error": "No encontrada"}, status=404)

        if p.esta_muerta():
            return Response({"error": "La planta ya está muerta"}, status=400)
        if p.estado == "cosechado":
            return Response({"error": "Ya fue cosechada"}, status=400)

        offset = int(request.data.get("offset_dias", 0))
        hoy = date.today() + timedelta(days=offset)
        nuevo_estado = _calcular_estado_por_tiempo(p, hoy)
        p.reset_riego_si_nuevo_dia(hoy)
        p.veces_regada_hoy += 1

        # ── Ahogo ────────────────────────────────────────
        if p.veces_regada_hoy > MAX_RIEGOS_DIA:
            p.estado = "muerta_ahogo"
            p.save()
            Actividad.objects.create(
                plantacion=p, accion="muerte",
                descripcion=f"Muerta por ahogo — regada {p.veces_regada_hoy}x en un día"
            )
            return Response(PlantacionSerializer(p).data, status=200)

        # ── Riego normal ─────────────────────────────────
        freq = getattr(p.cultivo_tipo, "frecuencia_riego_dias", None) or FREQ_RIEGO_DEFAULT
        p.ultimo_riego  = hoy
        p.proximo_riego = hoy + timedelta(days=freq)

        # Recalcular estado de crecimiento
        nuevo_estado = _calcular_estado_por_tiempo(p, hoy)
        if nuevo_estado != p.estado:
            p.estado = nuevo_estado

        p.save()

        descripcion = "Riego normal"
        if p.veces_regada_hoy == MAX_RIEGOS_DIA:
            descripcion = "Segundo riego del día — riesgo de ahogo"

        Actividad.objects.create(
            plantacion=p, accion="riego",
            descripcion=descripcion
        )

        return Response(PlantacionSerializer(p).data, status=200)


class CosecharView(APIView):
    """POST /api/actividad/<id>/cosechar/"""
    def post(self, request, plantacion_id):
        try:
            p = Plantacion.objects.get(id=plantacion_id)
        except Plantacion.DoesNotExist:
            return Response({"error": "No encontrada"}, status=404)

        if p.esta_muerta():
            return Response({"error": "No se puede cosechar una planta muerta"}, status=400)

        hoy = date.today()

        p.estado = "cosechado"
        p.save()

        Actividad.objects.create(
            plantacion=p,
            accion="cosecha",
            descripcion=f"Cosechado el {hoy.strftime('%d/%m/%Y')}"
        )

        return Response(PlantacionSerializer(p).data, status=200)



class LimpiarCeldaView(APIView):

    """
        POST /api/actividad/<id>/limpiar/
        Elimina físicamente la plantación (muerta o cosechada).
        El frontend limpia la celda del canvas.
    """
    def post(self, request, plantacion_id):
        try:
            p = Plantacion.objects.get(id=plantacion_id)
        except Plantacion.DoesNotExist:
            return Response({"error": "No encontrada"}, status=404)

        # recalcular estado REAL antes de validar
        offset = int(request.data.get("offset_dias", 0))
        hoy = date.today() + timedelta(days=offset)
        nuevo_estado = _calcular_estado_por_tiempo(p, hoy)

        if nuevo_estado != p.estado:
            p.estado = nuevo_estado
            p.save()

        if p.estado not in ("cosechado","muerta_sequia","muerta_ahogo","pasada"):
            return Response(
                {"error": "Solo se pueden limpiar celdas cosechadas, muertas o pasadas"},
                status=400
            )

        p.delete()
        return Response({"deleted_id": plantacion_id}, status=200)
class SincronizarEstadosView(APIView):
    """
    POST /api/actividad/sincronizar-estados/<huerto_id>/
    Recalcula estados de todas las plantaciones del huerto según tiempo real.
    Llamar al abrir el editor para tener estados actualizados.
    """
    def post(self, request, huerto_id):
        plantaciones = Plantacion.objects.filter(
            huerto_id=huerto_id
        ).exclude(
            estado__in=("cosechado",)
        )

        actualizadas = []
        for p in plantaciones:
            estado_anterior = p.estado
            offset = int(request.data.get("offset_dias", 0))
            hoy = date.today() + timedelta(days=offset)
            nuevo = _calcular_estado_por_tiempo(p, hoy)
            if nuevo != estado_anterior:
                p.estado = nuevo
                p.save()
                if nuevo in ("muerta_sequia", "muerta_ahogo", "pasada"):
                    Actividad.objects.create(
                        plantacion=p, accion="muerte" if "muerta" in nuevo else "avance",
                        descripcion=f"Estado actualizado automáticamente: {nuevo}"
                    )
                actualizadas.append(p.id)

        return Response({"actualizadas": len(actualizadas)}, status=200)


class HistorialView(APIView):
    """GET /api/actividad/<id>/historial/"""
    def get(self, request, plantacion_id):
        acts = Actividad.objects.filter(
            plantacion_id=plantacion_id
        ).order_by("-fecha")
        return Response(ActividadSerializer(acts, many=True).data)
    

class ActividadesPorHuerto(APIView):
    def get(self, request, huerto_id):
        actividades = Actividad.objects.filter(
            plantacion__huerto_id=huerto_id
        ).select_related("plantacion")

        serializer = ActividadSerializer(actividades, many=True)
        return Response(serializer.data)
    


