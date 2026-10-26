# plantacion/models.py
from django.db import models
from django.utils import timezone
from huertos.models import Huerto
from cultivos.models import CultivoTipo

class Plantacion(models.Model):
    ESTADOS = [
        ("sembrado",       "Sembrado"),
        ("germinacion",    "Germinación"),
        ("crecimiento",    "Crecimiento"),
        ("maduracion",     "Maduración"),
        ("listo",          "Listo para cosecha"),
        ("cosechado",      "Cosechado"),
        ("muerta_sequia",  "Muerta por sequía"),    # ← NUEVO
        ("muerta_ahogo",   "Muerta por ahogo"),     # ← NUEVO
        ("pasada",         "Pasada"),               # ← NUEVO
    ]

    huerto       = models.ForeignKey(Huerto, on_delete=models.CASCADE)
    cultivo_tipo = models.ForeignKey(CultivoTipo, on_delete=models.CASCADE)

  

    fecha_siembra = models.DateField(default=timezone.now)
    estado        = models.CharField(max_length=50, choices=ESTADOS, default="sembrado")

    fila    = models.IntegerField()
    columna = models.IntegerField()

    ultimo_riego  = models.DateField(null=True, blank=True)
    proximo_riego = models.DateField(null=True, blank=True)

    # ── NUEVOS campos para lógica de salud ───────────────
    veces_regada_hoy = models.IntegerField(default=0)   # reset diario
    fecha_ultimo_reset = models.DateField(null=True, blank=True)

    notas = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.cultivo_tipo.nombre} ({self.fila},{self.columna})"

    def esta_muerta(self):
        return self.estado in ("muerta_sequia", "muerta_ahogo")

    def reset_riego_si_nuevo_dia(self, hoy):
        if self.fecha_ultimo_reset != hoy:
            self.veces_regada_hoy = 0
            self.fecha_ultimo_reset = hoy