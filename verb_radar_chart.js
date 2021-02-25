(function ($) {
    async function make_radar(data, lemma_lookup, complexity) {
        $("#error").hide();
        var input_text = $("#contentinput").val();
        var index = lemma_lookup[input_text];

        if (index == undefined) {
            $("#output").hide();
            $("#error").show();
            return false;
        }

        var radar_data = data[index];

        $("#lemma").text(input_text);
        $("#lemma-text").css('color', 'black');
        $("#output").show();

        if (complexity == 'simple') {
            // data
            var chart_data = [
                radar_data.data[0].axes
            ]
        } else {
            var chart_data = [
                radar_data.detailed_data[0].axes
            ]
        }
        // get totals
        var total = 0;
        for (var val in chart_data[0]) {
            total += chart_data[0][val]["value"];
        }
        $("#total").text(total);

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
        var Format = d3.format("");

        // get max value to scale chart
        cfg.maxValue = Math.max(cfg.maxValue, d3.max(chart_data, function (i) { return d3.max(i.map(function (o) { return o.value; })) }));

        // axis names
        var allAxis = (chart_data[0].map(function (i, j) {
            return i.axis
        }));
        // set aspect
        var aspect = radar_data.clancy.aspect;
        $("#aspect").text(aspect);
        $("#aspect-text").css('color', 'black');

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
            .attr("transform", "translate(" + (cfg.TranslateX + 250) + "," + cfg.TranslateY + ")");
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
                if (d.includes('conjugated')) {
                    var example = d.split('conjugated ')[1]
                    if (aspect == 'imperfective') {
                        var new_label = 'present ' + example
                    } else {
                        var new_label = 'future ' + example
                    }
                } else {
                    var new_label = d
                }
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
                var thisForm = d3.select(this).text();
                var thisVal = '-'
                Object.keys(chart_data[0]).forEach(function (index) {
                    if (chart_data[0][index].axis == thisForm) {
                        thisVal = chart_data[0][index].value;
                    } else if (chart_data[0][index].axis.includes('conjugated')) {
                        if (thisForm.includes('present') || thisForm.includes('future')) {
                            thisVal = chart_data[0][index].value;
                        }
                    }
                })

                newX = parseFloat(d3.select(this).attr('x')) - 10;
                newY = parseFloat(d3.select(this).attr('y')) + 35;

                tooltip
                    .attr('x', newX)
                    .attr('y', newY)
                    .text(thisVal)
                    .style('fill', '#AF5BA6')
                    .transition(200)
                    .style('opacity', 1);
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
        chart_data.forEach(function (y, x) {
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
                .style("stroke", cfg.color(series))
                .attr('points', function (d) {
                    var center = cfg.w / 2;
                    var str = "";
                    for (var pti = 0; pti < d.length; pti++) {
                        str = str + center + "," + center + " ";
                    }
                    return str;
                })
                .style("fill", function (j, i) { return cfg.color(series) })
                .style("fill-opacity", cfg.opacityArea)
                // polygon hover
                .on('mouseover', function (d) {
                    z = "polygon." + d3.select(this).attr("class");
                    g.selectAll("polygon")
                        .transition(200)
                        .style("fill-opacity", 0.1);
                    g.selectAll(z)
                        .transition(200)
                        .style("fill-opacity", .7);
                })
                .on('mouseout', function () {
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
        chart_data.forEach(function (y, x) {
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
                .style("fill", cfg.color(series)).style("fill-opacity", 0)

                // node hover
                .on('mouseover', function (d) {
                    newX = parseFloat(d3.select(this).attr('cx')) - 10;
                    newY = parseFloat(d3.select(this).attr('cy')) - 5;

                    tooltip
                        .attr('x', newX)
                        .attr('y', newY)
                        .style('fill', 'black')
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

    function draw_skeleton(data, lemma_lookup) {
        $("#error").hide();
        var input_text = 'читать';
        var index = lemma_lookup[input_text];

        if (index == undefined) {
            $("#output").hide();
            $("#error").show();
            return false;
        }

        var radar_data = data[index];
        $("#lemma-text").css('color', 'white');
        $("#aspect-text").css('color', 'white');
        $("#output").show();

        // data
        var d = [
            radar_data.data[0].axes
        ]
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
            .attr("transform", "translate(" + (cfg.TranslateX + 250) + "," + cfg.TranslateY + ")");


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
        $("#output").hide();
        $.getJSON("all-data_2-24.json", function (data) {
            var previous_input = ''

            // create lookup from lemma to array number to avoid looping every time
            var lemma_lookup = new Object();
            for (var key in data) {
                var lemma = data[key]["lemma"]
                lemma_lookup[lemma] = key;
            }
            draw_skeleton(data, lemma_lookup);
            $("#simple").on("click", function () { 
                make_radar(data, lemma_lookup, 'simple');
                $('#simple').css('display', 'none')
                $('#detailed').css('display', 'block')
                previous_input = $('#contentinput').val()
             });
            $('#detailed').on('click', function () { 
                make_radar(data, lemma_lookup, 'detailed'); 
                $('#detailed').css('display', 'none')
                $('#simple').css('display', 'block')
                previous_input = $('#contentinput').val()
            })

            $('#contentinput').keydown(function (event) {
                let keyPressed = event.keyCode || event.which;
                // enter
                if (keyPressed === 13) {
                    if ($('#simple').css('display') == 'block') {
                        make_radar(data, lemma_lookup, 'simple')
                        $('#simple').css('display', 'none')
                        $('#detailed').css('display', 'block')
                        previous_input = $('#contentinput').val()
                        
                    } else {
                        make_radar(data, lemma_lookup, 'detailed')
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