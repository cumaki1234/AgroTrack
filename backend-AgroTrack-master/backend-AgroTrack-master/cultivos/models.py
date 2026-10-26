from django.db import models

class CultivoTipo(models.Model):
    nombre = models.CharField(max_length=100)
    duracion_dias = models.IntegerField()
    requerimiento_agua_litros = models.DecimalField(max_digits=10, decimal_places=2)
    distancia_siembra_cm = models.IntegerField(null=True, blank=True)
    descripcion = models.TextField(null=True, blank=True)

    imagen = models.ImageField(upload_to="cultivos/", null=True, blank=True)

    def __str__(self):
        return self.nombre

