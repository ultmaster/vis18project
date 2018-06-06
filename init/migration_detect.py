import traceback
import sys
from collections import Counter
from datetime import datetime, date, timedelta

from django.db import transaction
from django.db.models import Q

from init.aggregate1 import truncate_minute_and_second, get_age
from main.models import Record, PossibleTeens, RecordAggregation2, RecordAggregation3


def is_migrator(area_id):
    return not (area_id.startswith("51") or area_id.startswith("50"))


def get_length_label(hours):
    if hours < 1: return 1
    if hours < 2: return 2
    if hours < 3: return 3
    if hours < 5: return 5
    if hours < 8: return 8
    return 13


def run(*args):
    # This program will delete duplicate records
    try:
        ctime = Counter()
        clength = Counter()
        cage = Counter()
        for idx, rec in enumerate(Record.objects.all()):
            total_hours = (rec.offline_time - rec.online_time).total_seconds() / 3600
            if total_hours > 24:
                continue
            mig = is_migrator(rec.area_id)
            for time in truncate_minute_and_second(rec.online_time, rec.offline_time):
                ctime[(rec.site_id, time.weekday(), time.hour, mig)] += 1
                clength[(rec.site_id, time.weekday(), time.hour, mig)] += total_hours
            cage[(rec.site_id, get_age(rec), get_length_label(total_hours), mig)] += 1
            # print(len(ctime), len(clength), len(cage))
            if idx % 10000 == 0:
                print('. %d' % idx)
        with transaction.atomic():
            if not RecordAggregation2.objects.exists():
                for key in ctime:
                    site_id, weekday, hour, mig = key
                    RecordAggregation2.objects.create(site_id=site_id,
                                                      weekday=weekday,
                                                      hour=hour,
                                                      migration=mig,
                                                      count=ctime[key],
                                                      total_length=clength[key])
            if not RecordAggregation3.objects.exists():
                for key in cage:
                    site_id, age, length, mig = key
                    if age <= 0:
                        continue
                    RecordAggregation3.objects.create(site_id=site_id,
                                                      age=age,
                                                      length=length,
                                                      migration=mig,
                                                      count=cage[key])
    except:
        traceback.print_exc(file=sys.stderr)
