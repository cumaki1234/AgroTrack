from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated


from .models import Huerto
from .serializers import HuertoSerializer

class HuertoListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HuertoSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(usuario=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    
class HuertoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, id, user):
        return Huerto.objects.filter(id=id, usuario=user).first()

    def get(self, request, id):
        huerto = self.get_object(id, request.user)
        if not huerto:
            return Response({"error": "Huerto no encontrado"}, status=404)

        serializer = HuertoSerializer(huerto)
        return Response(serializer.data)

    def put(self, request, id):
        huerto = self.get_object(id, request.user)
        if not huerto:
            return Response({"error": "Huerto no encontrado"}, status=404)

        serializer = HuertoSerializer(huerto, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, id):
        huerto = self.get_object(id, request.user)
        if not huerto:
            return Response({"error": "Huerto no encontrado"}, status=404)

        huerto.delete()
        return Response({"message": "Huerto eliminado"}, status=204)


class HuertosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        huertos = Huerto.objects.filter(usuario=request.user)
        serializer = HuertoSerializer(huertos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = HuertoSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(usuario=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)



