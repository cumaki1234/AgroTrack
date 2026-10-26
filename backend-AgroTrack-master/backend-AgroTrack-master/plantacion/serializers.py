# plantacion/serializers.py
from rest_framework import serializers
from .models import Plantacion


class ActividadInlineSerializer(serializers.Serializer):
    id             = serializers.IntegerField()
    accion = serializers.CharField()
    fecha          = serializers.DateTimeField()
    descripcion    = serializers.CharField(allow_null=True)


class PlantacionSerializer(serializers.ModelSerializer):
    cultivo_imagen = serializers.SerializerMethodField()
    cultivo_nombre = serializers.CharField(
        source="cultivo_tipo.nombre", read_only=True
    )
    actividades = serializers.SerializerMethodField()

    class Meta:
        model  = Plantacion
        fields = [
            "id", "huerto", "cultivo_tipo", "cultivo_nombre", "cultivo_imagen",
            "fecha_siembra", "estado", "fila", "columna",
            "ultimo_riego", "proximo_riego", "notas",
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
        # Import diferido para evitar circular import
        from django.apps import apps
        Actividad = apps.get_model("actividad", "Actividad")
        acts = Actividad.objects.filter(plantacion=obj).order_by("-fecha")[:50]
        return ActividadInlineSerializer(acts, many=True).data