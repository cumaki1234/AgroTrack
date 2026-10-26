from django.db import models
from huertos.models import Huerto
from cultivos.models import CultivoTipo

class Actividad(models.Model):
    plantacion = models.ForeignKey(
        "plantacion.Plantacion",  
        on_delete=models.CASCADE,
        related_name="registros"
    )
    accion = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.accion} - {self.fecha}"