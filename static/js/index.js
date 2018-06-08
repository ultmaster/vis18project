function adjustSize() {
  group1.height(group1.width() * .4);
  add1Selection.height(add1Selection.width() * .3);
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
  d3.json("/aggregate2/")
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
  d3.json("/aggregate2/?time=g")
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

      var r = d3.scaleLinear()
        .domain([0, d3.max(punchcard_data, function (d) {
          return d.count_sum;
        })])
        .range([0, 12]);

      svg.selectAll(".loading").remove();

      var circleColor = d3.scaleSequential(d3.interpolateGnBu)
        .domain([0, d3.max(punchcard_data, function (d) {
          return d.length;
        })]);

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
        .attr("fill", function (d) {
          return circleColor(d.length);
        })
        .transition()
        .duration(800)
        .attr("r", function (d) {
          return r(d.count_sum);
        });
    });
}

function paintStack1() {
  var pad = 20, left_pad = 50;
  var w = stack1Selection.width(),
    h = stack1Selection.height();
  var svg = d3.select("#stack1").append("svg")
    .attr("width", stack1Selection.width())
    .attr("height", stack1Selection.height())
    .append("g");

  d3.json("/aggregate2/?age=g").then(function (data) {
    data = data["data"];
    console.log(data);

    var color = d3.scaleSequential(d3.interpolateGnBu).domain([-1, 5]);
    var keyDomain = ["1", "2", "3", "5", "8", "13"];
    var x = d3.scaleLinear()
      .domain(d3.extent(data, function (obj) { return obj.age; }))
      .range([left_pad, w - pad]);
    var y = d3.scaleLinear().range([h - pad, pad]);
    var xAxis = d3.axisBottom(x).ticks(10);
      // .tickFormat(function (d) { return d.age });
    var yAxis = d3.axisLeft(y).ticks(10);
    var area = d3.area()
      .x(function(d, i) { return x(i + x.domain()[0]); })
      .y0(function(d) { return y(d[0]); })
      .y1(function(d) { return y(d[1]); })
      .curve(d3.curveBasis);
    var stack = d3.stack()
      .keys(keyDomain)
      .value(function (obj, key) { return obj.detail[key]; });
    var browser = stack(data);

    console.log(browser);

    y.domain([0, d3.max(data, function(d) {
      return d3.sum(d3.values(d.detail));
    })]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, " + (h - pad) + ")")
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

    svg.append("g").selectAll("path")
      .data(browser)
      .enter().append("path")
      .attr("class", "area")
      .style("fill", function(d) { return color(keyDomain.indexOf(d.key)); })
      .attr("d", area);
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
    .attr("height", height)
    .attr("opacity", 0.6);
  var link_group = svg.append("g")
    .attr("class", "link");
  var node_group = svg.append("g")
    .attr("class", "node");
  var max_rel = 1;
  var min_rel = 0;
  var widthScale = d3.scaleLinear().range([1, 5]);

  var url = "/relation/";
  if (site) url += "?site=" + site;
  d3.json(url).then(function (data) {
    max_rel = d3.max(data.link, function (obj) { return obj.relevance; });
    min_rel = Math.max(d3.min(data.link, function (obj) { return obj.relevance; }) - 1, 0);
    widthScale.domain([min_rel, max_rel]);
    node_group
      .selectAll("circle")
      .data(data.node)
      .enter().append("circle")
      .on("click", function (d) {
        d3.select(this).classed("selected", d.selected = !d.selected);

        var active_node = [];
        node_group.selectAll("circle").filter(function (d) {
          return d.selected;
        }).each(function (d) { active_node.push(d.id); });
        console.log(active_node);
        timeline.paint(active_node);
      });

    var link = link_group.selectAll("line").data(data.link);
    link.exit().remove();
    link.enter().append("line");

    graph1Simulation
      .nodes(data.node)
      .on("tick", ticked);

    graph1Simulation
      .force("link")
      .links(data.link);

    graph1Simulation.alpha(0.1).restart();

    function ticked() {
      link_group.selectAll("line").attr("x1", function (d) {
        return d.source.x;
      }).attr("y1", function (d) {
        return d.source.y;
      }).attr("x2", function (d) {
        return d.target.x;
      }).attr("y2", function (d) {
        return d.target.y;
      }).attr("stroke-width", function (d) {
        return widthScale(d.relevance);
      }).classed("strong", function (d) {
        return d.birthplace > 0;
      });

      node_group.selectAll("circle")
        .attr("cx", function (d) {
          var err = hashID(d.id, 50);
          return d.x = Math.max(radius + err, Math.min(width - radius - err, d.x));
        }).attr("cy", function (d) {
          var err = hashID(d.id, 50);
          return d.y = Math.max(radius + err, Math.min(height - radius - err, d.y));
        }).attr("r", function (d) {
          return radius;
        });
    }
  });

  function hashID(s, mod) {
    var r = 0;
    for (var i = 0; i < s.length; ++i)
      r = (r * 123 + s.charCodeAt(i)) % mod;
    return r;
  }
}

function Timeline() {
  this.width = timeline1Selection.width();
  this.height = timeline1Selection.height() - 20;
  this.svg = d3.select("#timeline1").append("svg").attr("width", this.width).attr("height", this.height);
  this.parser = d3.isoParse;

  this.paint = function (id_list) {
    var svg = this.svg, width = this.width, height = this.height, parser = this.parser;
    d3.json("/timeline/?id=" + (id_list ? id_list.join(",") : ""))
    .then(function (data) {
      svg.selectAll("*").remove();
      data = data["data"];

      var minTime = d3.min(data, function (d) {
        return d3.min(d.values, function (e) {
          return parser(e.online_time);
        });
      });
      var maxTime = d3.max(data, function (d) {
        return d3.max(d.values, function (e) {
          return parser(e.offline_time);
        })
      });

      var xScale = d3.scaleTime()
        .domain([minTime, maxTime])
        .range([0, width]);
      var yScale = d3.scaleBand().domain(data.map(function (d) { return d.key; }))
        .range([0, height]).paddingInner(0.05);
      var trans;

      var spanX = function (d) { return xScale(parser(d.online_time)); };
      var spanW = function (d) {
        var w = xScale(parser(d.offline_time)) - xScale(parser(d.online_time));
        if (trans)
          w = Math.max(w, 2 / trans.k);
        return w;
      };

      var vis = svg.append("g");

      vis.selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .each(function (d) {
          var g = d3.select(this);
          g.selectAll("rect").data(d.values)
            .enter()
            .append("rect")
            .attr("x", spanX)
            .attr("y", function (d) { return yScale(d.person_id); })
            .attr("width", spanW)
            .attr("height", yScale.bandwidth())
            .attr("fill", "#000");
        });

      var xAxis = d3.axisBottom(xScale)
        .ticks(width / 100);

      var globalX = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "axis")
        .call(xAxis);

      var catchAll = svg.append("g")
        .attr("class", "zoom")
        .append("rect")
        .attr("fill", "none")
        .attr("width", width)
        .attr("height", height);

      catchAll.call(d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", function () {
          trans = d3.event.transform;
          globalX.call(xAxis.scale(trans.rescaleX(xScale)));
          vis.attr("transform", "translate(" + trans.x + ",0) scale(" + trans.k  + ",1)");
          vis.selectAll("rect").attr("width", spanW);
        })
      );
    });
  }
}

function paintTimeline() {
  var width = timeline1Selection.width(), height = timeline1Selection.height() - 20;
  var svg = d3.select("#timeline1").append("svg").attr("width", width).attr("height", height);
  var parser = d3.isoParse;

}

function reset() {
  paintMap();
  paintPunchCard();
  paintStack1();
  paintGraph();
  timeline = new Timeline();
  timeline.paint();
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
  timeline1Selection = $("#timeline1"),
  tableBodySelection = $("#teen-table-body"),
  group1 = $("#group1");
var siteData, siteTeenData;
var map1, mapLayer;
var graph1Simulation;
var timeline;
adjustSize();
d3.json("/site/")
  .then(function (data) {
    siteData = data["data"];
  })
  .then(initMap)
  .then(reset);
