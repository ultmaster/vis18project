import traceback
from collections import Counter
from datetime import datetime, date, timedelta

from main.models import Record, PossibleTeens


def get_age(x: Record):
    return (x.online_time - datetime.combine(x.birthday, datetime.min.time())).days // 365


def handle_group(grp):
    try:
        for p in grp:
            if p.level:
                raise Exception("0")
        if len(set(map(lambda x: x.customer_name, grp))) > 1:
            raise Exception("1")
        for i in range(len(grp)):
            for j in range(i + 1, len(grp)):
                if max(grp[i].online_time, grp[j].online_time) < min(grp[i].offline_time, grp[j].offline_time):
                    raise Exception("2")
    except Exception as e:
        print("found", len(grp))
        for r in grp:
            if not r.level:
                r.level = 2
        PossibleTeens.objects.bulk_create(grp)


def run(*args):
    try:
        grp = []
        for rec in Record.objects.order_by("person_id").all():
            n = PossibleTeens(id=rec.id, site_id=rec.site_id, level=0,
                              person_id=rec.person_id, age=get_age(rec),
                              customer_name=rec.customer_name,
                              online_time=rec.online_time,
                              offline_time=rec.offline_time)
            if not grp or grp[-1].person_id == rec.person_id:
                grp.append(n)
            else:
                handle_group(grp)
                grp = [n]
            if n.age < 18:
                n.level = 1

        handle_group(grp)
    except:
        traceback.print_exc()
