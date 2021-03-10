(function ($) {
    class FrequencyGauge {
        constructor({ parentElement, config, data }) {
            this._parentElement = parentElement;
            this.config(config);
            this.data(data);
            this.init();
        }

        init() {
            const svg = d3.select(this._parentElement)
                .append("svg:svg");
            svg.append("g").attr("class", "arcs");
            svg.append("g").attr("class", "labels");

            return this;
        }

        config(config) {
            const defaults = {
                colors: ['#ED7D31', '#0086C0']
            };
            config = config || {};
            this._config = { ...defaults, ...config };
            return this;
        }

        data(data) {
            // ensure we get an array with at most 2 data points
            data = Array.isArray(data) ? data.slice(0, 2) : [];

            // get the total frequency
            const total = data.reduce((sum, cur) => sum + cur.value, 0);

            // augment data with relative frequency and sort order
            data = data.map((d, i) => {
                return { ...d, percent: d.value / total, sort_order: i };
            });
            this._data = data;
            return this;
        }


        draw() {
            const vis = this;

            // determine size based on parent element
            const parentElement = document.querySelector(vis._parentElement);
            const width = Math.max(parentElement.clientWidth, 200);
            const height = Math.max(parentElement.clientHeight, 200);
            const radius = Math.min(width, height) / 2;
            // let fontSize = Math.max(Math.round(width / 16), 14);
            let fontSize = 14;

            // setup shape primitives and scales
            const pieGenerator = d3.pie()
                .value((d) => d.value)
                .sort((a, b) => a.sort_order - b.sort_order)
                .startAngle(-.5 * Math.PI)
                .endAngle(.5 * Math.PI);
            const arcGenerator = d3.arc()
                .innerRadius(radius / 3)
                .outerRadius(radius)
                .padAngle(.02);
            const colorOrdinal = d3.scaleOrdinal(vis._config.colors);

            // select and update svg elements
            const svg = d3.select(vis._parentElement)
                .select("svg")
                .attr('width', width)
                .attr('height', height);
            const arcs = svg.select(".arcs")
                .attr("transform", `translate(${radius},${radius})`);
            const labels = svg.select(".labels")
                .attr("transform", `translate(0, ${radius * 1.1})`);

            const pieData = pieGenerator(vis._data);

            // append the donut slice paths
            arcs.selectAll(".arc")
                .data(pieData)
                .enter().append("path")
                .attr("class", "arc")
                .on('mouseover', function (d, i) {
                    d3.select(this).transition().duration(50).attr('opacity', '.85');
                })
                .on('mouseout', function (d, i) {
                    d3.select(this).transition().duration(50).attr('opacity', '1');
                });

            arcs.selectAll(".arc")
                .attr("fill", (d, i) => colorOrdinal(i))
                .attr("d", arcGenerator);

            // append the percentage value text
            arcs.selectAll(".arcvalue")
                .data(pieData)
                .enter().append('text')
                .attr("class", "arcvalue");

            arcs.selectAll(".arcvalue")
                .each(function (d, i) {
                    const centroid = arcGenerator.centroid(d);
                    d3.select(this)
                        .attr('x', centroid[0])
                        .attr('y', centroid[1])
                        .text(d3.format(".0%")(d.data.percent))
                        .attr("fill", "white")
                        .attr('text-anchor', 'middle')
                        .attr('font-size', fontSize);
                });

            // append word labels to bottom of donut
            labels.selectAll(".arclabel")
                .data(pieData)
                .enter().append("text")
                .attr("class", "arclabel");

            let adjustedFontSize = fontSize;
            labels.selectAll(".arclabel")
                .text((d) => d.data.label)
                .attr('font-family', 'sans-serif')
                .attr('font-size', fontSize)
                .each(function (d, i) {
                    const text = d3.select(this);

                    // adjust fontSize so that each text does not exceed 50% of the width
                    let textwidth = text.node().getBBox().width;
                    adjustedFontSize = Math.min(adjustedFontSize, Math.floor((1 - (textwidth / width) + .5) * fontSize));
                    text
                        // .attr('x', d.data.sort_order == 0 ? 0 : width*.63)
                        .attr('x', d.data.sort_order == 0 ? 0 : width)
                        .attr('text-anchor', d.data.sort_order == 0 ? 'start' : 'end')
                        .attr("fill", colorOrdinal(d.data.sort_order));
                })
                .attr('font-size', adjustedFontSize);

            return vis;
        }
    }


    async function make_radar(data, label_lookup, complexity) {
        $("#error").hide();
        var input_text = $("#contentinput").val();
        var index = label_lookup[input_text];

        $('#gauge').empty();
        $('#tr').empty();

        if (index == undefined) {
            d3.select('#output').style('display', 'none')
            // d3.selectAll('.toggle').style('opacity',0)
            draw_skeleton(data, label_lookup);
            $("#error").show();
            return false;
        }

        var label = data[index].pair;
        var full_data = data[index];

        $('#input-word').text(input_text)
        $("#pair").text(label);
        d3.select('#output').style('display', 'block')

        var complexity_key
        if (complexity == 'simple') {
            complexity_key = 'simple_data'
            aspects = Object.keys(full_data.simple_data);
        } else {
            complexity_key = 'detailed_data'
            aspects = Object.keys(full_data.detailed_data);
        }

        // get chart data
        var chart_data = []
        var aspect_info = []
        Object.keys(full_data[complexity_key]).forEach(function (aspect) {
            chart_data.push(full_data[complexity_key][aspect].data)
            aspect_info.push({
                "aspect": aspect,
                "label": full_data[complexity_key][aspect].label
            })
        })

        d3.select('#tr-label').text(label + ' translation: ')
        var translation_found = false

        var gauge = new FrequencyGauge({ parentElement: "#gauge" });
        var gauge_array = []

        aspect_info.forEach(function (aspect, i) {
            // translation
            var translation = full_data[complexity_key][aspect.aspect].clancy.translation
            console.log(translation)
            if (translation != '') {
                d3.select('#tr').text(translation)
                translation_found = true
            }
            // gauge info
            var total_aspect_count = 0
            chart_data[i].forEach(function(type) {
                // for each type
                total_aspect_count += type.value
            })
            gauge_array.push({
                "label" : aspect.label,
                "value" : total_aspect_count,
                "description" : aspect.aspect
            })
        })
        if (translation_found == false) {
            d3.select('#tr').text('Translation not found in database.')
        }

        gauge.data(gauge_array);
        if (aspect_info.length == 2) {
            gauge.draw();
        } 

        var id = '#chart'

        var colorRange = ['#ED7D31', '#0086C0', '#AF5BA6', 'gray']
        var lightColorRange = {
            "imperfective": '#ed7c31a1',
            "perfective": '#0086C0a1',
            "biaspectual": '#AF5BA6a1',
            "no aspect assigned": 'lightgray'
        }
        // formatting
        cfg = {
            radius: 5,
            w: 425,
            h: 425,
            factor: 1,
            factorLegend: .95,
            levels: 5,
            maxValue: 0.6,
            radians: 2 * Math.PI,
            opacityArea: 0.5,
            ToRight: 5,
            TranslateX: 80,
            TranslateY: 30,
            ExtraWidthX: 100,
            ExtraWidthY: 100,
            color: d3.scaleOrdinal()
                .domain(['imperfective', 'perfective', 'biaspectual', 'no aspect assigned'])
                .range(colorRange)
        };

        // set colored verb labels for toggle
        if (aspect_info.length == 1) {
            d3.select('#verb2').style('display', 'none')
        } else {
            d3.select('#verb2').style('display', 'inline-block')
        }
        aspect_info.forEach(function (aspect, i) {
            var verblabel = d3.select('#verb' + (i + 1))
                .classed('activated', true)
                .style('background-color', function () {
                    return lightColorRange[aspect.aspect];
                })
                .style('border', '1px solid black')
                .style('border-radius', '3px')
                .text(aspect.label)

            verblabel.on('click', function () {
                var series = d3.selectAll(".radar-chart-serie" + i);
                var currentOpacity = $(".radar-chart-serie" + i).css('opacity');
                if (currentOpacity == 0) {
                    series.style('opacity', 1)
                    d3.select(this).classed('activated', true)
                    d3.select(this).style('background-color', function () { return lightColorRange[aspect.aspect] })
                    d3.select('.output' + (i + 1)).style('opacity', 1)
                } else {
                    series.style('opacity', 0)
                    d3.select(this).classed('activated', false)
                    d3.select(this).style('background-color', 'white')
                    d3.select('.output' + (i + 1)).style('opacity', 0)
                }
            })
            verblabel.on('mouseover', function () {
                var thisclass = d3.select(this).attr('class')
                if (thisclass.includes('activated')) {
                    d3.select(this).style('background-color', function () { return cfg.color(aspect.aspect) })
                } else {
                    d3.select(this).style('background-color', 'white')
                }
            })
            verblabel.on('mouseout', function () {
                var thisclass = d3.select(this).attr('class')
                if (thisclass.includes('activated')) {
                    d3.select(this).style('background-color', function () { return lightColorRange[aspect.aspect] })
                } else {
                    d3.select(this).style('background-color', 'white')
                }
            })
        })

        d3.selectAll('.toggle')
            .transition()
            .duration(1000)
            .style('opacity', '1')

        var Format = d3.format("");

        // get max value to scale chart
        cfg.maxValue = Math.max(cfg.maxValue, d3.max(chart_data, function (i) { return d3.max(i.map(function (o) { return o.value; })) }));

        // axis names
        var allAxis = (chart_data[0].map(function (i, j) {
            return i.axis
        }));

        var total = allAxis.length;

        // calc radius length
        var radius = cfg.factor * Math.min(cfg.w / 2, cfg.h / 2);

        // initializing SVG, tooltip
        d3.select(id).select("svg").remove();

        var g = d3.select(id)
            .append("svg")
            .attr("width", 1000)
            .attr("height", cfg.h + cfg.ExtraWidthY)
            .append("g")
            .attr("transform", "translate(" + (cfg.TranslateX + 0) + "," + cfg.TranslateY + ")");
        ;
        //Tooltip
        var tooltip = g.append('text')
            .attr('class', 'tooltip')
            .style('opacity', 0)

        // drawing radar concentric axes
        for (var j = 0; j < cfg.levels; j++) {
            var levelFactor = cfg.factor * radius * ((j + 1) / cfg.levels);
            g.selectAll(".levels")
                .data(allAxis)
                .enter()
                .append("svg:line")
                .attr("x1", function (d, i) { return levelFactor * (1 - cfg.factor * Math.sin(i * cfg.radians / total)); })
                .attr("y1", function (d, i) { return levelFactor * (1 - cfg.factor * Math.cos(i * cfg.radians / total)); })
                .attr("x2", function (d, i) { return levelFactor * (1 - cfg.factor * Math.sin((i + 1) * cfg.radians / total)); })
                .attr("y2", function (d, i) { return levelFactor * (1 - cfg.factor * Math.cos((i + 1) * cfg.radians / total)); })
                .attr("class", "line")
                .style("stroke", "grey")
                .style("stroke-opacity", "0.75")
                .style("stroke-width", "0.3px")
                .attr("transform", "translate(" + (cfg.w / 2 - levelFactor) + ", " + (cfg.h / 2 - levelFactor) + ")");
        }

        series = 0;

        // drawing radar radial axes
        var axis = g.selectAll(".axis")
            .data(allAxis)
            .enter()
            .append("g")
            .attr("class", "axis");
        axis.append("line")
            .attr("x1", cfg.w / 2)
            .attr("y1", cfg.h / 2)
            .attr("x2", function (d, i) { return cfg.w / 2 * (1 - cfg.factor * Math.sin(i * cfg.radians / total)); })
            .attr("y2", function (d, i) { return cfg.h / 2 * (1 - cfg.factor * Math.cos(i * cfg.radians / total)); })
            .attr("class", "line")
            .style("stroke", "grey")
            .style("stroke-width", "1px");


        // labeling the radar vertices
        var radLabels = axis.append("text")
            .attr("class", "legend")
            .text(function (d, i) {
                var new_label;
                // NEED to FIX
                // if (d.includes('conjugated')) {
                //     var example = d.split('conjugated ')[1]
                //     if ('imperfective' == 'imperfective') {
                //         new_label = 'present'
                //     } else {
                //         new_label = 'future'
                //     }
                // } else {
                new_label = d
                // }
                return new_label
            })
            .attr("text-anchor", "middle")
            .attr("dy", "1.5em")
            .attr("fill", "gray")
            .attr("transform", function (d, i) { return "translate(0, -10)" })
            .attr("x", function (d, i) {
                if (d.includes('imperative') && (i == 6)) {
                    return (cfg.w / 2 * (1 - cfg.factorLegend * Math.sin(i * cfg.radians / total)) - 60 * Math.sin(i * cfg.radians / total) - d.length);
                }
                if (d.includes('1sg') && (i == 7)) {
                    return (cfg.w / 2 * (1 - cfg.factorLegend * Math.sin(i * cfg.radians / total)) - 60 * Math.sin(i * cfg.radians / total) + d.length);
                }
                return cfg.w / 2 * (1 - cfg.factorLegend * Math.sin(i * cfg.radians / total)) - 60 * Math.sin(i * cfg.radians / total);
            })
            .attr("y", function (d, i) { return cfg.h / 2 * (1 - Math.cos(i * cfg.radians / total)) - 20 * Math.cos(i * cfg.radians / total); });

        // hover label on vertices
        radLabels
            .on('mouseover', function (d) {
                // var thisForm = d3.select(this).text();
                // var thisVal = '-'
                // var thisLabel = '/'
                // aspect_info.forEach(function(aspect, i) {
                //     chart_data[i].forEach(function(form) {
                //         if (form.axis == thisForm) {
                //             thisVal = form.value;
                //             allLabels = Object.keys(form.micro)
                //             thisLabel = allLabels.join(', ') + ': ' + thisVal
                //             console.log('label',thisLabel)
                //         }
                //     })
                // })


                // newX = parseFloat(d3.select(this).attr('x')) - 50;
                // newY = parseFloat(d3.select(this).attr('y')) + 35;

                // tooltip
                //     .attr('x', newX)
                //     .attr('y', newY)
                //     .text(thisLabel)
                //     .style('fill', 'grey')
                //     .style('font-size','15px')
                //     .transition(200)
                //     .style('opacity', 1);
            })
            .on('mouseout', function () {
                tooltip
                    .transition(200)
                    .style('opacity', 0);
                g.selectAll("polygon")
                    .transition(200)
                    .style("fill-opacity", cfg.opacityArea);
            })
        // for each series (layer of radar chart)
        chart_data.forEach(function (y, i) {
            var this_aspect_info = aspect_info[i]
            var verb_label = this_aspect_info.label
            var this_aspect = this_aspect_info.aspect

            dataValues = [];
            g.selectAll(".nodes")
                .data(y, function (j, i) {
                    dataValues.push([
                        cfg.w / 2 * (1 - (parseFloat(Math.max(j.value, 0)) / cfg.maxValue) * cfg.factor * Math.sin(i * cfg.radians / total)),
                        cfg.h / 2 * (1 - (parseFloat(Math.max(j.value, 0)) / cfg.maxValue) * cfg.factor * Math.cos(i * cfg.radians / total))
                    ]);
                });
            dataValues.push(dataValues[0]);
            // draw polygons
            var polygons = g.selectAll(".area")
                .data([dataValues])
                .enter()
                .append("polygon")
                .attr("class", "radar-chart-serie" + series)
                .style("stroke-width", "2px")
                .style("stroke", cfg.color(this_aspect))
                .attr('points', function (d) {
                    var center = cfg.w / 2;
                    var str = "";
                    for (var pti = 0; pti < d.length; pti++) {
                        str = str + center + "," + center + " ";
                    }
                    return str;
                })
                .style("fill", function () {
                    return cfg.color(this_aspect)
                })
                .style("fill-opacity", cfg.opacityArea)
                // polygon hover
                .on('mouseover', function () {
                    d3.select('#verbaspect')
                        .append('span')
                        .text(this_aspect + ': ' + verb_label)
                        .style('color', function () { return cfg.color(this_aspect) })
                    z = "polygon." + d3.select(this).attr("class");
                    g.selectAll("polygon")
                        .transition(200)
                        .style("fill-opacity", 0.1);
                    g.selectAll(z)
                        .transition(200)
                        .style("fill-opacity", .7);
                })
                .on('mouseout', function () {
                    d3.select('#verbaspect').select('span').remove()
                    g.selectAll("polygon")
                        .transition(200)
                        .style("fill-opacity", cfg.opacityArea);
                });

            polygons
                .transition()
                .duration(1500)
                .attr("points", function (d) {
                    var str = "";
                    for (var pti = 0; pti < d.length; pti++) {
                        str = str + d[pti][0] + "," + d[pti][1] + " ";
                    }
                    return str;
                })

            series++;
        });
        series = 0;

        // draws circle vertices of polygon
        chart_data.forEach(function (y, i) {
            var this_aspect_info = aspect_info[i]
            var verb_label = this_aspect_info.label
            var this_aspect = this_aspect_info.aspect

            var vertices = g.selectAll(".nodes")
                .data(y).enter()
                .append("svg:circle")
            vertices
                .attr("class", "radar-chart-serie" + series)
                .attr('r', 5)
                .style("stroke", "transparent")
                .style("stroke-width", "30px")
                .attr("alt", function (j) { return Math.max(j.value, 0) })
                .attr("cx", function (j, i) {
                    dataValues.push([
                        cfg.w / 2 * (1 - (parseFloat(Math.max(j.value, 0)) / cfg.maxValue) * cfg.factor * Math.sin(i * cfg.radians / total)),
                        cfg.h / 2 * (1 - (parseFloat(Math.max(j.value, 0)) / cfg.maxValue) * cfg.factor * Math.cos(i * cfg.radians / total))
                    ]);
                    return cfg.w / 2 * (1 - (Math.max(j.value, 0) / cfg.maxValue) * cfg.factor * Math.sin(i * cfg.radians / total));
                })
                .attr("cy", function (j, i) {
                    return cfg.h / 2 * (1 - (Math.max(j.value, 0) / cfg.maxValue) * cfg.factor * Math.cos(i * cfg.radians / total));
                })
                .attr("data-id", function (j) { return j.axis })
                .style("fill", cfg.color(this_aspect)).style("fill-opacity", 0)

                // node hover
                .on('mouseover', function (d) {
                    newX = parseFloat(d3.select(this).attr('cx')) - 10;
                    newY = parseFloat(d3.select(this).attr('cy')) - 5;

                    tooltip
                        .attr('x', newX)
                        .attr('y', newY)
                        .style('fill', 'grey')
                        .style('font-size', '15px')
                        .text(Format(d.value))
                        .transition(200)
                        .style('opacity', 1);

                    z = "polygon." + d3.select(this).attr("class");
                    g.selectAll("polygon")
                        .transition(200)
                        .style("fill-opacity", 0.1);
                    g.selectAll(z)
                        .transition(200)
                        .style("fill-opacity", .7);
                })
                .on('mouseout', function () {
                    tooltip
                        .transition(200)
                        .style('opacity', 0);
                    g.selectAll("polygon")
                        .transition(200)
                        .style("fill-opacity", cfg.opacityArea);
                })
                .append("svg:title")
                .text(function (j) { return Math.max(j.value, 0) });

            vertices
                .transition()
                .duration(2000)
                .style("fill-opacity", .9)

            series++;
        });
    }

    function draw_skeleton(data, label_lookup) {
        $("#error").hide();
        var input_text = 'читать';
        var index = label_lookup[input_text];

        if (index == undefined) {
            $("#error").show();
            return false;
        }

        var full_data = data[index];

        // data
        var d = []
        Object.keys(full_data.simple_data).forEach(function (aspect) {
            d.push(full_data.simple_data[aspect].data)
        })
        var id = '#chart'

        // formatting
        cfg = {
            radius: 5,
            w: 425,
            h: 425,
            factor: 1,
            factorLegend: .95,
            levels: 5,
            maxValue: 0.6,
            radians: 2 * Math.PI,
            opacityArea: 0.5,
            ToRight: 5,
            TranslateX: 80,
            TranslateY: 30,
            ExtraWidthX: 100,
            ExtraWidthY: 100,
            color: d3.scaleOrdinal()
                .domain([0, 1])
                .range(["#AF5BA6"])
        };

        // get max value to scale chart
        cfg.maxValue = Math.max(cfg.maxValue, d3.max(d, function (i) { return d3.max(i.map(function (o) { return o.value; })) }));
        // axis names
        var allAxis = (d[0].map(function (i, j) { return i.axis }));
        var total = allAxis.length;
        // calc radius length
        var radius = cfg.factor * Math.min(cfg.w / 2, cfg.h / 2);

        // initializing SVG
        d3.select(id).select("svg").remove();
        var g = d3.select(id)
            .append("svg")
            .attr("width", 1000)
            .attr("height", cfg.h + cfg.ExtraWidthY)
            .append("g")
            .attr("transform", "translate(" + (cfg.TranslateX + 0) + "," + cfg.TranslateY + ")");


        // drawing radar concentric axes
        for (var j = 0; j < cfg.levels; j++) {
            var levelFactor = cfg.factor * radius * ((j + 1) / cfg.levels);
            g.selectAll(".levels")
                .data(allAxis)
                .enter()
                .append("svg:line")
                .attr("x1", function (d, i) { return levelFactor * (1 - cfg.factor * Math.sin(i * cfg.radians / total)); })
                .attr("y1", function (d, i) { return levelFactor * (1 - cfg.factor * Math.cos(i * cfg.radians / total)); })
                .attr("x2", function (d, i) { return levelFactor * (1 - cfg.factor * Math.sin((i + 1) * cfg.radians / total)); })
                .attr("y2", function (d, i) { return levelFactor * (1 - cfg.factor * Math.cos((i + 1) * cfg.radians / total)); })
                .attr("class", "line")
                .style("stroke", "grey")
                .style("stroke-opacity", "0.75")
                .style("stroke-width", "0.3px")
                .attr("transform", "translate(" + (cfg.w / 2 - levelFactor) + ", " + (cfg.h / 2 - levelFactor) + ")");
        }
        series = 0;

        // drawing radar radial axes
        var axis = g.selectAll(".axis")
            .data(allAxis)
            .enter()
            .append("g")
            .attr("class", "axis");
        axis.append("line")
            .attr("x1", cfg.w / 2)
            .attr("y1", cfg.h / 2)
            .attr("x2", function (d, i) { return cfg.w / 2 * (1 - cfg.factor * Math.sin(i * cfg.radians / total)); })
            .attr("y2", function (d, i) { return cfg.h / 2 * (1 - cfg.factor * Math.cos(i * cfg.radians / total)); })
            .attr("class", "line")
            .style("stroke", "grey")
            .style("stroke-width", "1px");

        // labeling the radar vertices
        axis.append("text")
            .attr("class", "legend")
            .text(function (d) {
                var form = d.split(' ')[0]
                return form;
            })
            .attr("text-anchor", "middle")
            .attr("dy", "1.5em")
            .attr("fill", "gray")
            .attr("transform", function (d, i) { return "translate(0, -10)" })
            .attr("x", function (d, i) { return cfg.w / 2 * (1 - cfg.factorLegend * Math.sin(i * cfg.radians / total)) - 60 * Math.sin(i * cfg.radians / total); })
            .attr("y", function (d, i) { return cfg.h / 2 * (1 - Math.cos(i * cfg.radians / total)) - 20 * Math.cos(i * cfg.radians / total); });

    }
    $(document).ready(async function () {
        console.log("ready!");
        $.getJSON("aspectual_verb_data_3-09.json", function (data) {
            var previous_input = ''
            // create lookup from lemma to array number to avoid looping every time
            var label_lookup = new Object();
            for (var key in data) {
                var full_label = data[key]["pair"]
                if (full_label.includes('-')) {
                    full_label.split('-').forEach(function (label) {
                        label_lookup[label] = key;
                    })
                } else {
                    label_lookup[full_label] = key;
                }
            }
            // make_radar(data, label_lookup, 'simple')
            draw_skeleton(data, label_lookup);
            $("#simple").on("click", function () {
                make_radar(data, label_lookup, 'simple');
                $('#simple').css('display', 'none')
                $('#detailed').css('display', 'block')
                previous_input = $('#contentinput').val()
            });
            $('#detailed').on('click', function () {
                make_radar(data, label_lookup, 'detailed');
                $('#detailed').css('display', 'none')
                $('#simple').css('display', 'block')
                previous_input = $('#contentinput').val()
            })

            $('#contentinput').keydown(function (event) {
                let keyPressed = event.keyCode || event.which;
                // enter
                if (keyPressed === 13) {
                    if ($('#simple').css('display') == 'block') {
                        make_radar(data, label_lookup, 'simple')
                        $('#simple').css('display', 'none')
                        $('#detailed').css('display', 'block')
                        previous_input = $('#contentinput').val()

                    } else {
                        make_radar(data, label_lookup, 'detailed')
                        $('#detailed').css('display', 'none')
                        $('#simple').css('display', 'block')
                        previous_input = $('#contentinput').val()
                    }
                    event.preventDefault();
                }
                // space
                else if (keyPressed == 32) {
                    event.preventDefault()
                }
                else {
                    $('#detailed').css('display', 'none')
                    $('#simple').css('display', 'block')
                }
            });
        });
    });

    // Just execute "demo()" in the console to populate the input with sample HTML.
    window.demo = function () {
        var input_list = 'дерево';
        $("#contentinput").val(input_list);
    }

})(jQuery);