function adjustSize() {
  mapSelection.height(mapSelection.width() * .6);
  add1Selection.height(add1Selection.width() * .3);
  stack1Selection.height(add1Selection.height());
  link1Selection.height(link1Selection.width() * .5);
}

function initMap() {
  map1 = Loca.create('map', {
    mapStyle: 'amap://styles/whitesmoke',
    zoom: 9,
    center: [d3.mean(siteData, function (obj) {
      return obj.lng
    }),
      d3.mean(siteData, function (obj) {
        return obj.lat
      })]
  });
  mapLayer = Loca.visualLayer({
    container: map1,
    fitView: false,
    type: 'point',
    shape: 'circle',
    eventSupport: true
  });
}

function outputTeenDetailsTable(data) {
  data.sort(function (a, b) {
    return a.person_id < b.person_id;
  });
  tableBodySelection.empty();
  $.each(data, function (d, r) {
    tableBodySelection.append(
      "<tr class='" + (r.age < 18 ? "warning" : "") + "'>"
      + "<td>" + r.person_id.substr(0, 6) + "</td>"
      + "<td>" + r.customer_name + "</td>"
      + "<td>" + r.online_time + "</td>"
      + "<td>" + r.offline_time + "</td>"
      + "<td>" + r.age + "</td>"
      + "</tr>")
  });
}

function paintMap() {
  d3.json("/aggregate1/")
    .then(function (data) {

      d3.json("/teen/").then(function (addOn1) {
        function getLevel(siteId) {
          if (!addOn1.hasOwnProperty(siteId))
            return 0;
          return addOn1[siteId].level1 > 0 ? 1 : 2;
        }

        if (!siteTeenData)
          siteTeenData = addOn1;
        var all_details = [];
        for (var site in addOn1)
          all_details = all_details.concat(addOn1[site].detail);
        outputTeenDetailsTable(all_details);

        mapLayer.setData(siteData, {
          lnglat: function (obj) {
            return [obj.value.lng, obj.value.lat];
          }
        });
        var max_r_data = d3.max(Object.values(data));
        var infoWin;

        mapLayer.on('click', function (ev) {
          if (!infoWin) {
            infoWin = new AMap.InfoWindow();
          }
          var type = ev.type;
          var rawData = ev.rawData;
          var originalEvent = ev.originalEvent;
          var lnglat = ev.lnglat;
          // console.log('事件类型 ' + type);
          // console.log('原始数据 ' + JSON.stringify(rawData));
          // console.log('鼠标事件 ' + originalEvent);

          infoWin.setContent(rawData.title + '<br/>' + rawData.lng + ", " + rawData.lat);
          infoWin.open(map1.getMap(), new AMap.LngLat(rawData.lng, rawData.lat));
          onClickSite(rawData.site_id);
        });

        var fillColorSet = ["#A0CCD6", "#D46A6A", "#D49F6A"];

        mapLayer.setOptions({
          style: {
            radius: function (obj) {
              return data[obj.value.site_id] / max_r_data * 30;
            },
            fill: function (obj) {
              return fillColorSet[getLevel(obj.value.site_id)];
            },
            opacity: 0.6,
            lineWidth: 1,
            stroke: '#eee'
          }
        });

        mapLayer.render();
      });
    });
}

function paintPunchCard() {
  d3.json("/aggregate1/?time=g")
    .then(function (data) {
      var punchcard_data = data["data"];
      var w = punchcard1Section.width(),
        h = punchcard1Section.height(),
        pad = 20,
        left_pad = 100;

      var svg = d3.select("#punchcard1")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

      var x = d3.scaleLinear().domain([0, 23]).range([left_pad, w - pad]),
        y = d3.scaleLinear().domain([0, 6]).range([pad, h - pad * 2]);

      var xAxis = d3.axisBottom(x)
          .ticks(24)
          .tickFormat(function (d, i) {
            var m = (d > 12) ? "p" : "a";
            return (d % 12 == 0) ? 12 + m : d % 12 + m;
          }),
        yAxis = d3.axisLeft(y)
          .ticks(7)
          .tickFormat(function (d, i) {
            return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d];
          });

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (h - pad) + ")")
        .call(xAxis);

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (left_pad - pad) + ", 0)")
        .call(yAxis);

      svg.append("text")
        .attr("class", "loading")
        .text("Loading ...")
        .attr("x", function () {
          return w / 2;
        })
        .attr("y", function () {
          return h / 2 - 5;
        });

      var max_r = d3.max(punchcard_data.map(
        function (d) {
          return d.count__sum;
        })),
        r = d3.scaleLinear()
          .domain([0, d3.max(punchcard_data, function (d) {
            return d.count__sum;
          })])
          .range([0, 12]);

      svg.selectAll(".loading").remove();

      svg.selectAll("circle")
        .data(punchcard_data)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("cx", function (d) {
          return x(d.hour);
        })
        .attr("cy", function (d) {
          return y(d.weekday);
        })
        .transition()
        .duration(800)
        .attr("r", function (d) {
          return r(d.count__sum);
        });
    });
}

function paintStack1() {
  var pad = 20, left_pad = 50;
  var w = stack1Selection.width(),
    h = stack1Selection.height();
  var x = d3.scaleBand().domain([0, 1, 2, 3, 4, 5]).rangeRound([left_pad, w - pad]);
  var y = d3.scaleLinear().range([h - pad * 2, pad]);
  var xAxis = d3.axisBottom(x)
    .tickFormat(function (d) { return ["-18", "19-25", "26-35", "36-45", "46-60", "61-"][d]; });
  var yAxis = d3.axisLeft(y).ticks(10);
  var svg = d3.select("#stack1").append("svg")
    .attr("width", stack1Selection.width())
    .attr("height", stack1Selection.height())
    .append("g");

  d3.json("/aggregate1/?age=g").then(function (data) {
    data = data["data"];
    console.log(data);

    y.domain([0, d3.max(data, function (d) {
      return d[1];
    })]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, " + (h - pad * 2) + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-90)");

    svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + left_pad + ", 0)")
      .call(yAxis);

    svg.selectAll("bar")
      .data(data)
      .enter().append("rect")
      .style("fill", "steelblue")
      .attr("x", function (d) {
        return x(d[0]);
      })
      .attr("width", x.bandwidth())
      .attr("y", function (d) {
        return y(d[1]);
      })
      .attr("height", function (d) {
        return h - pad * 2 - y(d[1]);
      });

  });
}

function paintGraph(site) {
  var width = link1Selection.width(),
    height = link1Selection.height(),
    radius = 5;

  if (!graph1Simulation) {
    graph1Simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function (d) {
        return d.id;
      }))
      .force("charge", d3.forceManyBody().distanceMax(200))
      .force("center", d3.forceCenter(width / 2, height / 2));
    graph1Simulation.on("tick", null);
  }

  link1Selection.find("svg").remove();

  var svg = d3.select("#link1").append("svg")
    .attr("width", width)
    .attr("height", height);
  var link_group = svg.append("g")
    .attr("class", "links");
  var node_group = svg.append("g")
    .attr("class", "nodes");
  var max_rel = 1;
  var min_rel = 0;
  var widthScale = d3.scaleLinear().range([1, 5]);

  var url = "/relation/";
  if (site) url += "?site=" + site;
  d3.json(url).then(function (data) {
    max_rel = d3.max(data["link"], function (obj) { return obj.relevance; });
    min_rel = Math.max(d3.min(data["link"], function (obj) { return obj.relevance; }) - 1, 0);
    widthScale.domain([min_rel, max_rel]);
    var node = node_group
      .selectAll("circle")
      .data(data["node"])
      .enter().append("circle")
      .attr("r", 5)
      .attr("fill", "#000");

    var link = link_group.selectAll("line").data(data["link"]);
    link.exit().remove();
    link.enter().append("line");

    graph1Simulation
      .nodes(data["node"])
      .on("tick", ticked);

    graph1Simulation
      .force("link")
      .links(data["link"]);
  });

  function hashID(s, mod) {
    var r = 0;
    for (var i = 0; i < s.length; ++i)
      r = (r * 123 + s.charCodeAt(i)) % mod;
    return r;
  }

  function ticked() {
    link_group.selectAll("line")
      .attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      })
      .attr("stroke-width", function (d) {
        return widthScale(d.relevance);
      })
      .attr("stroke", function (d) {
        return d.birthplace > 0 ? "#F9A602" : "#888";
      });

    node_group.selectAll("circle")
      .attr("cx", function (d) {
        var err = hashID(d.id, 50);
        return d.x = Math.max(radius + err, Math.min(width - radius - err, d.x));
      })
      .attr("cy", function (d) {
        var err = hashID(d.id, 50);
        return d.y = Math.max(radius + err, Math.min(height - radius - err, d.y));
      })
      .attr("fill", function (d) {
        return "black";
      })
      .attr("r", function (d) {
        return radius;
      });

    graph1Simulation.alpha(0.1).restart();
  }
}

function reset() {
  paintMap();
  paintPunchCard();
  paintStack1();
  paintGraph();
}

function onClickSite(site) {
  paintGraph(site);
  if (siteTeenData.hasOwnProperty(site))
    outputTeenDetailsTable(siteTeenData[site].detail);
}

var mapSelection = $("#map"),
  add1Selection = $("#add1"),
  punchcard1Section = $("#punchcard1"),
  stack1Selection = $("#stack1"),
  link1Selection = $("#link1"),
  tableBodySelection = $("#teen-table-body");
var siteData, siteTeenData;
var map1, mapLayer;
var graph1Simulation;
adjustSize();
d3.json("/site/")
  .then(function (data) {
    siteData = data["data"];
  })
  .then(initMap)
  .then(reset);
