var config = {
  "dataFile":"RITA-data.csv",
  "planFile":"RITA-analysis.csv",
  "adminLvls":3,
  "adminNames":{
    0:"region",
    1:"country",
    2:"community"
  }
}


// global variables
var activeAdmins = {};

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

// formatting
var formatCommas = d3.format(",");
var formatPerc = d3.format(".0%");


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
	center: [0, 0],
	zoom: 2,
	minZoom: 2,
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
  var dataFile = 'data/' + config.dataFile;
	d3.csv(dataFile, function(data){
		surveyData = data;
    // add a LatLng object to each item in the dataset
    surveyData.forEach(function(d) {
      d.LatLng = new L.LatLng(d.latitude,d.longitude);
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
  }).on("progress", function(event){
    //update progress bar
    if (d3.event.lengthComputable) {
      var percentComplete = Math.round(d3.event.loaded * 100 / d3.event.total);
      $('.progress-bar').css("width", percentComplete+'%').attr('aria-valuenow', percentComplete);
      if(percentComplete == 100){
        $("#loading-wrapper").fadeOut(500);
      }
    }
  });
}

function setupSurveyAnalysis(){
  var planFile = 'data/' + config.planFile;

  d3.csv(planFile, function(data){
    analysisPlan = data;
    var categoryList = [];
    $.each(analysisPlan, function(index, analyzeThis){
      if($.inArray(analyzeThis["Category"], categoryList) === -1){
        categoryList.push(analyzeThis["Category"]);
      }
    });
    // categoryList = categoryList.sort();
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
  buildAdminBtns();
  });
}


function buildAdminBtns() {
  // create a button dropdown for each admin level
  // create object to hold active admins
  for(i=0; i < config.adminLvls; i++){
    var thisBtnHtml = '<div class="btn-group"><button type="button" ' +
      'class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown">' +
      'Select a ' + config.adminNames[i] + ' <span class="caret"></span></button>' +
      '<ul id="dropdown-menu-admin' + i + '" class="dropdown-menu dropdown-menu-left" role="menu">'+
      '<li class="disabled"><a role="menuitem" href="#">First select a '+
      config.adminNames[i-1] +'</a></li>'
      '</ul></div>';
    $('#admin-btns').append(thisBtnHtml);
    activeAdmins[i] = "ALL";
  }

  // populate the admin0 list
  var admin0List = [];
  $.each(surveyData, function(index, survey){
    var thisAdmin = survey[config.adminNames[0]];
    if($.inArray(thisAdmin, admin0List) === -1){
      admin0List.push(thisAdmin);
    }
  });
  // sort so that the admins appear in alphabetical order in dropdown
  admin0List = admin0List.sort();
  // create item elements in dropdown list
  $('#dropdown-menu-admin0').empty();
  for(var i = 0; i < admin0List.length; i++) {
      var item = admin0List[i];
      var listItemHtml = '<li><a id="'+ item +
      '" href="#" onClick="adminSelect(' +"'"+ item +
      "'" + ', 0); return false;">' + item + "</a></li>"
      $('#dropdown-menu-admin0').append(listItemHtml);
  }
  $("#selected-survey-count").html(formatCommas(surveyData.length.toString()));

  filterMap();
}

function adminSelect(adminData, adminLvl){
  activeAdmins[adminLvl] = adminData;

  var newAdminLvl =  adminLvl + 1;
  if(newAdminLvl < config.adminLvls){
    //clear dropdowns and reset activAdmins object
    for(var i = newAdminLvl; i < config.adminLvls; i++){
      var selector = '#dropdown-menu-admin' + i;
      $(selector).html('<li class="disabled"><a role="menuitem" href="#">First select a '+
      config.adminNames[i-1] +'</a></li>');
      activeAdmins[i] = "ALL";
    }

    // build next admin lvl dropdown
    var thisAdminList = [];
    $.each(surveyData, function(index, survey){
      var thisAdmin = survey[config.adminNames[newAdminLvl]];
      var include = true;
      // check to see if the survey has higher admin lvls matching the active
      // admin lvls (deals w scenario like admin2 with same name but in diff admin 1)
      for(var i = adminLvl; i >= 0; i--){
        if(survey[config.adminNames[i]] !== activeAdmins[i]){
          include = false;
        }
      }
      if(include === true && $.inArray(thisAdmin, thisAdminList) === -1){
        thisAdminList.push(thisAdmin);
      }
    });
    // sort so that the admins appear in alphabetical order in dropdown
    thisAdminList = thisAdminList.sort();
    // create item elements in dropdown list
    var selector = '#dropdown-menu-admin' + newAdminLvl;
    $(selector).html("");
    for(var i = 0; i < thisAdminList.length; i++) {
        var item = thisAdminList[i];
        var listItemHtml = '<li><a id="'+ item +
        '" href="#" onClick="adminSelect(' +"'"+ item +
        "'" + ', ' + newAdminLvl + '); return false;">' + item + "</a></li>"
        $(selector).append(listItemHtml);
    }
  }

  // display the active admin names on page
  $("#selected-admin-label").empty();
  for(var i = 0; i < config.adminLvls; i++) {
    var item = activeAdmins[i];
    if(item !== "ALL"){
      if(i !== 0){
        $("#selected-admin-label").append(', ');
      }
      $("#selected-admin-label").append(item);
    }
  }

  console.log(activeAdmins);
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
      '" class="fillColorBox clickable"></span>' + answer +
      ' (<span class="answerCount" data-countanswer="'+ answer +'" data-countvariable="'+ variableSelected +'">X</span>)'+
      '</div>';
    $("#legend-fill").append(thisHtml);
  });
  // color legend
  d3.selectAll("#legend-fill .fillColorBox").style("background-color", function(d, i) {
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
    var color = $(colorSearch).children(".fillColorBox").css("background-color");
    var colorHex = d3.rgb(color).toString();
    filtered.attr("fill", colorHex);
  });
  getCounts();
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
  activeAdmins[0] = "ALL";
  for(var i = 1; i < config.adminLvls; i++){
    var selector = '#dropdown-menu-admin' + i;
    $(selector).html('<li class="disabled"><a role="menuitem" href="#">First select a '+
      config.adminNames[i-1] +'</a></li>');
    activeAdmins[i] = "ALL";
  }
  $("#selected-admin-label").html("All surveyed areas");
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
            input.longitude,
            input.latitude
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
    var adminCheck = true;
    for(var i = config.adminLvls - 1; i >= 0; i--){
      if(d[config.adminNames[i]] !== activeAdmins[i]){
        adminCheck = false;
        if(activeAdmins[i] == "ALL"){
          adminCheck = true;
        }
      }
    }
    if(adminCheck == true){
      d3.select(this).classed('inAdmin', true);
      conductedSurveyCount ++;
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

  getCounts();
  setHeat();
  mapToBounds();

}

function getCounts(){
  d3.selectAll(".answerCount").each(function(d){
    var thisCount = 0;
    var visibleCount = 0;
    var answer = d3.select(this).attr("data-countanswer");
    var variable = d3.select(this).attr("data-countvariable");
    markersGroup.selectAll("circle")
      .filter(function(d) {return this.style.display == 'inline'})
      .filter(function(d) {
        if(d3.select(this).classed('filteredOut') == true){
          return false
        } else {
          return true
        }
      }).each(function(d){ visibleCount ++; })
      .filter(function(d) {return d[variable] == answer})
      .each(function(d){ thisCount ++; });
    var thisHtml = formatCommas(thisCount.toString()) + " - " + formatPerc(thisCount / visibleCount);
    d3.select(this).html(thisHtml);

  });

// <span class="answercount" data-countanswer="___" data-countvariable="_____"> X </span>

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
  // -e- is the data object
  // -this- is the svg circle element

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
