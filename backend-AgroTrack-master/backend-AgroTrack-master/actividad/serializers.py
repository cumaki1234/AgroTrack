
from rest_framework import serializers
from .models import Actividad
from plantacion.models import Plantacion

class ActividadSerializer(serializers.ModelSerializer):
    cultivo_nombre = serializers.CharField(
        source="plantacion.cultivo_tipo.nombre",
        read_only=True
    )
    fila = serializers.IntegerField(
        source="plantacion.fila",
        read_only=True
    )
    columna = serializers.IntegerField(
        source="plantacion.columna",
        read_only=True
    )

    class Meta:
        model = Actividad
        fields = [
            "id",
            "accion",
            "descripcion",
            "fecha",
            "cultivo_nombre",
            "fila",
            "columna",
        ]


class PlantacionSerializer(serializers.ModelSerializer):
    cultivo_imagen  = serializers.SerializerMethodField()
    cultivo_nombre  = serializers.CharField(source="cultivo_tipo.nombre", read_only=True)
    cultivo_duracion= serializers.IntegerField(source="cultivo_tipo.duracion_dias", read_only=True)
    actividades     = serializers.SerializerMethodField()

    class Meta:
        model  = Plantacion
        fields = [
            "id", "huerto", "cultivo_tipo", "cultivo_nombre",
            "cultivo_imagen", "cultivo_duracion",
            "fecha_siembra", "estado", "fila", "columna",
            "ultimo_riego", "proximo_riego",
            "veces_regada_hoy", "notas",
            "actividades",
        ]

    def get_cultivo_imagen(self, obj):
        if not obj.cultivo_tipo.imagen:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cultivo_tipo.imagen.url)
        return obj.cultivo_tipo.imagen.url

    def get_actividades(self, obj):
        from django.apps import apps
        Actividad = apps.get_model("actividad", "Actividad")
        acts = Actividad.objects.filter(plantacion=obj).order_by("-fecha")[:50]
        return ActividadSerializer(acts, many=True).data
