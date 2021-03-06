// my personal token - please generate your own at https://www.mapbox.com/studio/
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kcmV3LWN0Y3QiLCJhIjoiY2twdHViaDY4MHVjaTJ4cDgxano5ajFkcyJ9.L4GGNUYXSeNfHTlVGjjtbQ';

// initialize a Mapbox map with the Basic style, centered in New York
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-2.097143, 57.140406],
    zoom: 18,
    hash: true
});

var noise_layers = ['noise_road', 'noise_retail', 'noise_rail', 'noise_industrial', 'noise_leisure', 'noise_nightlife', 'noise_shop'];

map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken }), 'bottom-right');
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

var h = 200; // size of the chart canvas
var r = h / 2; // radius of the polar histogram
var numBins = 7; // number of orientation bins spread around 360 deg.

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.style.width = canvas.style.height = h + 'px';
canvas.width = canvas.height = h;

if (window.devicePixelRatio > 1) {
    canvas.width = canvas.height = h * 2;
    ctx.scale(2, 2);
}

function updateOrientations() {
    ctx.clearRect(0, 0, h, h);

    var bearing = map.getBearing();

    ctx.save();
    ctx.translate(r, r);
    ctx.rotate(-bearing * Math.PI / 180);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();

    /* var features = map.queryRenderedFeatures({layers: ['road']});
    if (features.length === 0) {
        ctx.restore();
        return;
    } */

    /*  var ruler = cheapRuler(map.getCenter().lat);
     var bounds = map.getBounds();
     var bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
     var bins = new Float64Array(numBins);
 
     for (var i = 0; i < features.length; i++) {
         var geom = features[i].geometry;
         var lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
 
         // clip lines to screen bbox for more exact analysis
         var clippedLines = [];
         for (var j = 0; j < lines.length; j++) {
             clippedLines.push.apply(clippedLines, lineclip(lines[j], bbox));
         }
 
         // update orientation bins from each clipped line
         for (j = 0; j < clippedLines.length; j++) {
             analyzeLine(bins, ruler, clippedLines[j], features[i].properties.oneway !== 'true');
         }
     } */

    var lat = map.getCenter().lat;
    var lng = map.getCenter().lng;
    var bins = new Float64Array(numBins);
    bins = [10, 14, 56, 32, 3, 8, 0];
    if (lng < -2.098) {
        bins[0] = 20;
    } else {
        bins[1] = 10;
    }
    var binMax = Math.max.apply(null, bins);

    for (i = 0; i < numBins; i++) {
        var a0 = ((i - 0.5) * 360 / numBins - 90) * Math.PI / 180;
        var a1 = ((i + 0.5) * 360 / numBins - 90) * Math.PI / 180;
        ctx.fillStyle = interpolateSinebow((2 * i % numBins) / numBins);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * Math.sqrt(bins[i] / binMax), a0, a1, false);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function analyzeLine(bins, ruler, line, isTwoWay) {
    for (var i = 0; i < line.length - 1; i++) {
        var bearing = ruler.bearing(line[i], line[i + 1]);
        var distance = ruler.distance(line[i], line[i + 1]);

        var k0 = Math.round((bearing + 360) * numBins / 360) % numBins; // main bin
        var k1 = Math.round((bearing + 180) * numBins / 360) % numBins; // opposite bin

        bins[k0] += distance;
        if (isTwoWay) bins[k1] += distance;
    }
}

// rainbow colors for the chart http://basecase.org/env/on-rainbows
function interpolateSinebow(t) {
    t = 0.5 - t;
    var r = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 0 / 3)), 2));
    var g = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 1 / 3)), 2));
    var b = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 2 / 3)), 2));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

map.on('load', function () {
    var colourIdx = 0;
    noise_layers.forEach(layer => {
        fetch('geojson/abdn/' + layer + '.geojson')
            .then(response => response.json())
            .then(data => {
                map.addSource(layer, {
                    'type': 'geojson',
                    'data': data
                });

                map.addLayer({
                    'id': layer,
                    'type': 'fill',
                    'source': layer,
                    'layout': {
                        // Make the layer visible by default.
                        'visibility': 'visible'
                    },
                    'paint': {
                        'fill-color': interpolateSinebow((2 * colourIdx % numBins) / numBins),
                        'fill-opacity': 0.2
                    }
                });

                colourIdx = colourIdx + 1;
            })
            .catch(err => console.error(err));
    });

    // Insert the layer beneath any symbol layer.
    var layers = map.getStyle().layers;
    var labelLayerId;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    // The 'building' layer in the Mapbox Streets
    // vector tileset contains building height data
    // from OpenStreetMap.
    map.addLayer(
        {
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#aaa',

                // Use an 'interpolate' expression to
                // add a smooth transition effect to
                // the buildings as the user zooms in.
                'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height']
                ],
                'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
            }
        },

        labelLayerId
    );


    updateOrientations();
    // update the chart on moveend; we could do that on move,
    // but this is slow on some zoom levels due to a huge amount of roads
    map.on('moveend', updateOrientations);
});

// After the last frame rendered before the map enters an "idle" state.
map.on('idle', function () {
    // If these two layers have been added to the style,
    // add the toggle buttons.
    noise_layers.forEach(layer => {
        if (map.getLayer(layer)) {
            // Enumerate ids of the layers.
            var toggleableLayerIds = noise_layers;
            // Set up the corresponding toggle button for each layer.
            for (var i = 0; i < toggleableLayerIds.length; i++) {
                var id = toggleableLayerIds[i];
                if (!document.getElementById(id)) {
                    // Create a link.
                    var link = document.createElement('a');
                    link.id = id;
                    link.href = '#';
                    link.textContent = id;
                    link.className = 'active';
                    // Show or hide layer when the toggle is clicked.
                    link.onclick = function (e) {
                        var clickedLayer = this.textContent;
                        e.preventDefault();
                        e.stopPropagation();

                        var visibility = map.getLayoutProperty(
                            clickedLayer,
                            'visibility'
                        );

                        // Toggle layer visibility by changing the layout object's visibility property.
                        if (visibility === 'visible') {
                            map.setLayoutProperty(
                                clickedLayer,
                                'visibility',
                                'none'
                            );
                            this.className = '';
                        } else {
                            this.className = 'active';
                            map.setLayoutProperty(
                                clickedLayer,
                                'visibility',
                                'visible'
                            );
                        }
                    };

                    var layers = document.getElementById('menu');
                    layers.appendChild(link);
                }
            }
        }
    });

});