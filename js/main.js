// global variables
var activeMunicipalityName = "ALL";
var activeMunicipalityCode = "";
var activeBarangayName = "ALL";
var activeBarangayCode = "";

var municipalityGeoData = [];

var surveyData = [];
var visibleFeatures = {
 	"type": "FeatureCollection",
 	"features": []
};


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
var municipalityGroup = svg.append('g').attr("id", "municipalities");
var barangayGroup = svg.append('g').attr("id", "barangays");
var markersGroup = svg.append('g').attr("id", "markers");




function getSurveyData(){
	d3.csv("data/Alang_Alang_shelter_working.csv", function(data){ 
		surveyData = data;
    // add a LatLng object to each item in the dataset
    surveyData.forEach(function(d) {
      d.LatLng = new L.LatLng(d.GPS_latitude,d.GPS_longitude);
    });
    // add a circle to the svg markers group for each survey point
    var mappedMarkers = markersGroup.selectAll("circle")
      .data(surveyData)
      .enter().append("circle").attr("r", 4).attr('stroke','none')
      .style('display','none')
      .attr('class','mappedMarkers')
      .on("click",clickedMarker);
    // when map view changes adjust the locations of the svg circles
    function updatemarker(){
      mappedMarkers.attr("cx",function(d) { return map.latLngToLayerPoint(d.LatLng).x});
      mappedMarkers.attr("cy",function(d) { return map.latLngToLayerPoint(d.LatLng).y});
    }
    map.on("viewreset", updatemarker);
    updatemarker(); 
    getMunicipalityGeo();
  });
}

function getMunicipalityGeo(){
	d3.json("data/targetmunicipalities.json", function(data) {
    municipalityGeoData = data;
		var mappedMunicipalities = municipalityGroup.selectAll("path")
			.data(data.features)
			.enter().append("path")
			.attr("class", "municipalityPolygon")
			.attr("d", path)
			.on("click",municipalityClick)
			.on("mouseover", function(d){ 
				var tooltipText = "<strong>" + d.properties.name_2 + "</strong>";
				$('#tooltip').append(tooltipText);                
			})
			.on("mouseout", function(){ 
				$('#tooltip').empty();        
			});
		function updateMpath(){
			mappedMunicipalities.attr("d", path);
		}
		map.on("viewreset", updateMpath);
    getBarangayGeo();
	});
}

function getBarangayGeo(){
  d3.json("data/barangays.json", function(data) {
    var mappedBarangays = barangayGroup.selectAll("path")
      .data(data.features)
      .enter().append("path")
      .attr("class", "barangayPolygon")
      .attr("d", path)
      .style("display","none")
      .on("click", barangayClick)
      .on("mouseover", function(d){ 
        var tooltipText = "<strong>" + d.properties.name_3 + "</strong>";
        $('#tooltip').append(tooltipText);                
      })
      .on("mouseout", function(){ 
        $('#tooltip').empty();        
      });
    function updateBpath(){
      mappedBarangays.attr("d", path);
    }
    map.on("viewreset", updateBpath);
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
      municipalityAdminLookup[thisMunicipality] = survey["p_2"];
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

function municipalitySelect(p2){
  activeMunicipalityCode = p2;
  activeBarangay = "ALL";
  markersGroup.selectAll("circle").style('display', 'none');
  var selector = "#" + p2;
  activeMunicipalityName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName);
  buildBarangayDropdown();
}

function buildBarangayDropdown() {
  $('#dropdown-menu-barangay').empty();
  var barangayList = [];
  var barangayAdminLookup = {};
  var theseSurveysCount = 0;
  $.each(surveyData, function(index, survey){
    var thisBarangay = survey["barangayname"];
    if(survey["p_2"] === activeMunicipalityCode){
      theseSurveysCount ++;
      if($.inArray(thisBarangay, barangayList) === -1){
        barangayList.push(thisBarangay);
        barangayAdminLookup[thisBarangay] = survey["p_3"];
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
  $("#selected-survey-count").html(formatCommas(theseSurveysCount));

  // map stuff

  municipalityGroup.selectAll("path")
    .style({'fill': 'none', 'stroke': "#000"});
  visibleFeatures.features = [];
  for(entry in barangayAdminLookup){
    barangayGroup.selectAll("path")
        .filter(function(d) {return d.properties.p_3 == barangayAdminLookup[entry]})
        .each(function(d) {visibleFeatures.features.push(d);})
        .style('display', 'inline')
        .style('fill',"#f36471");
  }
  mapToBounds(); 
}

function barangaySelect(p3) {
  activeBarangayCode = p3;
  var selector = "#" + p3;
  activeBarangayName = $(selector).html();
  $("#selected-admin-label").html(activeMunicipalityName + ", "+ activeBarangayName);
  var theseSurveysCount = 0;
  $.each(surveyData, function(index, survey){
    if(survey["p_3"] === activeBarangayCode){
      theseSurveysCount ++;
    }
  });
  barangayGroup.selectAll("path").style({'fill': 'none', 'stroke': "red"});
  // build FeatureCollection in order to use d3 to get bounds or points
  visibleFeatures.features = [];
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
  markersGroup.selectAll("circle").style('display', 'none');
  markersGroup.selectAll("circle")
    .filter(function(d) {return d.p_3 == activeBarangayCode})
    .each(function(d){ markerToJSON(d) })
    .style('display', 'inline');
  $("#selected-survey-count").html(formatCommas(theseSurveysCount));
  mapToBounds();
}

  


function mapToBounds(){
  bounds = d3.geo.bounds(visibleFeatures);
  // reformat bounds arrays for compatibility with Leaflet and fit map to bounds
  var padding = {"padding":[0,0]};
  map.fitBounds([[Number(bounds[1][1]), Number(bounds[1][0])], [Number(bounds[0][1]), Number(bounds[0][0])]], padding);
}


// bottom circle layer with tranparency 
// and halo of color for highlighting filtered selections?

/*  Right column  */
// zoom dropdowns 
// filter controls

/*  On Click  */
// modals with either pie charts (on admin levels)
// or ben info (on markers)



// on municipality click open modal
function municipalityClick(e) {
  var thisName = e.properties.name_2;
  $('.modal-title').html(thisName);
  $('.modal-body').html("<h5>Lorem ipsum</h5><p>Municipal level data could appear here. For example, a graph of percentage complete.");
  console.log(e);
  $('#modal1').modal();     
}
// on brgy click open modal
function barangayClick(e) {
  var thisBrgy = e.properties.name_3;
  var thisMunicip = e.properties.name_2;
  $('.modal-title').html("Barangay " + thisBrgy + ", " + thisMunicip);
  $('.modal-body').html("<h5>Lorem ipsum</h5><p>Barangay level data could appear here. For example, a graph of percentage complete.");
  $('#modal1').modal();     
}

function clickedMarker(e){
  // -d- is the data object
  // -this- is the svg circle element
  $('.modal-title').html("Beneficiary!");
  $('.modal-body').html("<strong><u>" + e.enumerator + "</u></strong> was the enumerator. All other data has been stripped until this site is made private.");
  $('#modal1').modal();   
}



function resetAdmin() {
  visibleFeatures.features = municipalityGeoData.features;
  mapToBounds();
  activeMunicipalityName = "ALL";
  activeBarangayName = "ALL";
  activeMunicipalityCode = "";
  activeBarangayCode = "";
  municipalityGroup.selectAll("path")
    .style({'fill': 'red', 'stroke': "#ffffff"});
  barangayGroup.selectAll("path")
    .style('display', 'none');
  markersGroup.selectAll("circle").style('display', 'none');
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