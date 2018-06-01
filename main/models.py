from django.db import models

GLOBAL_MAX_LENGTH = 64


class Site(models.Model):
    site_id = models.CharField(max_length=GLOBAL_MAX_LENGTH, primary_key=True)
    title = models.CharField(max_length=GLOBAL_MAX_LENGTH)
    lng = models.FloatField()
    lat = models.FloatField()


class Record(models.Model):
    person_id = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=GLOBAL_MAX_LENGTH)
    is_female = models.BooleanField()
    area_id = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    birthday = models.DateField()
    online_time = models.DateTimeField()
    offline_time = models.DateTimeField()


class RecordAggregation1(models.Model):
    site = models.ForeignKey(Site)
    age_label = models.PositiveIntegerField(choices=[(0, '-18'), (1, '19-25'),
                                                     (2, '26-35'), (3, '36-45'),
                                                     (4, '46-60'), (5, '61-')],
                                            db_index=True)
    weekday = models.PositiveIntegerField(db_index=True)
    hour = models.PositiveIntegerField(db_index=True)
    count = models.PositiveIntegerField()


class PossibleTeens(models.Model):
    id = models.IntegerField(primary_key=True)
    site = models.ForeignKey(Site)
    person_id = models.CharField(max_length=GLOBAL_MAX_LENGTH)
    age = models.PositiveIntegerField()
    customer_name = models.CharField(max_length=GLOBAL_MAX_LENGTH)
    level = models.IntegerField(choices=[(1, "High"), (2, "Suspect")], db_index=True)
    online_time = models.DateTimeField()
    offline_time = models.DateTimeField()


class SuspectRelation(models.Model):
    site = models.ForeignKey(Site)
    person1 = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    person2 = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    relevance = models.FloatField()
    birthplace = models.PositiveIntegerField(default=0, db_index=True)


class SuspectRelation2(models.Model):
    site = models.ForeignKey(Site)
    person1 = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    person2 = models.CharField(max_length=GLOBAL_MAX_LENGTH, db_index=True)
    relevance = models.FloatField()
    birthplace = models.PositiveIntegerField(default=0, db_index=True)
