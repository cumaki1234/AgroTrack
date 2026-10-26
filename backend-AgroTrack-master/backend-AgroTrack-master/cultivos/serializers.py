from rest_framework import serializers
from .models import CultivoTipo

class CultivoTipoSerializer(serializers.ModelSerializer):
    imagen = serializers.ImageField(use_url=True)

    class Meta:
        model = CultivoTipo
        fields = "__all__"

