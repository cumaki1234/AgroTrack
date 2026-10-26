from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import CultivoTipo
from .serializers import CultivoTipoSerializer

class CultivoTipoAPIView(APIView):

    def get(self, request):
        cultivos = CultivoTipo.objects.all()
        serializer = CultivoTipoSerializer(cultivos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CultivoTipoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            cultivo = CultivoTipo.objects.get(pk=pk)
            cultivo.delete()
            return Response({"mensaje": "Cultivo eliminado"}, status=200)
        except CultivoTipo.DoesNotExist:
            return Response({"error": "No existe el cultivo"}, status=404)

