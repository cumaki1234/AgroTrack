from rest_framework import generics
from .models import Usuario
from .serializers import UsuarioRegistroSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class RegistroUsuarioView(APIView):
    def post(self, request):
        serializer = UsuarioRegistroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"mensaje": "Usuario creado exitosamente"}, status=201)
        return Response(serializer.errors, status=400)


class LoginView(TokenObtainPairView):
    # usa directamente el serializer por defecto
    pass
