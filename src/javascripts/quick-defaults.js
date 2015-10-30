var inflection = require('inflection'),
  dtip = require('d3-tip')(d3);
var dc = require('dc');

var quickDefaults = function() {
  
  var original = {};

  original.rowChart = dc.rowChart;
  dc.rowChart = function(parent, opts) {
    var _chart = original.rowChart(parent);

    _chart.elasticX(true);

    return _chart;
  };

  original.pieChart = dc.pieChart;
  dc.pieChart = function(parent, opts) {
    var _chart = original.pieChart(parent);
    var _options = {};
    _chart.options = function(_) {
      if(!arguments.length) return _options;
      _options = _;
      return _chart;
    };

    var renderletFunc = function() {
      if(opts && opts.renderletFunc) {
        opts.renderletFunc();
      }

      if(_options && _options.centerTitle) {
        var labelRoot = d3.select(parent + ' svg g');
        if(labelRoot.select('text.center-label').empty()) {
          labelRoot.append('svg:text')
            .attr('class', 'center-label')
            .text(_options.centerTitle);
        }
      }
    };

    _chart.renderlet(renderletFunc);
    _chart.renderLabel(false);

    return _chart;
  };

  original.geoChoroplethChart = dc.geoChoroplethChart;
  dc.geoChoroplethChart = function(parent, opts) {
    var _chart = original.geoChoroplethChart(parent);

    //Add zoom markup
    _chart.root().append("div").classed("zoomControlsContainer", true);
    _chart.root().select(".zoomControlsContainer").append("div").classed("zoomButton", true);
    _chart.root().select(".zoomControlsContainer").append("div").classed("resetZoomButton", true);

    //Defaults for colors and data
    var _colorRange = ["#a9c8f4", "#7fa1d2", "#5479b0", "#2a518e", "#002A6C"];
    var _zeroColor = '#ccc';

    var colorDomainFunc = function() { 
      return [d3.min(_chart.group().all(), function(d){return d.value}),
     d3.max(_chart.group().all(), function(d){return d.value})];
    };

    var colorCalculatorFunc = function (d) {
      if(d === undefined) return _zeroColor;
      if(d < 1 )return _zeroColor;
      return _chart.colors()(d); 
    };

    _chart.colors(d3.scale.quantize().range(_colorRange))
      .colorCalculator(colorCalculatorFunc)
      .projection(d3.geo.mercator())
      .enableZoom(true)
      .afterZoom(function(g, s){
        g.selectAll('.country').selectAll('path').style('stroke-width',0.75 / s + 'px');
      })
      .on("preRender", function() {
        _chart.colorDomain(colorDomainFunc());
      })
      .on("preRedraw", function() {
        _chart.colorDomain(colorDomainFunc());
      });

    return _chart;
  };

  original.geoBubbleOverlayChart = dc.geoBubbleOverlayChart;
  dc.geoBubbleOverlayChart = function(parent, opts) {
    var _chart = original.geoBubbleOverlayChart(parent);
    var _lookupTable = {}, _labelLookupKey = 'id', _radiusValueModifier = 10000000;

    _chart.lookupTable = function(keyColumn, valueColumns, data) {
      if(!arguments.length) return _lookupTable;

      data.forEach(function(row) {
        var key = row[keyColumn];
        var values = {};
        valueColumns.forEach(function(columnName) {
          values[columnName] = row[columnName];
        });
        _lookupTable[key] = values;
      });

      return _chart;
    };

    _chart.labelLookupKey = function(_) {
      if(!arguments.length) return _labelLookupKey;
      _labelLookupKey = _;
      return _chart;
    };

    _chart.radiusValueModifier = function(_) {
      if(!arguments.length) return _radiusValueModifier;
      _radiusValueModifier = _;
      return _chart;
    };

    _chart
      .projection(d3.geo.mercator())
      .bubbleLabel(function(d) { return _chart.keyAccessor()(d)})
      .renderTitle(false)
      .radiusValueAccessor(function(d){
        var r = Math.sqrt(d.value/_radiusValueModifier);
        if (r < 0) return 0;
        return Math.abs(r);
      });

    return _chart;
  };

  return dc;
};

module.exports = quickDefaults;