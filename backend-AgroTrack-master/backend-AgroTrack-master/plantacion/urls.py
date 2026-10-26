# urls.py
from django.urls import path
from .views import CrearPlantacionAPIView, EliminarPlantacionAPIView, PlantacionesPorHuertoAPIView, PlantacionesListAPIView


urlpatterns = [
    path("plantaciones/", CrearPlantacionAPIView.as_view()),
    path("plantaciones/listar/", PlantacionesListAPIView.as_view()),
    path("plantaciones/eliminar/", EliminarPlantacionAPIView.as_view()),
    path("plantaciones/huerto/<int:huerto_id>/", PlantacionesPorHuertoAPIView.as_view()),

]
