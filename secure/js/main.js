// global variables
var activeMunicipalityName = "";
var activeMunicipalityCode = "ALL";
var activeBarangayName = "";
var activeBarangayCode = "ALL";

var shownSurveysCount = 0;

var analysisPlan = [];

var surveyData = [];
var visibleFeatures = {
 	"type": "FeatureCollection",
 	"features": []
};


var color12 = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#cab2d6",
  "#6a3d9a",
  "#ffff99",
  "#b15928"
];

// comma seperator for thousands
var formatCommas = d3.format(",");



function projectPoint(x, y) {
  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}
var transform = d3.geo.transform({point: projectPoint}),
    path = d3.geo.path().projection(transform);


//setup Leaflet map
var windowHeight = $(window).height();
$("#map").height(windowHeight);
$("#infoWrapper").height(windowHeight);

var mapAttribution = '<a href="https://www.mapbox.com/" target="_blank">Mapbox</a> | Base map data &copy; <a href="http://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a> | &copy; <a href="http://redcross.org" title="Red Cross" target="_blank">Red Cross</a> 2014, CC-BY | <a title="Disclaimer" onClick="showDisclaimer();">Disclaimer</a>';
var HOTAttribution = 'Base map data &copy; <a href="http://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a> | Map style by <a href="http://hot.openstreetmap.org" target="_blank">H.O.T.</a> | &copy; <a href="http://redcross.org" title="Red Cross" target="_blank">Red Cross</a> 2014, CC-BY | <a title="Disclaimer" onClick="showDisclaimer();">Disclaimer</a>';

var mapboxStreetsUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.hmki3gmj/{z}/{x}/{y}.png',
  mapboxTerrainUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.hc5olfpa/{z}/{x}/{y}.png',
  greyscaleUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.i4d2d077/{z}/{x}/{y}.png',
  hotUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  mapboxSatUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.inlanejo/{z}/{x}/{y}.png';
var mapboxStreets = new L.TileLayer(mapboxStreetsUrl, {attribution: mapAttribution, maxZoom: 20}),
  mapboxTerrain = new L.TileLayer(mapboxTerrainUrl, {attribution: mapAttribution, maxZoom: 20}),
  greyscale = new L.TileLayer(greyscaleUrl, {attribution: mapAttribution, maxZoom: 20}),
  hot = new L.TileLayer(hotUrl, {attribution: HOTAttribution, maxZoom: 20}),
  mapboxSat = new L.TileLayer(mapboxSatUrl, {attribution: mapAttribution, maxZoom: 17});

var map = new L.Map("map", {
	center: [11.1198, 124.8940],
	zoom: 10,
	minZoom: 9,
	zoomControl: false,
  // scrollWheelZoom: false,
  	layers: [hot]
});


var mappedHeatPoints = [];
var heatLayer = new L.heatLayer(mappedHeatPoints).addTo(map);

var baseMaps = {
	"Grey": greyscale,
	"Streets": mapboxStreets,
	"Terrain": mapboxTerrain,
	"HOT": hot,
  "Mapbox satellite": mapboxSat
};

L.control.layers(baseMaps).addTo(map);

// Add our Leaflet zoom control manually where we want it
var zoomControl = L.control.zoom({
    position: 'topleft'
});
map.addControl(zoomControl);

// Add our loading control in the same position and pass the
// zoom control to attach to it
var loadingControl = L.Control.loading({
    position: 'topleft',
    zoomControl: zoomControl
});
map.addControl(loadingControl);



// initialize the SVG layer for D3 drawn survey points
map._initPathRoot()

// pick up the SVG from the map object
var svg = d3.select("#map").select("svg");
// var municipalityGroup = svg.append('g').attr("id", "municipalities");
// var barangayGroup = svg.append('g').attr("id", "barangays");
var markersGroup = svg.append('g').attr("id", "markers");



function getSurveyData(){
	d3.csv("data/SurveyData.csv", function(data){
		surveyData = data;
    // add a LatLng object to each item in the dataset
    surveyData.forEach(function(d) {
      d.LatLng = new L.LatLng(d.GPS_latitude,d.GPS_longitude);
    });
    // add a circle to the svg markers group for each survey point
    var mappedMarkers = markersGroup.selectAll("circle")
      .data(surveyData)
      .enter().append("circle").attr("r", 4).attr('stroke','#222222')
      .attr("fill", "#ed1b2e")
      .style('display','inline')
      .attr('class','mappedMarkers')
      .on("click",clickedMarker);
    // when map view changes adjust the locations of the svg circles
    function updatemarker(){
      mappedMarkers.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
      mappedMarkers.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
    }
    map.on("viewreset", updatemarker);
    updatemarker();
    setupSurveyAnalysis();
  });
}

function setupSurveyAnalysis(){
  d3.csv("data/analysis_plan.csv", function(data){
    analysisPlan = data;
    var categoryList = [];
    $.each(analysisPlan, function(index, analyzeThis){
      if($.inArray(analyzeThis["Category"], categoryList) === -1){
        categoryList.push(analyzeThis["Category"]);
      }
    });
    categoryList = categoryList.sort();
    for(var i = 0; i < categoryList.length; i++) {
      var item = categoryList[i];
      var questionsListSectionHtml = '<h4>' + item + '</h4>' + '<div id="modal-questions-options-' + item.replace(/\s+/g, '') + '"></div>';
      $('#modal-questions-options').append(questionsListSectionHtml);
    }
    $.each(analysisPlan, function(index, analyzeThis){
      var dataDescription = analyzeThis["Data Description"];
      var variableName = analyzeThis["Variable Name"];
      var questionsListItemHtml = '<a class="modal-questions-link" id="modal-question-'+ variableName +'" href="#" onClick="return false;">' + dataDescription + "</a><br>";
      var questionSelector = "#modal-questions-options-" + analyzeThis["Category"];
      $(questionSelector).append(questionsListItemHtml);
    });
  buildMunicipalityDropdown();
  });
}



function buildMunicipalityDropdown() {
  // get list of muncipalities from survey data
  var municipalityList = [];
  var municipalityAdminLookup = {};
  $.each(surveyData, function(index, survey){
    var thisMunicipality = survey["municipalityname"];
    if($.inArray(thisMunicipality, municipalityList) === -1){
      municipalityList.push(thisMunicipality);
      municipalityAdminLookup[thisMunicipality] = survey["Mun_Code"];
    }
  });
  // sort so that the admins appear in alphabetical order in dropdown
  municipalityList = municipalityList.sort();
  // create item elements in dropdown list
  for(var i = 0; i < municipalityList.length; i++) {
      var item = municipalityList[i];
      var listItemHtml = '<li><a id="'+ municipalityAdminLookup[item] +'" href="#" onClick="municipalitySelect(' +"'"+ municipalityAdminLookup[item] +"'"+ '); return false;">' + item + "</a></li>"
      $('#dropdown-menu-municipality').append(listItemHtml);
  }
  $("#selected-survey-count").html(formatCommas(surveyData.length.toString()));
  $("#loading").fadeOut(300);
  filterMap();
}



function openQuestionsModal(modalType){
  var modalType = modalType;
  d3.selectAll('.modal-questions-link')
  .each(function(d){
    var variableName = d3.select(this).attr('id').slice(15);
    var clickFunction = modalType + "('" + variableName + "', this)";
    d3.select(this).attr('onClick', clickFunction);
  });
  $('#modal-questions').modal('show');
}


//global variables
var possibleFillAnswers = [];
var activeFilterVariable = "";

function fillQuestionSelect(variableSelected, listItem){
  activeFilterVariable = variableSelected;
  $('#modal-questions').modal('hide');
  $("#legend-fill").empty();
  $("#legend-fill-title").html($(listItem).html());
  possibleFillAnswers = [];
  $.each(surveyData, function(index, survey){
    if($.inArray(survey[variableSelected], possibleFillAnswers) === -1){
      possibleFillAnswers.push(survey[variableSelected]);
    }
  });
  // ugh, recode things so first 2 characters are 0-, 1-, 2-... so can sort possible answers
  // then trim first 2 characters??? hacky as hell
  possibleFillAnswers.sort();
  var selectorList = [];
  $.each(possibleFillAnswers, function(index, answer){
    var selector = "colorPicker" + index;
    selectorList.push(selector);
    var thisHtml ='<div data-fillanswer="' + answer + '"><span id="' + selector +
      '" class="fillColorBox clickable"></span>' + answer + '</div>';
    $("#legend-fill").append(thisHtml);
  });
  // color legend
  d3.selectAll("#legend-fill span").style("background-color", function(d, i) {
    return color12[i];
  });


  // add colorPicker to each of the fillColorBox 
  $.each(selectorList, function(index, colorBox){
    var formattedSelector = "#" + colorBox;
    var presetColor = d3.select(formattedSelector).style("background-color");
    $(formattedSelector).spectrum({
      showPaletteOnly: true,
      showPalette:true,
      hideAfterPaletteSelect:true,
      color: presetColor,
      change: function(color) {
        d3.select(this).style("background-color", color);
        colorMarkersFromLegend();
      },
      // palette includes the color12 used in initial setting of marker color
      // plus additional colors, here it needs to be formatted as seperate arrays
      // for the different rows, otherwise would use the same variable for both
      palette: [
        ["#a6cee3","#1f78b4","#b2df8a","#33a02c"],
        ["#fb9a99","#e31a1c","#fdbf6f","#ff7f00"],
        ["#cab2d6","#6a3d9a","#ffff99","#b15928"],
        ["#8dd3c7","#ffffb3","#bebada","#fb8072"],
        ["#80b1d3","#fdb462","#b3de69","#fccde5"],
        ["#bc80bd","#ccebc5","#ffed6f","#ffffff"],
        ["#d9d9d9","#969696","#525252","#000000"] 
      ]
    });
  });
  colorMarkersFromLegend();
}

function colorMarkersFromLegend(){
  // color markers on map based on legend colors
  $(possibleFillAnswers).each(function(index, answer){
    var filtered = markersGroup.selectAll("circle")
      .filter(function(d) { return d[activeFilterVariable] === answer });
    var colorSearch = "[data-fillanswer='" + answer + "']";
    var color = $(colorSearch).children().css("background-color");
    var colorHex = d3.rgb(color).toString();
    filtered.attr("fill", colorHex);
  });
}

function setLegendColor(){
  console.log("now it gets interesting");
}


function heatQuestionSelect(variableSelected, listItem){
  map.removeLayer(heatLayer);
  $('#modal-questions').modal('hide');
  $("#legend-heat").empty();
  $("#legend-heat-title").html($(listItem).html());
  var possibleHeatAnswers = [];
  $.each(surveyData, function(index, survey){
    if($.inArray(survey[variableSelected], possibleHeatAnswers) === -1){
      possibleHeatAnswers.push(survey[variableSelected]);
    }
  });
  // ugh, recode things so first 2 characters are 0-, 1-, 2-... so can sort possible answers
  // then trim first 2 characters??? hacky as hell
  possibleHeatAnswers.sort();
  $.each(possibleHeatAnswers, function(index, answer){
    var thisHtml ='<div class="legend-heat-option" onClick="toggleHeat(this)"' +
      'data-heatvariable="' + variableSelected + '" ' +
      'data-heatanswer="' + answer + '"><span class="heatColorBox"></span>' + answer + '</div>';
    $("#legend-heat").append(thisHtml);
  });
}

function toggleHeat(clicked){
  if($(clicked).hasClass("heatMapped") === false){
    d3.selectAll(".legend-heat-option").classed("heatMapped", false);
    $(clicked).addClass("heatMapped");
    setHeat();

  } else {
    d3.selectAll(".legend-heat-option").classed("heatMapped", false);
    setHeat();
  }
}

function setHeat(){
  if($(".legend-heat-option.heatMapped").length == 1){
    // add heat map
    var thisAnswer = $(".legend-heat-option.heatMapped").attr("data-heatanswer");
    var thisVariable = $(".legend-heat-option.heatMapped").attr("data-heatvariable");
    var mappedHeatPoints = [];
    markersGroup.selectAll("circle")
      .filter(function(d) {return this.style.display == 'inline'})
      .filter(function(d) {return d[thisVariable] == thisAnswer})
      .each(function(d){ mappedHeatPoints.push(d.LatLng); });
    heatLayer.setLatLngs(mappedHeatPoints);
    heatLayer.addTo(map);
  } else {
    map.removeLayer(heatLayer);
  }
}

var filterCount = 0;

function filterQuestionSelect(variableSelected, listItem){
  filterCount ++;
  $('#modal-questions').modal('hide');
  var filterQuestionId = "F" + filterCount.toString();
  var thisHtml = '<div id="' + filterQuestionId + '" class="filterQuestionBox">' +
    '<div>' + $(listItem).html() +
    ' <button type="button" onClick="removeThisFilter('+ "'" + filterQuestionId + "'" +
    ');" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-remove"></span></button>'+
    '<div class="filterOptionGroup">';
  var possibleFilterAnswers = [];
  $.each(surveyData, function(index, survey){
    if($.inArray(survey[variableSelected], possibleFilterAnswers) === -1){
      possibleFilterAnswers.push(survey[variableSelected]);
    }
  });
  // ugh, recode things so first 2 characters are 0-, 1-, 2-... so can sort possible answers
  // then trim first 2 characters??? hacky as hell
  possibleFilterAnswers.sort();
  $.each(possibleFilterAnswers, function(index, answer){
    thisHtml += '<div class="legend-filter-option" onClick="toggleFilter(this)"' +
      'data-filtervariable="' + variableSelected + '" ' +
      'data-filteranswer="' + answer + '"><span class="filterColorBox"></span>' + answer +
      '</div>';
  });
  thisHtml += '</div></div>';
  $("#legend-filters").append(thisHtml);

}

function removeThisFilter(thisID){
  var removeSelector = "#" + thisID;
  $(removeSelector).remove();
  filterMap();
}

function toggleFilter(clicked){
  $(clicked).toggleClass("filterMapped");
  filterMap();

}




function uniformMarkerFill(){
  $("#legend-fill").empty();
  $("#legend-fill-title").empty();
  markersGroup.selectAll("circle").attr("fill", "#ed1b2e");
}

function noHeatMap(){
  $("#legend-heat").empty();
  $("#legend-heat-title").empty();
  map.removeLayer(heatLayer);
}

function removeAllFilters(){
  $("#legend-filters").empty();
  filterMap();
}

function resetAdmin() {
  activeMunicipalityCode = "ALL";
  activeBarangayCode = "ALL";
  activeMunicipality = "";
  activeBarangay = "";
  $('#dropdown-menu-barangay').html('<li class="disabled"><a role="menuitem" href="#">First select a municipality</a></li>');
  $("#selected-admin-label").html("All surveyed areas");
  filterMap();
}



function municipalitySelect(p2){
  activeMunicipalityCode = p2;
  activeBarangayCode = "ALL";

  var selector = "#" + p2;
  activeMunicipalityName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName);

  //build barangay dropdown
  $('#dropdown-menu-barangay').empty();
  var barangayList = [];
  var barangayAdminLookup = {};
  $.each(surveyData, function(index, survey){
    if(survey["Mun_Code"] === activeMunicipalityCode){
      var thisBarangay = survey["barangayname"];
      if($.inArray(thisBarangay, barangayList) === -1){
        barangayList.push(thisBarangay);
        barangayAdminLookup[thisBarangay] = survey["Bar_Code"];
      }
    }
  });
  // sort so that they appear in alphabetical order in dropdown
  barangayList = barangayList.sort();
  // create item elements in dropdown list
  for(var i = 0; i < barangayList.length; i++) {
      var item = barangayList[i];
      var listItemHtml = '<li><a id="'+ barangayAdminLookup[item] +'" href="#" onClick="barangaySelect(' +"'"+ barangayAdminLookup[item] +"'"+ '); return false;">' + item + "</a></li>";
      $('#dropdown-menu-barangay').append(listItemHtml);
  }

  filterMap();
}


function barangaySelect(p3) {
  activeBarangayCode = p3;
  var selector = "#" + p3;
  activeBarangayName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName + ", "+ activeBarangayName);

  filterMap();
}


function mapToBounds(){
  // visible markers FeatureCollection updated inside FilterMap function
  // get bounds of all visible markers
  var bounds = d3.geo.bounds(visibleFeatures);
  // reformat bounds arrays for compatibility with Leaflet and fit map to bounds
  var padding = {"padding":[0,0]};
  map.fitBounds([[Number(bounds[1][1]), Number(bounds[1][0])], [Number(bounds[0][1]), Number(bounds[0][0])]], padding);
}


function filterMap(){
  // d3 can get geo bounds of a FeatureCollection
  // empty the FeatureCollection to be ready to update it
  visibleFeatures.features = [];
  //this function converts from the imported csv data to geojson for adding point to FeatureCollection
  function markerToJSON(input){
    var thisPoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
          "coordinates": [
            input.GPS_longitude,
            input.GPS_latitude
          ]
      }
    };
    visibleFeatures.features.push(thisPoint);
  }

  var conductedSurveyCount = 0;
  // hide all markers
  markersGroup.selectAll("circle").style('display', 'none');
  // add class to be used for filtering and showing markers in Admin selection
  // active admin codes are global variables set when the selections are made from admin dropdowns
  markersGroup.selectAll("circle").each(function(d){
    d3.select(this).classed({'inAdmin':false, 'inFilters':false});
    if(d["Mun_Code"] == activeMunicipalityCode || activeMunicipalityCode == "ALL"){
      if(d["Bar_Code"] == activeBarangayCode || activeBarangayCode == "ALL"){
        d3.select(this).classed('inAdmin', true);
        conductedSurveyCount ++;
      }
    }
  });
  // update HTML on page showing survey count for selected admin area
  $("#conductedForAreaCount").html(formatCommas(conductedSurveyCount));

  //show only those in selected admin area
  markersGroup.selectAll("circle")
    .filter(function(d) { return d3.select(this).classed("inAdmin"); })
    .style('display', 'inline')
    // add geojson points to FeatureCollection for all visible markers for mapToBounds (Fit Bounds button)
    .each(function(d){ markerToJSON(d) });


  // apply any filters
  // remove class .filteredOut from all markers and
  // add back in as necessary
  // .filteredOut markers have fill-opacity set to 0 in custom.css
  markersGroup.selectAll("circle").classed("filteredOut", false);
  // check for at least one active filter option
  // if none... can skip this section
  var openFilterGroups = $(".filterOptionGroup");
  var openGroupCount = openFilterGroups.length;
  if(openGroupCount > 0){
    markersGroup.selectAll("circle").each(function(d){
      var filterGroupsPassed = 0;
      $.each(openFilterGroups, function(groupIndex, filterGroup){
        var thisGroupActiveOptionCount = 0
        var theseOptions = $(filterGroup).children();
        var thisShown = false;
        $.each(theseOptions, function(optionIndex, filterOption){
          if($(filterOption).hasClass("filterMapped")){
            thisGroupActiveOptionCount++;
            var thisAnswer = $(filterOption).attr("data-filteranswer");
            var thisVariable = $(filterOption).attr("data-filtervariable");
            if(d[thisVariable] == thisAnswer){
              thisShown = true;
            }
          }
        });
        if(thisShown == true || thisGroupActiveOptionCount == 0){
          filterGroupsPassed ++;
        }
      });
      if(filterGroupsPassed !== openGroupCount){
        d3.select(this).classed("filteredOut", true);
      }
    });
  }



  // count the number of markers that are both visible (in Admin selection)
  // and also not .filteredOut
  var filteredInCount = 0;
  markersGroup.selectAll("circle")
    .filter(function(d) {return this.style.display == 'inline'})
    .filter(function(d) {
      if(d3.select(this).classed('filteredOut') == true){
        return false
      } else {
        return true
      }
    })
    .each(function(d){ filteredInCount ++; });
  $("#filteredForAreaCount").html(formatCommas(filteredInCount));

  setHeat();

}


function toggleMarkerStroke(x){
  $(x).toggleClass("stroke-shown");
  if($(x).hasClass("stroke-shown") === false){
    markersGroup.selectAll("circle").attr('stroke','none');
    $(x).children().removeClass("glyphicon-eye-open");
    $(x).children().addClass("glyphicon-eye-close");  
  } else {
    markersGroup.selectAll("circle").attr('stroke','#222222');
    $(x).children().removeClass("glyphicon-eye-close");
    $(x).children().addClass("glyphicon-eye-open");
  }
}






function clickedMarker(e){
  // -d- is the data object
  // -this- is the svg circle element
  $('#modal-ben-title').html("Survey Point!");
  $('#modal-ben-body').html("<strong><u>" + e.enumerator + "</u></strong> was the enumerator. Nothing else coded to appear here yet.");
  $('#modal-ben').modal();
}



// tooltip follows cursor
$(document).ready(function() {
    $('#map').mouseover(function(e) {
        //Set the X and Y axis of the tooltip
        $('#tooltip').css('top', e.pageY + 10 );
        $('#tooltip').css('left', e.pageX + 20 );
    }).mousemove(function(e) {
        //Keep changing the X and Y axis for the tooltip, thus, the tooltip move along with the mouse
        $("#tooltip").css({top:(e.pageY+15)+"px",left:(e.pageX+20)+"px"});
    });
});

// show disclaimer text on click of disclaimer link
function showDisclaimer() {
  window.alert("The maps used do not imply the expression of any opinion on the part of the International Federation of Red Cross and Red Crescent Societies or National Societies concerning the legal status of a territory or of its authorities.");
}

// on window resize
$(window).resize(function(){
    windowHeight = $(window).height();
    $("#map").height(windowHeight);
    $("#infoWrapper").height(windowHeight);
})

function filterexplanation(){
  var filterAlert = "Selecting answers within a question will show markers"+
    " that meet at least one. For example, selecting both male and female for 'Sex of head of household'" +
    " will show all markers. An example use would be selecting none, primary, and elementary for 'Highest Level of Education'"+
    " in order to view all households with less than high school education. HOWEVER, while answers"+
    " within a question are used in an *OR* query, seperate questions are used in an *AND* query."+
    " For example... (Sex of head = female) AND [(highest lvl of edu = none) OR (highest lvl of edu = elementary) OR (highest lvl of edu = primary)].";
  window.alert(filterAlert);
}


getSurveyData();
