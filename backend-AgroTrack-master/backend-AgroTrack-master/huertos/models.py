from django.db import models
from usuarios.models import Usuario


class Huerto(models.Model):
    usuario        = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    nombre         = models.CharField(max_length=150)

    # Campos legacy — ahora todos opcionales para no romper la BD existente
    ubicacion      = models.CharField(max_length=255, blank=True, null=True)
    largo          = models.FloatField(blank=True, null=True)
    ancho          = models.FloatField(blank=True, null=True)
    tamano_m2      = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    descripcion    = models.TextField(blank=True, null=True)

    # Nuevo campo: almacena el layout del editor visual como JSON
    # Estructura: { "celdas": [...], "filas": N, "columnas": N }
    layout         = models.JSONField(blank=True, null=True, default=dict)

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre