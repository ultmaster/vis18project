from collections import Counter

from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.db.models import Sum, FloatField
from django.db.models.functions import Cast
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_page

from main.models import RecordAggregation1, Site, SuspectRelation, SuspectRelation2, PossibleTeens, RecordAggregation2, \
    RecordAggregation3, Record


def get_sites():
    data = {}
    for site in Site.objects.all():
        data[site.site_id] = {
            "site_id": site.site_id,
            "title": site.title,
            "lng": site.lng,
            "lat": site.lat
        }
    return data


def get_sites_view(request):
    return JsonResponse({"data": list(get_sites().values())})


def home_view(request):
    return render(request, "index.html")


@cache_page(60 * 60)
def aggregate1_view(request):
    if request.GET.get("time") == "g":
        data = RecordAggregation1.objects.all().values("weekday", "hour").annotate(Sum("count"))
        return JsonResponse({"data": list(data)})
    elif request.GET.get("age") == "g":
        data = RecordAggregation1.objects.all().values("age_label").annotate(Sum("count"))
        print(data)
        return JsonResponse({"data": list(map(lambda x: [x["age_label"], x["count__sum"]], data))})
    else:
        data = RecordAggregation1.objects.all().values("site_id").annotate(Sum("count"))
        ret = {}
        for item in data:
            ret[item["site_id"]] = item["count__sum"]
        return JsonResponse(ret)


def aggregate2_view(request):
    q = Q()
    if "site" in request.GET:
        q &= Q(site_id=request.GET["site"])
    if request.GET.get("time") == "g":
        data = RecordAggregation2.objects.filter(q).values("weekday", "hour").annotate(count_sum=Sum("count"), length=Sum("total_length") / Cast(Sum("count"), FloatField()))
        return JsonResponse({"data": list(data)})
    elif request.GET.get("age") == "g":
        # q = Q()
        # if "weekday" in request.GET:
        #     w1, w2 = map(int, request.GET["weekday"].split(","))
        #     q &= Q(weekday__gte=w1, weekday__lte=w2)
        # if "hour" in request.GET:
        #     h1, h2 = map(int, request.GET["hour"].split(","))
        #     q &= Q(hour__gte=h1, hour__lte=h2)
        data = RecordAggregation3.objects.filter(q).values("age", "length").annotate(count=Sum("count"))
        ret = {}
        for d in data:
            ret.setdefault(d["age"], {})
            ret[d["age"]][d["length"]] = d["count"]
        r2 = []
        age_min, age_max = min(ret.keys()), min(max(ret.keys()), 80)
        for key in range(age_min, age_max + 1):
            val = ret.get(key, {})
            for k in [1, 2, 3, 5, 8, 13]:
                val.setdefault(k, 0)
            r2.append({"age": key, "detail": val})
        return JsonResponse({"data": r2})
    else:
        data = RecordAggregation2.objects.all().values("site_id").annotate(Sum("count"))
        ret = {}
        for item in data:
            ret[item["site_id"]] = item["count__sum"]
        return JsonResponse(ret)


def get_relation_view(request):
    ret = {}
    query_birthplace = {}
    query_result = Counter()
    if "site" in request.GET:
        raw_query = SuspectRelation2.objects.filter(site_id=request.GET["site"])
    else:
        raw_query = SuspectRelation2.objects.filter(relevance__gt=3)
    for q in raw_query:
        query_result[(q.person1, q.person2)] += q.relevance
        query_birthplace[(q.person1, q.person2)] = q.birthplace
    # if len(query_result) > MAX_REL_QUERY_LENGTH:
    #     ret["warning"] = "Too many records returned"
    person_set = set()
    lst = ret["link"] = []
    for q in query_result:
        # if deg[q.person1] == 1 or deg[q.person2] == 1:
        #     continue
        person_set.add(q[0])
        person_set.add(q[1])
        lst.append({"source": q[0], "target": q[1], "relevance": query_result[q], "birthplace": query_birthplace[q]})
    ret["node"] = []
    for person in person_set:
        ret["node"].append({"id": person})
    return JsonResponse(ret)


def get_teens_view(request):
    ret = {}
    for pt in PossibleTeens.objects.all():
        if pt.site_id not in ret:
            ret[pt.site_id] = {"level1": 0, "level2": 0, "detail": []}
        ret[pt.site_id]["detail"].append({"person_id": pt.person_id,
                                          "age": pt.age,
                                          "customer_name": pt.customer_name,
                                          "level": pt.level,
                                          "online_time": "%s" % pt.online_time,
                                          "offline_time": "%s" % pt.offline_time})
        if pt.level == 1:
            ret[pt.site_id]["level1"] += 1
        else:
            ret[pt.site_id]["level2"] += 1
    return JsonResponse(ret)


def get_timeline(request):
    ids = list(filter(lambda x: x, request.GET.get('id', '').split(',')))
    recs = Record.objects.filter(person_id__in=ids).only('id', 'site_id', 'online_time', 'offline_time')\
        .order_by("person_id", "online_time")
    ret = {id: [] for id in ids}
    for r in recs:
        ret[r.person_id].append({"person_id": r.person_id,
                                 "site_id": r.site_id,
                                 "online_time": str(r.online_time),
                                 "offline_time": str(r.offline_time)})
    r2 = []
    for r in ret:
        r2.append({"key": r, "values": ret[r]})
    return JsonResponse({"data": r2})
