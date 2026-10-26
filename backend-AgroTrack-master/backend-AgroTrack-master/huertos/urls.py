from django.urls import path
from .views import HuertoListCreateView, HuertoDetailView, HuertosView


urlpatterns = [
    path('', HuertosView.as_view(), name='listar-huertos'),
    path('crear/', HuertoListCreateView.as_view(), name='crear-huertos'),
    path('<int:id>/', HuertoDetailView.as_view(), name='Eliminar-huertos'),
]
