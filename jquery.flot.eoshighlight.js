/*
Flot plugin for showing "eyes on sticks" highlight visualization for tsbp
*/

(function ($) {
    var options = {
        series: {
            eoshighlight: false // whether line's points exhibit eoshighlight behaviour
        }
    };

    function init(plot) {
        var eosselectedseries;
        var eosselectedindexes = [];
        var eoshoveredseries;
        var eoshoveredindex;
        var placeholder = plot.getPlaceholder ();

        function onPlotHover (event , pos, item) {
            var ca_bbox = getContextArrowBBox (),
                offset = plot.getPlotOffset(),
                placeholder = plot.getPlaceholder(),
                placeholder_offset = placeholder.offset ();

            var offset_x = pos.pageX - ( offset.left + placeholder_offset.left );
            var offset_y = pos.pageY - ( offset.top + placeholder_offset.top );

            if (ca_bbox != null && offset_x >= ca_bbox.x0 && offset_x < ca_bbox.x1 && offset_y >= ca_bbox.y0 && offset_y < ca_bbox.y1) {
                plot.eosHover ();
                placeholder.css("cursor", "pointer");
            }
            else if (item == null) {
                plot.eosHover ();
                placeholder.css("cursor", "default");
            }
            else {
                plot.eosHover (item.series, item.dataIndex);
                if (item.series === eosselectedseries && $.inArray(item.dataIndex, eosselectedindexes) !== -1)
                    placeholder.css("cursor", "pointer");
                else
                    placeholder.css("cursor", "default");
            }
        }

        function onPlotClick (event , pos, item) {
            var ca_bbox = getContextArrowBBox (),
                offset = plot.getPlotOffset(),
                placeholder = plot.getPlaceholder(),
                placeholder_offset = placeholder.offset ();

            var offset_x = pos.pageX - ( offset.left + placeholder_offset.left );
            var offset_y = pos.pageY - ( offset.top + placeholder_offset.top );

            if (ca_bbox != null && offset_x >= ca_bbox.x0 && offset_x < ca_bbox.x1 && offset_y >= ca_bbox.y0 && offset_y < ca_bbox.y1) {
                // open a context menu
                return false;
            }
            else if (item == null) {
                plot.eosSelect ();
            }
            else {
                if (item.series === eosselectedseries && $.inArray(item.dataIndex, eosselectedindexes) !== -1) {
                    // open a context menu
                    return false;
                }
                else {
                    plot.eosSelect (item.series, item.dataIndex);
                }
            }
        }

        function onContextMenu(event) {
            var ca_bbox = getContextArrowBBox (),
                offset = plot.getPlotOffset(),
                placeholder = plot.getPlaceholder(),
                placeholder_offset = placeholder.offset ();

            var offset_x = event.pageX - ( offset.left + placeholder_offset.left );
            var offset_y = event.pageY - ( offset.top + placeholder_offset.top );

            var item = plot.findNearbyItem (offset_x, offset_y, function ( series ) { return series["clickable"] !== false });

            if (ca_bbox != null && offset_x >= ca_bbox.x0 && offset_x < ca_bbox.x1 && offset_y >= ca_bbox.y0 && offset_y < ca_bbox.y1) {
                // open a context menu
                return false;
            }
            else if (item != null) {
                plot.eosSelect (item.series, item.dataIndex);
                // open a context menu
                return false;
            }
        }

        function getContextArrowBBox () {
            if (!eosselectedindexes.length)
                // there ain't one
                return null;

            var point, bbox, x_midpoint, x_sum = 0, y_coord, outer_radius = eosselectedseries.points.radius + eosselectedseries.points.lineWidth*0.5;
            for (var i = 0; i < eosselectedindexes.length; i++) {
                point = eosselectedseries.datapoints.points.slice(eosselectedindexes[i] * eosselectedseries.datapoints.pointsize, (eosselectedindexes[i]+1) * eosselectedseries.datapoints.pointsize)
                x_sum += eosselectedseries.xaxis.p2c(point[0]);
            }
            x_midpoint = x_sum / eosselectedindexes.length;

            bbox = { x0: x_midpoint - eosselectedseries.points.radius, x1: x_midpoint + eosselectedseries.points.radius };

            if (bbox.x1 < 0 || bbox.x0 > plot.width())
                // off the side
                return null;

            if (eosselectedindexes.length > 1) {
                bbox.y0 = outer_radius;
                bbox.y1 = outer_radius*2;
            }
            else {
                // point should still be the last (& only) point
                y_coord = eosselectedseries.yaxis.p2c(point[1]);
                if (y_coord >= 3*outer_radius) {
                    // there's enough space to show an arrow normally
                    bbox.y0 = y_coord - 3*outer_radius;
                    bbox.y1 = y_coord - 2*outer_radius;
                }
                else if (y_coord >= 2*outer_radius) {
                    // there's enough space to show an arrow stuck to the top
                    bbox.y0 = 0;
                    bbox.y1 = outer_radius;
                }
                else if (y_coord >= outer_radius) {
                    // there's not really enough space - stick it to the top
                    // of the selected indicator and let it disappear off the top
                    bbox.y0 = y_coord - 2*outer_radius;
                    bbox.y1 = y_coord - outer_radius;
                }
                else
                    return null;
            }

            return bbox;
        }

        plot.eosSelect = function (s, pointindex_from, pointindex_to) {
            if (typeof s == "number")
                s = series[s];

            if (eosselectedseries === s &&
                pointindex_from == eosselectedindexes[0] &&
                pointindex_to == eosselectedindexes[1])
                // nothing to do
                return;

            eosselectedseries = s;
            eosselectedindexes = [];
            if (pointindex_from != null) {
                eosselectedindexes.push(pointindex_from);
                if (pointindex_to != null) {
                    eosselectedindexes.push(pointindex_from);
                }
            }
            placeholder.trigger ( "ploteosselected" , [ eosselectedseries , eosselectedindexes ] );
            plot.triggerRedrawOverlay();
        }

        plot.eosHover = function (s, pointindex) {
            if (typeof s == "number")
                s = series[s];

            if (eoshoveredseries === s && pointindex == eoshoveredindex)
                // nothing to do
                return;

            eoshoveredindex = pointindex;
            eoshoveredseries = s;

            placeholder.trigger ( "ploteoshovered" , [ eosselectedseries , eoshoveredindex ] );
            plot.triggerRedrawOverlay();
        }

        plot.hooks.bindEvents.push(function (plot, eventHolder) {
            var enabled = false;
            var series = plot.getData ();
            var s;
            for (var i = 0; i < series.length; i++) {
                s = series[i];
                if (s.eoshighlight) {
                    enabled = true;
                    break;
                }
            }
            if (!enabled)
                return;

            placeholder.on("plothover", onPlotHover);
            placeholder.on("plotclick", onPlotClick);
            eventHolder.on("contextmenu", onContextMenu);
        });

        plot.hooks.drawOverlay.push(function (plot, ctx) {
            if (eoshoveredindex == null && !eosselectedindexes.length)
                // nothing to draw
                return;

            var plotOffset = plot.getPlotOffset();
            var point, point_x, point_y, xaxis, yaxis, radius;
            var x, y;
            var ca_bbox = getContextArrowBBox ();

            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);

            if (eosselectedindexes.length) {
                radius = eosselectedseries.points.radius;
                ctx.lineWidth = eosselectedseries.points.lineWidth;
                ctx.strokeStyle = $.color.parse(eosselectedseries.color).toString();

                xaxis = eosselectedseries.xaxis;
                yaxis = eosselectedseries.yaxis;

                for (var i = 0; i < eosselectedindexes.length; i++) {
                    point = eosselectedseries.datapoints.points.slice(eosselectedindexes[i] * eosselectedseries.datapoints.pointsize, (eosselectedindexes[i]+1) * eosselectedseries.datapoints.pointsize);
                    if ( point[0] < xaxis.min || point[0] > xaxis.max || point[1] < yaxis.min || point[1] > yaxis.max )
                        continue;

                    x = xaxis.p2c(point[0]);
                    y = yaxis.p2c(point[1]);

                    ctx.beginPath();
                        ctx.arc(x, y, radius, 0.5 * Math.PI, 2.5 * Math.PI, false);
                        ctx.lineTo(x, plot.height());
                    ctx.closePath();

                    ctx.stroke();
                }

                if (ca_bbox != null) {
                    ctx.fillStyle = $.color.parse(eosselectedseries.color).toString();
                    ctx.beginPath();
                        ctx.moveTo(ca_bbox.x0, ca_bbox.y1);
                        ctx.lineTo((ca_bbox.x0 + ca_bbox.x1)*0.5, ca_bbox.y0);
                        ctx.lineTo(ca_bbox.x1, ca_bbox.y1);
                        ctx.lineTo(ca_bbox.x0, ca_bbox.y1);
                    ctx.closePath();

                    ctx.fill();
                }
            }

            if (eoshoveredindex != null) {
                radius = eoshoveredseries.points.radius;
                ctx.lineWidth = eoshoveredseries.points.lineWidth;
                ctx.strokeStyle = $.color.parse(eoshoveredseries.color).toString();
                ctx.fillStyle = $.color.parse(eoshoveredseries.color).toString();

                xaxis = eoshoveredseries.xaxis;
                yaxis = eoshoveredseries.yaxis;

                point = eoshoveredseries.datapoints.points.slice(eoshoveredindex * eoshoveredseries.datapoints.pointsize, (eoshoveredindex+1) * eoshoveredseries.datapoints.pointsize);
                if ( !(point[0] < xaxis.min || point[0] > xaxis.max || point[1] < yaxis.min || point[1] > yaxis.max ) ) {
                    x = xaxis.p2c(point[0]);
                    y = yaxis.p2c(point[1]);

                    ctx.beginPath();
                        ctx.arc(x, y, radius, 0.5 * Math.PI, 2.5 * Math.PI, false);
                    ctx.closePath();

                    ctx.fill();

                    ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, plot.height());
                    ctx.closePath();

                    ctx.stroke();
                }
            }

            ctx.restore();
        });

        plot.hooks.shutdown.push(function (plot, eventHolder) {
            placeholder.off("plothover", onPlotHover);
            placeholder.off("plotclick", onPlotClick);
            eventHolder.off("contextmenu", onContextMenu);
        });
    }
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'eoshighlight',
        version: '1.0'
    });
})(jQuery);