import os
import traceback
from datetime import datetime, date

import pandas as pd

from main.models import Site, Record


def get_datetime(s):
    s = str(s)
    return datetime(int(s[:4]), int(s[4:6]), int(s[6:8]), int(s[8:10]), int(s[10:12]), int(s[12:14]))


def get_date(s):
    s = str(s)
    return date(year=int(s[:4]), month=int(s[4:6]), day=int(s[6:8]))


def run(*args):
    try:
        df = pd.read_csv("data/barinfo.csv")
        good_site = set()
        for index, row in df.iterrows():
            if Site.objects.filter(site_id=row["SITEID"]).exists():
                good_site.add(str(row["SITEID"]))

        for data_file in os.listdir("data"):
            if data_file.startswith("tmp"):
                df = pd.read_csv("data/%s" % data_file)
                data = []
                for index, row in df.iterrows():
                    try:
                        r = Record()
                        r.person_id = row["PERSONID"]
                        r.site_id = str(row["SITEID"])
                        r.is_female = row["XB"] == "女"
                        r.customer_name = row["CUSTOMERNAME"]
                        r.online_time = get_datetime(row["ONLINETIME"])
                        r.offline_time = get_datetime(row["OFFLINETIME"])
                        r.area_id = row["AREAID"]
                        r.birthday = get_date(row["BIRTHDAY"])
                        if r.person_id is None or r.site_id is None or r.is_female is None or r.customer_name is None or \
                            r.online_time is None or r.offline_time is None or r.area_id is None or r.birthday is None:
                            continue
                        # print("MID")
                        if r.site_id not in good_site:
                            # print(r.site_id)
                            continue
                        data.append(r)
                        if len(data) >= 1000:
                            Record.objects.bulk_create(data)
                            data = []
                    except:
                        pass
                Record.objects.bulk_create(data)

    except:
        traceback.print_exc()
