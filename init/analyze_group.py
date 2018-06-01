import traceback
from collections import Counter
from collections import defaultdict
from datetime import datetime, date, timedelta

from django.db import transaction

from main.models import Record, RecordAggregation1, Site, SuspectRelation


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
        tc = 0
        for idx, site in enumerate(Site.objects.all()):
            total_time_counter = Counter()
            pair_time_counter = Counter()
            birthplace_dict = defaultdict(int)
            appearing = dict()
            sweepline = []
            for record in site.record_set.only("person_id", "online_time", "offline_time", "area_id").all():
                birthplace_dict[record.person_id] = int(record.area_id[:2])
                if record.online_time >= record.offline_time:
                    continue
                sweepline.append((record.online_time, record.person_id, True))
                sweepline.append((record.offline_time, record.person_id, False))
                total_time_counter[record.person_id] += (record.offline_time - record.online_time).total_seconds()
            sweepline.sort()
            for timestamp, person, status in sweepline:
                if status:
                    appearing[person] = timestamp
                else:
                    t1 = appearing.pop(person, None)
                    if t1 is None:
                        continue
                    for p2, t2 in appearing.items():
                        pair_time_counter[(min(p2, person), max(p2, person))] += \
                            (timestamp - max(t2, t1)).total_seconds()
            counter = 0
            with transaction.atomic():
                for (k1, k2), t in pair_time_counter.items():
                    assert t <= total_time_counter[k1]
                    assert t <= total_time_counter[k2]
                    if t > total_time_counter[k1] * .8 and t > total_time_counter[k2] * .8:
                        relevance = (t / total_time_counter[k1] + t / total_time_counter[k2]) / 2
                        birthplace = 0
                        if birthplace_dict[k1] == birthplace_dict[k2]:
                            birthplace = birthplace_dict[k1]
                        counter += 1
                        SuspectRelation.objects.create(site=site, person1=k1, person2=k2, relevance=relevance, birthplace=birthplace)
            tc += counter
            print(idx, site.site_id, len(pair_time_counter), len(total_time_counter), counter, tc)
    except:
        traceback.print_exc()
