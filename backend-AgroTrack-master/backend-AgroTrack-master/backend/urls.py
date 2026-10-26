from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('api/usuarios/', include('usuarios.urls')),
    path('api/cultivos/', include('cultivos.urls')),
    path('api/huertos/', include('huertos.urls')),
    path('api/plantacion/', include('plantacion.urls')),
    path('api/actividad/', include('actividad.urls')),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)