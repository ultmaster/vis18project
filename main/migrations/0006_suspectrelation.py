# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-05-30 11:46
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0005_auto_20180530_0021'),
    ]

    operations = [
        migrations.CreateModel(
            name='SuspectRelation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('person1', models.CharField(db_index=True, max_length=64)),
                ('person2', models.CharField(db_index=True, max_length=64)),
                ('relevance', models.FloatField()),
                ('birthplace', models.PositiveIntegerField(db_index=True, default=0)),
            ],
        ),
    ]
