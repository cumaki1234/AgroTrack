from django.urls import path
from .views import RegistroUsuarioView, LoginView

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view()),
    path('login/', LoginView.as_view()),
]
