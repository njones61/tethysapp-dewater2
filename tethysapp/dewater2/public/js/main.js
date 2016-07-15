
//  ################################# Global declarations ##################################################
"use strict";

function welcome_modal() {
    var myHTMLBody = 
        "<p>This tool is used to aid in the design of a simple construction dewatering system in" +
        "an unconfined aquifer underlain by bedrock or a low permeability layer. The system consists" +
        "of one or more wells that fully penetrate the aquifer. Steps:</p>" +
            "<h6>1. Enter aquifer properties</h6>" +
                "<p>Enter the average hydraulic conductivity of the aquifer, the average bedrock elevation," +
                "and the average water table elevation prior to pumping.</p>" +
                "<h6>2. Enter the project parameters</h6>" +
                "<p>Enter the total pumping rate (each well will pump an equal fraction of this amount and " +
                "the desired water table elevation (typically at or below the bottom of the planned excavation).</p>" +
            "<h6>3. Set map features</h6>" +
                "<p>Use the navigation tools on the map to locate your project and then use the rectangle tool to " +
                "indicate the location of your excavation and use the point tool on the map to enter the locations of " +
                "your wells.</p>" +
                "<h6>4. Perform calculations</h6>" +
                "<p>Click on the 'Calculate Water Table Elevations' tool to perform the drawdown calculations and "
                "display the results on the map.</p>" +     
            "<h9>Note: INSERT A REFERENCE TO EQUATIONS USED.</h9>";
    modal_dialog("Instructions", myHTMLBody, true);
}

$(document).ready(function(){
    welcome_modal();
});

//  #################################### Verify that the user has the necessary variables ##############################

function verify(numFeatures, numWells, numPolys){
    //initialize the variables for the functions to be used
 
    if (dwte.value < bedrock.value){
         error_message('Your desired elevation is lower than the bedrock elevation');
         return false;
     }

    if (iwte.value < bedrock.value){
        error_message('Your initial elevation is lower than the bedrock elevation');
        return false;
    }

    if (dwte.value > dwte.value){
        error_message('Your desired elevation is higher than the initial elevation');
        return false;
    }

    if (k.value <= 0){
        error_message('Hydraulic conductivity must have a positive value, adjust your input');
        return false;
    }

    if (numFeatures  == 0) {
        error_message("You dont have any features, please provide a boundary and well locations");
        return false;
    }

    if (numWells == 0) {
        error_message('You need wells to perform the analysis, please add at least one well');
        return false;
    }
    else if (numPolys == 0) {
        error_message('You need a boundary for your analysis, please add a boundary');
        return false;
    }
    else if (numPolys > 1) {
        error_message('You have more than one Perimeter, delete the extra(s)');
        return false;
    }
 
    //If you are to hear without a return, everyting must be OK
    return true;
 };

function isOdd(num) {return !!(num % 2);}

//  #################################### From the input shapes and variables, create a grid ############################

function dewater(){

    var pCoords;
    var wCoords;
    var pXCoords = [];
    var pYCoords = [];
    var wXCoords = [];
    var wYCoords = [];
    var mapXCoords = [];
    var mapYCoords = [];
    var mapView;

    var map;
    var mapFeatures;
    var wells = [];
    var perimeter = [];
    var mapFeatures = [];

     //counters for building arrays
    var i = 0;
    var iX = 0;
    var iY = 0;

   //This method returns the OpenLayers map object.
    map = TETHYS_MAP_VIEW.getMap();


 //this reads the number of features found in the map object and verifies that all of the required features are present
    mapFeatures = map.getLayers().item(1).getSource().getFeatures();

    for (i = 0; i < mapFeatures.length; i++)  {
        if (map.getLayers().item(1).getSource().getFeatures()[i].getGeometry().getType() === 'Point') {
            wells.push(map.getLayers().item(1).getSource().getFeatures()[i].getGeometry().getCoordinates());
        }
        else if (map.getLayers().item(1).getSource().getFeatures()[i].getGeometry().getType() === 'Polygon') {
            perimeter.push(map.getLayers().item(1).getSource().getFeatures()[i].getGeometry().getCoordinates());
        }
    }

    //Check the inputs. Exit if there is a problem.
    if (!verify(mapFeatures.length, wells.length, perimeter.length)) {
        return;
    }

   // Obtain the map view extents for bounding the grid a second time
    mapView = map.getView().calculateExtent(map.getSize());

    //Split the coordinate arrays into separate X and Y coordinate arrays

    pCoords = perimeter.toString();
    wCoords = wells.toString();

    pCoords = pCoords.split(",");
    wCoords = wCoords.split(",");
    //console.log(wCoords);

    // Perimeter coordinates by X and Y
    i = 0;
    iX = 0;
    iY = 0;
    do {
        if (!isOdd(i)){ //even
            pXCoords[iX] = parseFloat(pCoords[i]);
            i++;
            iX++;
        }

        else {
            pYCoords[iY] = parseFloat(pCoords[i]);
            i++;
            iY++;
        }
    }
    while (i < pCoords.length);

   // Well coordinates by X and Y
   //reinitialize counters
    i = 0;
    iX = 0;
    iY = 0;
    do {
        if (!isOdd(i)){
            wXCoords[iX] = parseFloat(wCoords[i]);
            i++;
            iX++;
        }

        else {
            wYCoords[iY] = parseFloat(wCoords[i]);
            i++;
            iY++;
        }
    } 
    while (i < wCoords.length);

    // Map View Extent coordinates

    mapXCoords[0] = mapView[0];
    mapYCoords[0] = mapView[1];
    mapXCoords[1] = mapView[2];
    mapYCoords[1] = mapView[3];


    //This section defines the cell size based on a percentage for the area selected
    //the shortest dimension is what determines the cellsize
    var scale = 0.1;
    var cellSide = 0.0;

    //console.log("Getting cellSide");

    if (Math.abs(pXCoords[0]-pXCoords[1]) > Math.abs(pYCoords[0]-pYCoords[1])){
        cellSide = Math.abs(pXCoords[0]-pXCoords[1])*scale;
    }
    else if (Math.abs(pXCoords[0]-pXCoords[1]) < Math.abs(pYCoords[0]-pYCoords[1])) {
        cellSide = Math.abs(pYCoords[0]-pYCoords[1])*scale;
    }
    else {
        cellSide = cellSide + Math.abs(pXCoords[0]-pXCoords[1])*scale;
    }

    //console.log(cellSide);
    //This section constructs the featurecollection polygons defining the water table elevations
    //Cells are defined at the corners, water table elevation is defined at the center of the cell

    var waterTableRegional = [];
    var long, lat;

    // This code builds the grid using the bounding box as the zoomed in view of the user
    for (long = mapXCoords[0]-cellSide; long < mapXCoords[1]; long += cellSide) {
        for (lat = mapYCoords[0]-cellSide; lat < mapYCoords[1]; lat += cellSide){
            waterTableRegional.push({
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates':  [
                                     [  [long,lat],
                                        [long + cellSide, lat],
                                        [long + cellSide, lat + cellSide],
                                        [long, lat + cellSide],
                                        [long,lat]
                                     ]
                                    ]
                },
                'properties': {
                    'elevation' : elevationCalc(long,lat,wXCoords,wYCoords,cellSide),
                    'text': Math.round(Number(elevationCalc(long,lat,wXCoords,wYCoords,cellSide))),
                }
            });
        }
    }


    var raster_elev_mapView = {
        'type': 'FeatureCollection',
        'crs': {
            'type': 'name',
            'properties':{
                'name':'EPSG:4326'
                }
        },
        'features': waterTableRegional
    };
    addWaterTable(raster_elev_mapView,"Water Table");
}

//  #################################### Calculate the water elevation of each cell  ###################################

function elevationCalc(long,lat,wXCoords,wYCoords,cellSide) {


    //Declare variables
    var wellx = 0;
    var welly = 0;
    var wellr = 0;
    var deltax = 0;
    var deltay = 0;
    var H = 0;
    var Q = 0;
    var hc = 0;
    var sum = 0; //for summing q*ln(R/r)
    var wtElevation = 0;
    var i =0;

    H = iwte.value - bedrock.value
    do {

        wellx = wXCoords[i];
        welly = wYCoords[i];
        Q = q.value/wXCoords.length;

        deltax = Math.abs(long+cellSide/2-wellx);
        deltay = Math.abs(lat+cellSide/2-welly);

        wellr = Math.pow((Math.pow(deltax,2) + Math.pow(deltay,2)),0.5);

        //Make sure that we don't create a complex value for the water table elevation
        if (wellr < Math.exp(Math.log(500)-Math.PI*k.value*Math.pow(H,2)/Q)){
            wellr = Math.exp(Math.log(500)-Math.PI*k.value*Math.pow(H,2)/Q);
            }
        if (Math.log(500/wellr)<0){
            sum = sum;
            }
        else{
            sum = sum + Q*Math.log(500/wellr);
            }
        i = i+1;
        }
    while(i < wXCoords.length);

    wtElevation = Math.pow((Math.pow(H,2) - sum/(Math.PI*k.value)),0.5)

    return wtElevation;
}

//  #################################### Add the new water table raster to the map #####################################

function addWaterTable(raster_elev,titleName){

    var getStyleColor;
    var map;
    var i;

    getStyleColor = function(value) {
        if (value > Number(dwte.value)+Number(dwte.value*0.375))
            return [0,32,229,0.7];       //Blue, Hex:0020E5
        else if (value > Number(dwte.value)+Number(dwte.value*0.25))
            return [1,107,231,0.7];       //Light Blue, Hex:016BE7
        else if (value > Number(dwte.value)+Number(dwte.value*0.125))
            return [0,158,223,0.7];     //Lighter Blue, Hex:009EDF
        else if (value > dwte.value)
            return [0,218,157,0.7];       //Turqoise(ish), Hex:00DA9D
        else if (value > Number(dwte.value)-Number(dwte.value*0.125))
            return [0,255,0,0.7];         //Green
        else if (value > Number(dwte.value)-Number(dwte.value*0.25))
            return [255,255,0,0.7];       //Yellow, Hex:FFFF00
        else if (value > Number(dwte.value)-Number(dwte.value*0.375))
            return [196,87,0,0.7];       //Orange, Hex:C45700
        else
            return [191,0,23, 0.7];           //Red, Hex:BF0017
        };

    var defaultStyle = new ol.style.Style({
    //    var img = new Image();
    //    img.src = '/home/jacobbf1/tethysdev/tethysapp-dewater/tethysapp/dewater/public/images/Dried Cell.png';
    //    var pat = context.createPattern(img,"repeat");
    //
    //    context.fillStyle = pat;
        fill: new ol.style.Fill({
            color: [0,0,0,0.7]
        }),
        stroke: new ol.style.Stroke({
        color: [220,220,220,0.7],
        width: 1
        })
    });
    //This will be used to cache the style
    var styleCache = {};

    //the style function returns an array of styles for the given feature and resolution
    //Return null to hide the feature
    function styleFunction(feature, resolution){
        //get the elevation from the feature properties
        var elevation = feature.get('elevation');
        //if there is no elevation value or it's one we don't recognize,
        //return the default style
        if(!elevation) {
            return [defaultStyle];
            }
        //check the cache and create a new style for the elevation if it's not been created before.
        if(!styleCache[elevation]){
            var style_color = getStyleColor(elevation);
            styleCache[elevation] = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: style_color
                    }),
                stroke: defaultStyle.stroke
                });
            }
    //at this point, the style for the current level is in the cache so return it as an array
        return [styleCache[elevation]];
    }

    var collection = raster_elev;
    var format = new ol.format.GeoJSON();
    //map.getLayers().item(2).getSource().addFeatures(format.readFeatures(collection, {featureProjection:"EPSG:4326"}))
    var vectorSource = new ol.source.Vector({
        features: format.readFeatures(collection,
        {featureProjection:"EPSG:4326"})
        });

    var display = true;

    var vector = new ol.layer.Image({
            tethys_legend_title: titleName,
            zIndex: 1,
            source: new ol.source.ImageVector({
                source: vectorSource,
                style: styleFunction,
            }),
        });

    // Make sure that the layer is not already existing, remove it if the layer does exist
    map = TETHYS_MAP_VIEW.getMap();
    for (i = 0; i < map.getLayers().getProperties().length ; i ++){
        if (map.getLayers().item(i).getProperties().tethys_legend_title === titleName)
            map.removeLayer(map.getLayers().item(i));
    }
    vector.tethys_legend_title = 'Water Table';
    //vector.tethys_feature_selection = 'false';
    //vector.set('feature_selection', false);
    map.addLayer(vector);

    TETHYS_MAP_VIEW.updateLegend();

    map.getLayers().item(1).setZIndex(2)

    toggle_legend(true);
}

//  #################################### Toggle Color Legend On/Off ####################################################

function toggle_legend(boolean){
    var ele = "";
    var i;

    i = 1;

    do{
        if(i == 1){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)+Number(1)+Number(dwte.value*0.375)));
            i = i+1;}
        if(i == 2){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)+Number(dwte.value*0.375))) + "-" + Math.round(Number(Number(dwte.value)+Number(dwte.value*0.25)));
            i = i+1;}
        if(i == 3){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)+Number(dwte.value*0.25))) + "-" + Math.round(Number(Number(dwte.value)+Number(dwte.value*0.125)));
            i = i+1;}
        if(i == 4){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)+Number(dwte.value*0.125))) + "-" + Math.round(Number(dwte.value));
            i = i+1;}
        if(i == 5){
            document.getElementById(String(i)).innerHTML = Math.round(dwte.value) + "-" + Math.round(Number(Number(dwte.value)-Number(dwte.value*0.125)));
            i = i+1;}
        if(i == 6){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)-Number(dwte.value*0.125))) + "-" + Math.round(Number(Number(dwte.value)-Number(dwte.value*0.25)));
            i = i+1;}
        if(i == 7){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)-Number(dwte.value*0.25))) + "-" + Math.round(Number(Number(dwte.value)-Number(dwte.value*0.375)));
            i = i+1;}
        if(i == 8){
            document.getElementById(String(i)).innerHTML = Math.round(Number(Number(dwte.value)-Number(dwte.value*0.375))) + "-" + Number(1);
            i = i+1;}
    }
    while(i < 9);

    var ele = document.getElementById("colorLegend");

    if (boolean == true)
        ele.style.display = "block";
    else
        ele.style.display = "none";
};

//  #################################### Remove Features via button ####################################################


//Create public functions to be called in the controller
var app;
app = {dewater: dewater}






