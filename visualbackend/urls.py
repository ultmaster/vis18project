import os

from django.conf.urls import url
from django.contrib import admin
from django.views.static import serve

from main.views import home_view, aggregate1_view, aggregate2_view, get_sites_view, get_relation_view, get_teens_view

from django.conf import settings

STATIC_DIR = os.path.join(settings.BASE_DIR, 'static')

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', home_view),
    url(r'^site/$', get_sites_view),
    url(r'^aggregate1/$', aggregate1_view),
    url(r'^aggregate2/$', aggregate2_view),
    url(r'^relation/$', get_relation_view),
    url(r'^teen/$', get_teens_view),
    url(r'^static/(?P<path>.*)$', serve, name='static', kwargs={'document_root': STATIC_DIR}),
]
