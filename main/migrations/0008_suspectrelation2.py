# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-05-31 15:01
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_suspectrelation_site'),
    ]

    operations = [
        migrations.CreateModel(
            name='SuspectRelation2',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('person1', models.CharField(db_index=True, max_length=64)),
                ('person2', models.CharField(db_index=True, max_length=64)),
                ('relevance', models.FloatField()),
                ('birthplace', models.PositiveIntegerField(db_index=True, default=0)),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='main.Site')),
            ],
        ),
    ]
