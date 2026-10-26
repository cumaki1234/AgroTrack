from rest_framework import serializers
from .models import Usuario

class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'password']

    def create(self, validated_data):
        return Usuario.objects.create_user(
            email=validated_data['email'],
            nombre=validated_data['nombre'],
            password=validated_data['password']
        )
