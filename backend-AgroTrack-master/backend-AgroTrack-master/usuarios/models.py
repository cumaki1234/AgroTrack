from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UsuarioManager(BaseUserManager):
    def create_user(self, email, nombre, password=None, **extra):
        if not email:
            raise ValueError("El usuario debe tener un email")

        email = self.normalize_email(email)
        usuario = self.model(email=email, nombre=nombre, **extra)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def create_superuser(self, email, nombre, password):
        usuario = self.create_user(email, nombre, password)
        usuario.is_staff = True
        usuario.is_superuser = True
        usuario.save()
        return usuario


class Usuario(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=50, default='usuario')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre']

    def __str__(self):
        return self.email
