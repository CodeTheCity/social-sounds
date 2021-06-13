//current_coord is the missle of the screen and we want to get a certain radius
var lat = map.getCenter().lat;
var lng = map.getCenter().lng;

current_coord = (lat,lng);

list_of_visible_coordinates=[];

min_dist=10000
closest_coord = new locationCoordinates;
for (coord in list_of_visible_coordinates)
{
    //measure distance
    var xDiff = lat - coord[0]; 
	var yDiff = lng - coord[1];
	computeDistance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    if (computeDistance<min_dist)
    {
        min_dist=computeDistance;
        closest_coord = coord;
    }
    
}
//what is the index of the closest_coord
function closest_pt_to_play() {
    setTimeout(function(){ $("#jquery_jplayer_1").jPlayer("play",0); },1000);
 
//minimal distance is close to noise index 1 or 2 play media 3
//https://www.kirupa.com/html5/using_the_pythagorean_theorem_to_measure_distance.htm
var media_file = "";
switch(expression) {
    case 1:
      // code block switch to media 1
      media_file = "/media/bbc_cars---jag_07043142.mp3"
      break;
    case 2:
      // code block switch to media 2
      media_file = "/media/bbc_sheffield-_07032029.mp3"
      break;
    default:
      // code block switch to media 3
      media_file = "/media/bbc_sheffield-_07032029.mp3"
  }
}
media_file=["/media/bbc_sheffield-_07032029.mp3","/media/bbc_cars---jag_07043142.mp3","/media/bbc_sheffield-_07032029.mp3"];
media_file=media_file[Math.random(0,2)];
$("#jquery_jplayer_1").jPlayer("setMedia", {
    title: "audio",
    mp3: media_file
  }).jPlayer("play");