from rest_framework import serializers
from .models import Huerto


class HuertoSerializer(serializers.ModelSerializer):

    class Meta:
        model  = Huerto
        fields = [
            "id", "nombre", "layout",
            # Campos legacy — siguen presentes para compatibilidad
            "ubicacion", "tamano_m2", "descripcion",
            "largo", "ancho", "fecha_creacion",
        ]
        read_only_fields = ["tamano_m2", "fecha_creacion"]

    def create(self, validated_data):
        """
        Creación simplificada: solo requiere nombre.
        layout llega como JSON desde el editor visual del frontend.
        largo/ancho/tamano_m2 son opcionales y solo se calculan si vienen.
        """
        largo = validated_data.get("largo")
        ancho = validated_data.get("ancho")

        if largo and ancho:
            validated_data["tamano_m2"] = largo * ancho

        return Huerto.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """
        Permite actualizar el layout (y cualquier otro campo) parcialmente.
        """
        largo = validated_data.get("largo", instance.largo)
        ancho = validated_data.get("ancho", instance.ancho)

        if largo and ancho:
            validated_data["tamano_m2"] = largo * ancho

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance