import traceback
from collections import Counter
from collections import defaultdict
from datetime import datetime, date, timedelta

from django.db import transaction

from main.models import Record, RecordAggregation1, Site, SuspectRelation, SuspectRelation2


def run(*args):
    try:
        tc = 0
        short_period = timedelta(minutes=30)
        for idx, site in enumerate(Site.objects.all()):
            pair_time_counter = Counter()
            birthplace_dict = defaultdict(int)
            site_records = site.record_set.only("person_id", "online_time", "offline_time", "area_id").\
                    order_by("online_time").all()
            for i, record in enumerate(site_records):
                birthplace_dict[record.person_id] = int(record.area_id[:2])
                if record.online_time >= record.offline_time:
                    continue
                t = i - 1
                while True:
                    if t < 0: break
                    rpast = site_records[t]
                    if record.online_time - rpast.online_time > short_period:
                        break
                    if abs((rpast.offline_time - record.offline_time).total_seconds()) < short_period.total_seconds() \
                            and rpast.person_id != record.person_id:
                        p1, p2 = rpast.person_id, record.person_id
                        if p1 > p2:
                            p1, p2 = p2, p1
                        pair_time_counter[(p1, p2)] += 1
                    t -= 1

            final_list = []
            for key in pair_time_counter:
                if pair_time_counter[key] >= 2:
                    final_list.append((*key, pair_time_counter[key]))

            with transaction.atomic():
                for k1, k2, t in final_list:
                    birthplace = 0
                    if birthplace_dict[k1] == birthplace_dict[k2]:
                        birthplace = birthplace_dict[k1]
                    SuspectRelation2.objects.create(site=site, person1=k1, person2=k2, relevance=t, birthplace=birthplace)

            tc += len(final_list)
            print(idx, site.site_id, len(pair_time_counter), len(final_list), tc)
    except:
        traceback.print_exc()
