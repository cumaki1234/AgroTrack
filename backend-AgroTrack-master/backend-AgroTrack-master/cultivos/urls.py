from django.urls import path
from .views import CultivoTipoAPIView


urlpatterns = [
    path('', CultivoTipoAPIView.as_view()),
    path("<int:pk>/", CultivoTipoAPIView.as_view()),
]

