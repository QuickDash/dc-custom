var inflection = require('inflection'),
  dtip = require('d3-tip')(d3);
var dc = require('dc');
var formatters = require('qd-formatters')(d3);

var quickDefaults = function() {
  
  var original = {};

  original.barChart = dc.barChart;
  dc.barChart = function(parent, opts) {
    var _chart = original.barChart(parent);
    var _xLabel = '', _yLabel = '';

    _chart.xLabel = function(_) {
      if(!arguments.length) return _xLabel;
      _xLabel = _;
      return _chart;
    };

    _chart.yLabel = function(_) {
      if(!arguments.length) return _yLabel;
      _yLabel = _;
      return _chart;
    };

    function addLabelAxisX(displayText) {
      if(_chart.select('.x-axis-label').empty()) {
        _chart.svg()
        .append("text")
        .attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", _chart.width() / 2)
        .attr("y", _chart.height())
        .text(displayText);
      }
      
    }

    function addLabelAxisY(displayText) {
      if(_chart.select('.y-axis-label').empty()) {
        _chart.svg()
        .append("text")
        .attr("class", "axis-label y-axis-label")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", 2)
        .attr("x",-4)
        .attr("dy", ".625em")
        .text(displayText);
      }
      
    }

    _chart.on('preRedraw', function() {
      if(_xLabel !== '') {
        addLabelAxisX(_xLabel);
      }
      if(_yLabel !== '') {
        addLabelAxisY(_yLabel);
      }
    });
    _chart.renderTitle(false);

    return _chart;
  };

  original.rowChart = dc.rowChart;
  dc.rowChart = function(parent, opts) {
    var _chart = original.rowChart(parent);
    var _tickFormatFunc = function(d) {return formatters.numberFormat(d)};
    _chart.tickFormatFunc = function(_) {
      if(!arguments.length) return _tickFormatFunc;
      _tickFormatFunc = _;
      return _chart;
    };

    _chart.elasticX(true);
    _chart.renderTitle(false);
    _chart.xAxis().tickFormat(_tickFormatFunc);

    return _chart;
  };

  original.pieChart = dc.pieChart;
  dc.pieChart = function(parent, opts) {
    var _chart = original.pieChart(parent);
    var _centerTitle = '';
    _chart.centerTitle = function(_) {
      if(!arguments.length) return _centerTitle;
      _centerTitle = _;
      return _chart;
    };

    var renderletFunc = function() {
      if(opts && opts.renderletFunc) {
        opts.renderletFunc();
      }

      if(_centerTitle !== '') {
        var labelRoot = d3.select(parent + ' svg g');
        if(labelRoot.select('text.center-label').empty()) {

          if(!Array.isArray(_centerTitle)) {
            labelRoot.append('svg:text')
              .attr('class', 'center-label')
              .text(_centerTitle);
          }
          else {
            _centerTitle.forEach(function(text, index) {
              labelRoot.append('svg:text')
                .attr('class', 'center-label')
                .attr('dy', index + 'em')
                .text(text);
            });
          }

        }
      }
    };

    _chart.renderlet(renderletFunc);
    _chart.renderTitle(false);
    _chart.renderLabel(false)

    return _chart;
  };

  original.geoChoroplethChart = dc.geoChoroplethChart;
  dc.geoChoroplethChart = function(parent, opts) {
    var _chart = original.geoChoroplethChart(parent);
    var _lookupTable = {}, _labelLookupKey = 'id';

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

    _chart.label(function(d) {
      if(Object.keys(_lookupTable).length !== 0) {
        var lookupRow = _lookupTable[d.key]
        if(lookupRow !== undefined) {
          return lookupRow[_labelLookupKey];
        }
        return d.key;
        
      }
      return d.key;
      
    });
    //Add zoom markup
    _chart.root().append("div").classed("zoomControlsContainer", true);
    _chart.root().select(".zoomControlsContainer").append("div").classed("zoomButton", true);
    _chart.root().select(".zoomControlsContainer").append("div").classed("resetZoomButton", true);

    //Defaults for colors and data
    var _colorRange = ["#a9c8f4", "#7fa1d2", "#5479b0", "#2a518e", "#002A6C"];
    var _zeroColor = '#ccc';
    var _colorLegend = false;

    var _colorDomainFunc = function() { 
      return [d3.min(_chart.group().all(), function(d){return d.value}),
     d3.max(_chart.group().all(), function(d){return d.value})];
    };

    _chart.colorDomainFunc = function(_) {
      if(!arguments.length) return _colorDomainFunc;
      _colorDomainFunc = _;
      return _chart;
    };

    _chart.colorRange = function(_) {
      if(!arguments.length) return _colorRange;
      _colorRange = _;
      return _chart;
    };

    _chart.zeroColor = function(_) {
      if(!arguments.length) return _zeroColor;
      _zeroColor = _;
      return _chart;
    };

    _chart.colorLegend = function(_) {
      if(!arguments.length) return _colorLegend;
      _colorLegend = _;
      return _chart;
    }

    var colorCalculatorFunc = function (d) {
      if(d === undefined) return _zeroColor;
      if(d < 1 )return _zeroColor;
      return _chart.colors()(d); 
    };

    var legendablesFunc = function() {
      //legendables are a list of objects in the format {name: name, data: data, chart: chart, color: color}
      var colorList = _chart.colorRange().slice();
      colorList.unshift(_chart.zeroColor());

      //map the min/max values corresponding to each color
      colorList = colorList.map(function(color) {
        //Mark the color for countries that have the zeroColor()
        if(color === _chart.zeroColor()) return {color: color, min: null, max: null};

        //get all of the country values that match the current color
        var matchingValues = _chart.data().filter(function(country) { return _chart.getColor(country.value) === color;}).map(function(country) { return country.value;});
        
        //Mark the color if it doesn't apply to any countries
        if(!matchingValues.length) return {color: color, min: undefined, max: undefined};

        //Otherwise mark the min/max country values that use this color
        return {color: color, min: d3.min(matchingValues), max: d3.max(matchingValues)};
      });

      //transform the min/max values into the labels for each color
      colorList = colorList.map(function(c, index) {
        if(c.min === undefined) { //
          var noCountryLabel = "No Countries between " + formatters.bigCurrencyFormat(colorList[index-1].max) + " and " + formatters.bigCurrencyFormat(colorList[index+1].min);
          return {color: c.color, label: noCountryLabel};
        }
        else if(c.min === null) { //
          return {color: c.color, label: "No Data"}
        }
        else {
          return {color: c.color, label: formatters.bigCurrencyFormat(c.min) + " to " + formatters.bigCurrencyFormat(c.max)};
        }
      });
      
      //Return the final array of legendables
      return colorList.map(function(c) { return {name: c.label, data: undefined, chart: _chart, color: c.color}}).reverse();
    };

    _chart.colors(d3.scale.quantize().range(_colorRange))
      .colorCalculator(colorCalculatorFunc)
      .projection(d3.geo.mercator())
      .enableZoom(true)
      .afterZoom(function(g, s){
        g.selectAll('.country').selectAll('path').style('stroke-width',0.75 / s + 'px');
      })
      .on("preRender", function() {
        _chart.colorDomain(_colorDomainFunc());

        if(_colorLegend === true) {
          _chart.legendables = legendablesFunc;
          _chart.legend(dc.legend().x(20).y(_chart.getDynamicHeight() - 150).itemHeight(12).gap(2));
        }
      })
      .on("preRedraw", function() {
        _chart.colorDomain(_colorDomainFunc());
      });

    return _chart;
  };

  original.geoBubbleOverlayChart = dc.geoBubbleOverlayChart;
  dc.geoBubbleOverlayChart = function(parent, opts) {
    var _chart = original.geoBubbleOverlayChart(parent);
    var _lookupTable = {}, _labelLookupKey = 'id', _radiusValueModifier = 1;

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

    _chart.label(function(d) {
      if(Object.keys(_lookupTable).length !== 0) {
        var lookupRow = _lookupTable[d.key]
        if(lookupRow !== undefined) {
          return lookupRow[_labelLookupKey];
        }
        return d.key;
        
      }
      return d.key;
      
    });

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
        var r = Math.sqrt(d.value/_radiusValueModifier); //separate radius values more with sqrt curve
        if (r < 0) return 0;
        return Math.abs(r);
      });

    return _chart;
  };

  return dc;
};

module.exports = quickDefaults;