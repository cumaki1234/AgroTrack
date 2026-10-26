from django.urls import path
from .views import RegarView, CosecharView, LimpiarCeldaView, SincronizarEstadosView, HistorialView, ActividadesPorHuerto

urlpatterns = [
    path("<int:plantacion_id>/regar/",    RegarView.as_view()),
    path("<int:plantacion_id>/cosechar/", CosecharView.as_view()),
    path("<int:plantacion_id>/limpiar/",  LimpiarCeldaView.as_view()),
    path("<int:plantacion_id>/historial/",HistorialView.as_view()),
    path("sincronizar/<int:huerto_id>/",  SincronizarEstadosView.as_view()),
    path("actividad/huerto/<int:huerto_id>/", ActividadesPorHuerto.as_view()),
    path("huerto/<int:huerto_id>/", ActividadesPorHuerto.as_view()),
]