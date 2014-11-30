// global variables
var activeMunicipalityName = "ALL";
var activeMunicipalityCode = "";
var activeBarangayName = "ALL";
var activeBarangayCode = "";

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
	hotUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
var mapboxStreets = new L.TileLayer(mapboxStreetsUrl, {attribution: mapAttribution}),
	mapboxTerrain = new L.TileLayer(mapboxTerrainUrl, {attribution: mapAttribution}),
	greyscale = new L.TileLayer(greyscaleUrl, {attribution: mapAttribution}),
	hot = new L.TileLayer(hotUrl, {attribution: HOTAttribution});

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
	"HOT": hot
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
	d3.csv("data/Alang_Alang_GIS.csv", function(data){ 
		surveyData = data;
    // add a LatLng object to each item in the dataset
    surveyData.forEach(function(d) {
      d.LatLng = new L.LatLng(d.GPS_latitude,d.GPS_longitude);
    });
    // add a circle to the svg markers group for each survey point
    var mappedMarkers = markersGroup.selectAll("circle")
      .data(surveyData)
      .enter().append("circle").attr("r", 4).attr('stroke','none')
      .attr("fill", "#6d6e70")
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
      var fillListSectionHtml = '<h4>' + item + '</h4>' + '<div id="modal-fill-options-' + item.replace(/\s+/g, '') + '"></div>';  
      var heatListSectionHtml = '<h4>' + item + '</h4>' + '<div id="modal-heat-options-' + item.replace(/\s+/g, '') + '"></div>';  
      $('#modal-fill-options').append(fillListSectionHtml);  
      $('#modal-heat-options').append(heatListSectionHtml);   
    }
    $.each(analysisPlan, function(index, analyzeThis){
      var dataDescription = analyzeThis["Data Description"];
      var variableName = analyzeThis["Variable Name"];
      var fillListItemHtml = '<a id="fill-question-'+ variableName +'" href="#" onClick="fillQuestionSelect(' +"'"+ variableName +"', this"+ '); return false;">' + dataDescription + "</a><br>";
      var heatListItemHtml = '<a id="heat-question-'+ variableName +'" href="#" onClick="heatQuestionSelect(' +"'"+ variableName +"', this"+ '); return false;">' + dataDescription + "</a><br>";
      var fillSelector = "#modal-fill-options-" + analyzeThis["Category"];
      var heatSelector = "#modal-heat-options-" + analyzeThis["Category"];
      $(fillSelector).append(fillListItemHtml);
      $(heatSelector).append(heatListItemHtml);
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
}




function fillQuestionSelect(variableSelected, listItem){
  $('#modal-fill').modal('hide');
  $("#legend-fill").empty();
  $("#legend-fill-title").html($(listItem).html());
  var possibleFillAnswers = [];
  $.each(surveyData, function(index, survey){
    if($.inArray(survey[variableSelected], possibleFillAnswers) === -1){
      possibleFillAnswers.push(survey[variableSelected]);
    }
  });
  // ugh, recode things so first 2 characters are 0-, 1-, 2-... so can sort possible answers 
  // then trim first 2 characters??? hacky as hell
  possibleFillAnswers.sort();
  $.each(possibleFillAnswers, function(index, answer){
    var thisHtml ='<div data-fillanswer="' + answer + '"><span class="fillColorBox"></span>' + answer + '</div>';
    $("#legend-fill").append(thisHtml);
  });
  // color legend
  d3.selectAll("#legend-fill span").style("background-color", function(d, i) {
    return color12[i];
  });
  // color markers on map based on legend colors
  $(possibleFillAnswers).each(function(index, answer){  
    var filtered = markersGroup.selectAll("circle")
      .filter(function(d) { return d[variableSelected] === answer });
    var colorSearch = "[data-fillanswer='" + answer + "']";
    var color = $(colorSearch).children().css("background-color");
    var colorHex = d3.rgb(color).toString();
    filtered.attr("fill", colorHex);
  });
}

function heatQuestionSelect(variableSelected, listItem){
  map.removeLayer(heatLayer);
  $('#modal-heat').modal('hide');
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
  console.log(clicked);
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
  console.log($(".legend-heat-option.heatMapped").length);
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




function municipalitySelect(p2){
  activeMunicipalityCode = p2;
  activeBarangay = "ALL";

  markersGroup.selectAll("circle").style('display', 'none');
  markersGroup.selectAll("circle")
    .filter(function(d) {return d["Mun_Code"] == activeMunicipalityCode})
    .style('display', 'inline');
  setHeat();

  var selector = "#" + p2;
  activeMunicipalityName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName);
  
  //build barangay dropdown
  $('#dropdown-menu-barangay').empty();
  var barangayList = [];
  var barangayAdminLookup = {};
  shownSurveysCount = 0;
  $.each(surveyData, function(index, survey){
    if(survey["Mun_Code"] === activeMunicipalityCode){
      shownSurveysCount ++;
      var thisBarangay = survey["barangayname"];
      if($.inArray(thisBarangay, barangayList) === -1){
        barangayList.push(thisBarangay);
        barangayAdminLookup[thisBarangay] = survey["Bar_Code"];
      }
    }
  });
  $("#selected-survey-count").html(formatCommas(shownSurveysCount));
  // sort so that they appear in alphabetical order in dropdown
  barangayList = barangayList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < barangayList.length; i++) {
      var item = barangayList[i];
      var listItemHtml = '<li><a id="'+ barangayAdminLookup[item] +'" href="#" onClick="barangaySelect(' +"'"+ barangayAdminLookup[item] +"'"+ '); return false;">' + item + "</a></li>";
      $('#dropdown-menu-barangay').append(listItemHtml);       
  }

  mapToBounds(); 
}


function barangaySelect(p3) {
  activeBarangayCode = p3;
  var selector = "#" + p3;
  activeBarangayName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName + ", "+ activeBarangayName);
  
  markersGroup.selectAll("circle").style('display', 'none');
  markersGroup.selectAll("circle")
    .filter(function(d) {return d["Bar_Code"] == activeBarangayCode})
    .style('display', 'inline');
  setHeat();

  shownSurveysCount = 0;
  $.each(surveyData, function(index, survey){
    if(survey["Bar_Code"] === activeBarangayCode){
      shownSurveysCount ++;
    }
  });
  $("#selected-survey-count").html(formatCommas(shownSurveysCount));

  mapToBounds();
}


function mapToBounds(){
  // build FeatureCollection in order to use d3 to get bounds of points
  visibleFeatures.features = [];
  //function to take csv to geojson for adding point to FeatureCollection
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
  // add geojson points to FeatureCollection for all visible markers
  markersGroup.selectAll("circle")
    .filter(function(d) {return this.style.display == 'inline'})
    .each(function(d){ markerToJSON(d) });
  // get bounds of all visible markers
  bounds = d3.geo.bounds(visibleFeatures);
  // reformat bounds arrays for compatibility with Leaflet and fit map to bounds
  var padding = {"padding":[0,0]};
  map.fitBounds([[Number(bounds[1][1]), Number(bounds[1][0])], [Number(bounds[0][1]), Number(bounds[0][0])]], padding);
}





function clickedMarker(e){
  // -d- is the data object
  // -this- is the svg circle element
  $('#modal-ben-title').html("Beneficiary!");
  $('#modal-ben-body').html("<strong><u>" + e.enumerator + "</u></strong> wasn't the enumerator. Data currently scrambled while working progress is public. Nothing else coded to appear here yet.");
  $('#modal-ben').modal();   
}



function resetAdmin() {
  activeMunicipalityName = "ALL";
  activeBarangayName = "ALL";
  activeMunicipalityCode = "";
  activeBarangayCode = "";
  // municipalityGroup.selectAll("path")
  //   .style({'fill': 'red', 'stroke': "#ffffff"});
  // barangayGroup.selectAll("path")
  //   .style('display', 'none');
  markersGroup.selectAll("circle").style('display', 'inline');
  mapToBounds("agree_to_participate", "yes");
  $('#dropdown-menu-barangay').html('<li class="disabled"><a role="menuitem" href="#">First select a municipality</a></li>');
  $("#selected-admin-label").html("All surveyed areas");
  $("#selected-survey-count").html(formatCommas(surveyData.length.toString()));
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


getSurveyData();






// function getMunicipalityGeo(){
// 	d3.json("data/targetmunicipalities.json", function(data) {
//     municipalityGeoData = data;
// 		var mappedMunicipalities = municipalityGroup.selectAll("path")
// 			.data(data.features)
// 			.enter().append("path")
// 			.attr("class", "municipalityPolygon")
// 			.attr("d", path)
// 			.on("click",municipalityClick)
// 			.on("mouseover", function(d){ 
// 				var tooltipText = "<strong>" + d.properties.name_2 + "</strong>";
// 				$('#tooltip').append(tooltipText);                
// 			})
// 			.on("mouseout", function(){ 
// 				$('#tooltip').empty();        
// 			});
// 		function updateMpath(){
// 			mappedMunicipalities.attr("d", path);
// 		}
// 		map.on("viewreset", updateMpath);
//     getBarangayGeo();
// 	});
// }

// function getBarangayGeo(){
//   d3.json("data/barangays.json", function(data) {
//     var mappedBarangays = barangayGroup.selectAll("path")
//       .data(data.features)
//       .enter().append("path")
//       .attr("class", "barangayPolygon")
//       .attr("d", path)
//       .style("display","none")
//       .on("click", barangayClick)
//       .on("mouseover", function(d){ 
//         var tooltipText = "<strong>" + d.properties.name_3 + "</strong>";
//         $('#tooltip').append(tooltipText);                
//       })
//       .on("mouseout", function(){ 
//         $('#tooltip').empty();        
//       });
//     function updateBpath(){
//       mappedBarangays.attr("d", path);
//     }
//     map.on("viewreset", updateBpath);
//     buildMunicipalityDropdown();
//   });
// }





// // on municipality click open modal
// function municipalityClick(e) {
//   var thisName = e.properties.name_2;
//   $('.modal-title').html(thisName);
//   $('.modal-body').html("<h5>Lorem ipsum</h5><p>Municipal level data could appear here. For example, a graph of percentage complete.");
//   console.log(e);
//   $('#modal1').modal();     
// }
// // on brgy click open modal
// function barangayClick(e) {
//   var thisBrgy = e.properties.name_3;
//   var thisMunicip = e.properties.name_2;
//   $('.modal-title').html("Barangay " + thisBrgy + ", " + thisMunicip);
//   $('.modal-body').html("<h5>Lorem ipsum</h5><p>Barangay level data could appear here. For example, a graph of percentage complete.");
//   $('#modal1').modal();     
// }

