from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Plantacion
from .serializers import PlantacionSerializer
from rest_framework.permissions import IsAuthenticated


class EliminarPlantacionAPIView(APIView):
    def post(self, request):
        huerto_id = request.data.get("huerto_id")
        fila = request.data.get("fila")
        columna = request.data.get("columna")

        if not (huerto_id and fila is not None and columna is not None):
            return Response(
                {"error": "Datos incompletos"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plantacion = Plantacion.objects.get(
                huerto_id=huerto_id,
                fila=fila,
                columna=columna
            )
            plantacion.delete()
            return Response({"mensaje": "Plantación eliminada"}, status=200)

        except Plantacion.DoesNotExist:
            return Response({"error": "No existe plantación en esa celda"}, status=404)
        
class CrearPlantacionAPIView(APIView):
    def post(self, request):
        serializer = PlantacionSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PlantacionesPorHuertoAPIView(APIView):
    def get(self, request, huerto_id):
        plantaciones = Plantacion.objects.filter(huerto_id=huerto_id)
        serializer = PlantacionSerializer(plantaciones, many=True)
        return Response(serializer.data)
    

class PlantacionesListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plantaciones = Plantacion.objects.all()
        serializer = PlantacionSerializer(
            plantaciones,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)