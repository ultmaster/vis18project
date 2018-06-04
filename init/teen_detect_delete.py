import traceback
import sys
from collections import Counter
from datetime import datetime, date, timedelta

from main.models import Record, PossibleTeens

def compare_dict(a, b, *ignore_fields):
    x, y = a.copy(), b.copy()
    for field in ignore_fields:
        x.pop(field, None)
        y.pop(field, None)
    return x == y


def run(*args):
    # This program will delete duplicate records
    try:
        repo = PossibleTeens.objects.values("site_id", "level", "person_id", "age", "customer_name", "online_time",
                                            "offline_time", "id")
        to_delete_id = []
        for i in range(len(repo)):
            ok = True
            for j in range(i):
                if compare_dict(repo[i], repo[j], "id"):
                    # print(i, j, repo[i], repo[j])
                    ok = False
                    break
            if not ok:
                to_delete_id.append(repo[i]["id"])
        print(to_delete_id)
        PossibleTeens.objects.filter(id__in=to_delete_id).delete()
    except:
        traceback.print_exc(file=sys.stderr)
