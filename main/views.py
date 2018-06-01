from collections import Counter

from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_page

from main.models import RecordAggregation1, Site, SuspectRelation, SuspectRelation2


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


# MAX_REL_QUERY_LENGTH = 10000


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
