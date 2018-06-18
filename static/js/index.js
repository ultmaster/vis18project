function adjustSize() {
  group1.height(group1.width() * .4);
  group2.height(group2.width() * .3);
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

function paintTeenTableForSite(site) {
  if (!site) {
    var all_details = [];
    for (var site in siteTeenData)
      all_details = all_details.concat(siteTeenData[site].detail);
    outputTeenDetailsTable(all_details);
  } else {
    if (!siteTeenData.hasOwnProperty(site))
      outputTeenDetailsTable([]);
    else outputTeenDetailsTable(siteTeenData[site].detail);
  }
}

function paintMap() {
  var url = "/aggregate2/?filter=" + (migrationEnabled ? "on" : "off");
  if (punchcard.validRangeQuery())
    url += "&time=s&" + punchcard.validRangeQuery();
  else if (stack.validRangeQuery())
    url += "&age=s&" + stack.validRangeQuery();

  console.log(url);

  d3.json(url).then(function (data) {
    d3.json("/teen/").then(function (addOn1) {
      function getLevel(siteId) {
        if (!addOn1.hasOwnProperty(siteId))
          return 0;
        return addOn1[siteId].level1 > 0 ? 1 : 2;
      }

      siteTeenData = addOn1;
      paintTeenTableForSite();

      mapLayer.setData(siteData, {
        lnglat: function (obj) {
          return [obj.value.lng, obj.value.lat];
        }
      });
      var max_r_data = Math.sqrt(d3.max(Object.values(data)));

      mapLayer.on('click', function (ev) {
        if (!mapInfoWin) {
          mapInfoWin = new AMap.InfoWindow();
          mapInfoWin.on('close', function (e) {
            siteEnabled = null;
            onClickSite();
          });
        }
        var type = ev.type;
        var rawData = ev.rawData;
        var originalEvent = ev.originalEvent;
        var lnglat = ev.lnglat;
        mapInfoWin.setContent(rawData.title + '<br>' + rawData.lng + ", " + rawData.lat +
                              '<br>人次: ' + data[rawData.site_id]);
        mapInfoWin.open(map1.getMap(), new AMap.LngLat(rawData.lng, rawData.lat));
        siteEnabled = rawData.site_id;
        onClickSite(rawData.site_id);
      });

      var fillColorSet = ["#6CB3D9", "#b15215", "#D4B06A"];

      mapLayer.setOptions({
        style: {
          radius: function (obj) {
            return Math.sqrt(data[obj.value.site_id]) / max_r_data * 30;
          },
          fill: function (obj) {
            return fillColorSet[getLevel(obj.value.site_id)];
          },
          opacity: 0.4,
          lineWidth: 1,
          stroke: '#eee'
        }
      });

      mapLayer.render();
    });
  });
}

function PunchCard() {
  this.width = punchcard1Section.width();
  this.height = punchcard1Section.height();
  this.svg = d3.select("#punchcard1").append("svg").attr("width", this.width).attr("height", this.height);
  this.weekdayRange = null;
  this.hourRange = null;

  this.validRangeQuery = function () {
    if (!this.weekdayRange || !this.hourRange)
      return "";
    if (this.weekdayRange[0] > this.weekdayRange[1])
      return "";
    if (this.hourRange[0] > this.hourRange[1])
      return "";
    return "weekday=" + this.weekdayRange[0] + "," + this.weekdayRange[1] + "&" +
        "hour=" + this.hourRange[0] + "," + this.hourRange[1];
  };

  this.paint = function (site) {
    this.svg.selectAll("g").remove();
    var svg = this.svg.append("g"), w = this.width, h = this.height;
    var outerThis = this;
    svg.selectAll("*").remove();

    var url = "/aggregate2/?time=g&filter=" + (migrationEnabled ? "on" : "off");
    if (site) url = url + "&site=" + site;

    d3.json(url).then(function (data) {
      var punchcard_data = data["data"];
      var pad = 20, left_pad = 100;

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

      outerThis.brush = d3.brush()
        .extent([[0, 0], [w, h]])
        .on("end", brushended);

      outerThis.brushArea = svg.append("g")
        .attr("class", "brush")
        .call(outerThis.brush);

      var r = d3.scaleLinear()
        .domain([0, d3.max(punchcard_data, function (d) {
          return d.count_sum;
        })])
        .range([0, 12]);

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
        .on("mouseover", function (d) {
          var pos = $(d3.select(this).node()).position();
          tooltip.css("top", pos.top + 20);
          tooltip.css("left", pos.left - 10);
          tooltip.html("总上网人次: " + d.count_sum + "<br>" +
                       "平均上网时间: " + d.length.toPrecision(2));
          tooltip.show();
        })
        .on("mouseout", function (d) {
          tooltip.hide();
        })
        .attr("r", function (d) {
          return r(d.count_sum);
        });

      function goodRound(low, high, p) {
        return Math.min(high + 1, Math.max(Math.round(p + 0.5), low)) - 0.5;
      }

      function brushended() {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) {
          punchcard.weekdayRange = null;
          punchcard.hourRange = null;
          onTimeChange();
          return;
        }
        var x0 = x.invert(d3.event.selection[0][0]),
          x1 = x.invert(d3.event.selection[1][0]),
          y0 = y.invert(d3.event.selection[0][1]),
          y1 = y.invert(d3.event.selection[1][1]);
        x0 = goodRound(0, 24, x0);
        x1 = goodRound(0, 24, x1);
        y0 = goodRound(0, 6, y0);
        y1 = goodRound(0, 6, y1);

        var newScale = [[x(x0), y(y0)], [x(x1), y(y1)]];
        d3.select(this).transition().call(d3.event.target.move, newScale);

        punchcard.weekdayRange = [Math.ceil(y0), Math.floor(y1)];
        punchcard.hourRange = [Math.ceil(x0), Math.floor(x1)];

        stack.clearBrush();

        onTimeChange();
      }

      if (outerThis.weekdayRange) {
        var selection = [[x(outerThis.hourRange[0] - 0.5), y(outerThis.weekdayRange[0] - 0.5)],
                         [x(outerThis.hourRange[1] + 0.5), y(outerThis.weekdayRange[1] + 0.5)]];
        outerThis.brushArea.call(outerThis.brush.move, selection);
      }
    });
  };

  this.clearBrush = function () {
    if (!this.brush) return;
    this.brushArea.call(this.brush.move, null);

    this.weekdayRange = null;
    this.hourRange = null;
    onTimeChange();
  }
}

function Stack() {
  this.width = stack1Selection.width();
  this.height = stack1Selection.height();
  this.svg = d3.select("#stack1").append("svg").attr("width", this.width).attr("height", this.height);
  this.ageRange = null;

  this.validRangeQuery = function () {
    if (!this.ageRange) return "";
    if (this.ageRange[0] > this.ageRange[1])
      return "";
    return "range=" + Math.floor(this.ageRange[0]) + "," + Math.ceil(this.ageRange[1]);
  };

  this.paint = function (site) {
    var outerThis = this;
    var pad = 20, left_pad = 50;
    var w = this.width, h = this.height;
    this.svg.selectAll("g").remove();
    var svg = this.svg.append("g");
    var url = "/aggregate2/?age=g&filter=" + (migrationEnabled ? "on" : "off");
    if (site) url = url + "&site=" + site;

    d3.json(url).then(function (data) {
      data = data["data"];

      var color = d3.scaleSequential(d3.interpolateGnBu).domain([-1, 5]);
      var keyDomain = ["1", "2", "3", "5", "8", "13"];
      var x = d3.scaleLinear()
        .domain(d3.extent(data, function (obj) {
          return obj.age;
        }))
        .range([left_pad, w - pad]);
      var y = d3.scaleLinear().range([h - pad, pad]);
      var xAxis = d3.axisBottom(x).ticks(10);
      // .tickFormat(function (d) { return d.age });
      var yAxis = d3.axisLeft(y).ticks(10);
      var area = d3.area()
        .x(function (d, i) {
          return x(i + x.domain()[0]);
        })
        .y0(function (d) {
          return y(d[0]);
        })
        .y1(function (d) {
          return y(d[1]);
        })
        .curve(d3.curveBasis);
      var stack = d3.stack()
        .keys(keyDomain)
        .value(function (obj, key) {
          return obj.detail[key];
        });
      var browser = stack(data);

      y.domain([0, d3.max(data, function (d) {
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
        .style("fill", function (d) {
          return color(keyDomain.indexOf(d.key));
        })
        .attr("d", area);

      function brushended() {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) {
          this.ageRange = null;
          onAgeChange();
          return;
        }
        var xrange = d3.event.selection.map(x.invert);
        xrange[0] = Math.max(xrange[0], x.domain()[0]);
        xrange[1] = Math.min(xrange[1], x.domain()[1]);
        d3.select(this).transition().call(d3.event.target.move, xrange.map(x));
        outerThis.ageRange = xrange;

        punchcard.clearBrush();

        onAgeChange();
      }

      outerThis.brush = d3.brushX()
        .extent([[0, pad], [w, h - pad]])
        .on("end", brushended);

      outerThis.brushArea = svg.append("g")
        .attr("class", "brush")
        .call(outerThis.brush);

      if (outerThis.ageRange) {
        // set default range
        var brushRange = [0, 0];
        brushRange[0] = Math.max(outerThis.ageRange[0], x.domain()[0]);
        brushRange[1] = Math.min(outerThis.ageRange[1], x.domain()[1]);
        outerThis.brushArea.call(outerThis.brush.move, brushRange.map(x));
      }
    });
  };

  this.clearBrush = function () {
    if (!this.brush) return;
    this.brushArea.call(this.brush.move, null);

    this.ageRange = null;
    onAgeChange();
  }
}

function Graph() {
  this.width = link1Selection.width();
  this.height = link1Selection.height();
  this.nodes = null;

  this.simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
      return d.id;
    }))
    .force("charge", d3.forceManyBody().distanceMax(200))
    .force("center", d3.forceCenter(this.width / 2, this.height / 2));
  this.simulation.on("tick", null);

  this.svg = d3.select("#link1").append("svg")
    .attr("width", this.width)
    .attr("height", this.height)
    .attr("opacity", 0.6);

  function gatherNodes(groupNode, simulation) {
    var active_node = [];
    groupNode.selectAll("circle").filter(function (d) {
      return d.selected;
    }).each(function (d) {
      active_node.push(d.id);
    });
    console.log(active_node);
    simulation.alpha(0.1).restart();
    timeline.paint(active_node);
  }

  function brushended(e) {
    if (!d3.event.sourceEvent) return;
    if (!d3.event.selection) {
      if (this.brushFakeEnding) {
        this.brushFakeEnding = false;
        return;
      }
      if (this.nodes) {
        this.groupNode.selectAll("circle").classed("selected", function (d) {
          return d.selected = false;
        });
      }
      gatherNodes(this.groupNode, this.simulation);
      return;
    }
    this.brushFakeEnding = true;
    this.brushArea.call(this.brush.move, null);
    if (this.nodes) {
      var selection = d3.event.selection;
      for (var i = 0; i < this.nodes.length; ++i) {
        this.nodes[i].selected = false;
        if (this.nodes[i].x >= selection[0][0] &&
          this.nodes[i].x <= selection[1][0] &&
          this.nodes[i].y >= selection[0][1] &&
          this.nodes[i].y <= selection[1][1])
          this.nodes[i].selected = true;
      }
      this.groupNode.selectAll("circle").classed("selected", function (d) {
        return d.selected;
      });
    }
    gatherNodes(this.groupNode, this.simulation);
  }

  this.brush = d3.brush()
    .extent([[0, 0], [this.width, this.height]])
    .on("end", brushended.bind(this));

  this.brushArea = this.svg.append("g")
    .attr("class", "brush")
    .call(this.brush);

  this.groupLink = this.svg.append("g").attr("class", "link");
  this.groupNode = this.svg.append("g").attr("class", "node");

  this.paint = function (site) {
    var url = "/relation/?filter=" + (migrationEnabled ? "on" : "off");
    if (site) url += "&site=" + site;

    var width = this.width, height = this.height, radius = 5;
    var svg = this.svg, groupLink = this.groupLink, groupNode = this.groupNode;
    var simulation = this.simulation;
    var outerThis = this;
    groupLink.selectAll("*").remove();
    groupNode.selectAll("*").remove();
    var max_rel = 1;
    var min_rel = 0;
    var widthScale = d3.scaleLinear().range([1, 5]);

    d3.json(url).then(function (data) {
      max_rel = d3.max(data.link, function (obj) {
        return obj.relevance;
      });
      min_rel = Math.max(d3.min(data.link, function (obj) {
          return obj.relevance;
        }) - 1, 0);
      widthScale.domain([min_rel, max_rel]);
      outerThis.nodes = data.node;
      groupNode
        .selectAll("circle")
        .data(data.node)
        .enter().append("circle")
        .on("click", function (d) {
          d3.select(this).classed("selected", d.selected = !d.selected);
          gatherNodes(groupNode, simulation);
        });

      var link = groupLink.selectAll("line").data(data.link);
      link.exit().remove();
      link.enter().append("line");

      simulation.nodes(data.node).on("tick", ticked);
      simulation.force("link").links(data.link);
      simulation.alpha(0.1).restart();

      function ticked() {
        groupLink.selectAll("line").attr("x1", function (d) {
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

        groupNode.selectAll("circle")
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
  };
}

function Timeline() {
  this.width = timeline1Selection.width();
  this.height = timeline1Selection.height();
  this.svg = d3.select("#timeline1").append("svg").attr("width", this.width).attr("height", this.height)
    .style("overflow", "hidden");
  this.parser = d3.isoParse;

  this.paint = function (id_list) {
    var width = this.width, height = this.height, parser = this.parser;
    this.svg.selectAll("g").remove();
    var svg = this.svg.append("g");
    d3.json("/timeline/?id=" + (id_list ? id_list.join(",") : ""))
    .then(function (data) {

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
        .range([0, height - 20]).padding(0.05);
      var colorScale = d3.scaleOrdinal(d3.schemeSet2).domain(yScale.domain());
      var trans;

      var lineStart = 0.05 / 2 * yScale.step();
      var gridGroup = svg.append("g");
      for (var i = 1; i < data.length; ++i) {
        lineStart += yScale.step();
        gridGroup.append("line")
          .attr("x1", 0)
          .attr("x2", width)
          .attr("y1", lineStart)
          .attr("y2", lineStart)
          .attr("stroke-width", .5)
          .attr("stroke", "black")
          .attr("opacity", .6);
      }

      var spanX = function (d) { return xScale(parser(d.online_time)); };
      var spanW = function (d) {
        var k = trans ? trans.k : 1;
        var w = (xScale(parser(d.offline_time)) - xScale(parser(d.online_time))) * k;
        w = Math.max(w, 5);
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
            .attr("fill", function (d) {
              return d3.rgb(colorScale(d.person_id)).darker(.2);
            })
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("stroke-width", 3)
            .attr("stroke", function (d) {
              return d3.rgb(colorScale(d.person_id)).darker(1);
            })
            .attr("opacity", .8);
        });

      var xAxis = d3.axisBottom(xScale)
        .ticks(width / 100);

      var globalX = svg.append("g")
        .attr("transform", "translate(0," + (height - 20) + ")")
        .attr("class", "axis")
        .call(xAxis);

      var catchAll = svg.append("g")
        .attr("class", "zoom")
        .append("rect")
        .attr("fill", "none")
        .attr("width", width)
        .attr("height", height - 20)
        .on("mousemove", function () {
          var allRects = vis.selectAll("g").selectAll("rect");
          var taken = false;
          allRects.each(function (d) {
            var bbox = this.getBBox();
            var mouse = d3.mouse(this);
            var mouseX = mouse[0], mouseY = mouse[1];
            if (!taken && mouseX >= bbox.x &&
              mouseX <= bbox.x + bbox.width &&
              mouseY >= bbox.y &&
              mouseY <= bbox.y + bbox.height) {
              taken = true;
              // console.log(bbox);
              // console.log(mouseX + " " + mouseY);
              tooltip.css("top", bbox.y + bbox.height + $(svg.node().parentNode).position().top);
              tooltip.css("left", bbox.width / 2 + bbox.x - 10 + $(svg.node().parentNode).position().left);
              tooltip.html("证件号: " + d.person_id + "<br>" +
                           "姓名: " + d.customer_name + "<br>" +
                           "上线时间: " + d.online_time + "<br>" +
                           "下线时间: " + d.offline_time + "<br>" +
                           "网吧: " + d.site_name + "<br>" +
                           "网吧编号:" + d.site_id);
              tooltip.show();
            }
            if (!taken) {
              tooltip.hide();
            }
          })
        })
        .on("mouseout", function () {
          tooltip.hide();
        });

      catchAll.call(d3.zoom()
        .scaleExtent([0.5, 100])
        .on("zoom", function () {
          trans = d3.event.transform;
          globalX.call(xAxis.scale(trans.rescaleX(xScale)));
          vis.selectAll("rect")
            .attr("x", function (d) {
              return spanX(d) * trans.k + trans.x;
            })
            .attr("width", spanW);
        })
      );
    });
  }
}

function reset() {
  punchcard = new PunchCard();
  stack = new Stack();
  timeline = new Timeline();
  graph = new Graph();

  punchcard.paint();
  stack.paint();
  timeline.paint();
  graph.paint();

  paintMap();
}

function onClickSite(site) {
  paintTeenTableForSite(site);

  punchcard.paint(site);
  stack.paint(site);
  graph.paint(site);
}

function onTimeChange() {
  paintMap();
  // stack.paint(siteEnabled);
}

function onAgeChange() {
  paintMap();
  // punchcard.paint(siteEnabled);
}

var mapSelection = $("#map"),
  add1Selection = $("#add1"),
  punchcard1Section = $("#punchcard1"),
  stack1Selection = $("#stack1"),
  link1Selection = $("#link1"),
  timeline1Selection = $("#timeline1"),
  tableBodySelection = $("#teen-table-body"),
  group1 = $("#group1"),
  group2 = $("#group2"),
  tooltip = $("#tooltip");
var siteData, siteTeenData;
var map1, mapLayer;
var timeline, punchcard;
var mapInfoWin;
var migrationEnabled = false;
var siteEnabled = null;
adjustSize();
d3.json("/site/")
  .then(function (data) {
    siteData = data["data"];
  })
  .then(initMap)
  .then(reset);

$("#migration").checkbox({
  onChecked: function () {
    migrationEnabled = true;
    paintMap();
    onClickSite(siteEnabled);
  },
  onUnchecked: function () {
    migrationEnabled = false;
    paintMap();
    onClickSite(siteEnabled);
  }
});
