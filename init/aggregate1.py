import traceback
from collections import Counter
from datetime import datetime, date, timedelta

from main.models import Record, RecordAggregation1


def get_age(x: Record):
    return (x.online_time - datetime.combine(x.birthday, datetime.min.time())).days // 365


def get_age_label(age):
    if age <= 18:
        return 0
    if age <= 25:
        return 1
    if age <= 35:
        return 2
    if age <= 45:
        return 3
    if age <= 60:
        return 4
    return 5


def truncate_minute_and_second(online_time, offline_time):
    t0 = datetime(online_time.year, online_time.month, online_time.day, online_time.hour)
    while t0 <= offline_time:
        yield t0
        t0 += timedelta(hours=1)


def run(*args):
    try:
        counter = Counter()
        for rec in Record.objects.all():
            for time in truncate_minute_and_second(rec.online_time, rec.offline_time):
                counter[(rec.site_id, get_age_label(get_age(rec)),
                         time.weekday(), time.hour)] += 1
        for key in counter:
            site_id, age_label, weekday, hour = key
            RecordAggregation1.objects.create(site_id=site_id,
                                              age_label=age_label,
                                              weekday=weekday,
                                              hour=hour,
                                              count=counter[key])
    except:
        traceback.print_exc()
