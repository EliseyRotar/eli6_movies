<?php
////////////////////// SUPEREMBED PLAYER SCRIPT //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
////////////////////////// PLAYER SETTINGS ///////////////////////////////////////////////

// do not change anything outside this section

// player font - paste font name from Google fonts, replace spaces with +
$player_font = "Poppins";

// player colors - paste color code in HEX format without # eg. 123456
$player_bg_color = "000000"; // background color
$player_font_color = "ffffff"; // font color
$player_primary_color = "34cfeb"; // primary color for loader and buttons
$player_secondary_color = "6900e0"; // secondary color for hovers and elements

// player loader - you can choose a loading animation from 1 to 10
$player_loader = 1;

// preferred server - you can choose server that will be on top of the list and open after
// clicking play button, works only for quality >= 720p
// options are: vidlox = 7, fembed = 11, mixdrop = 12, upstream = 17, videobin = 18,
// doodstream = 21, streamtape = 25, streamsb = 26, voe = 29, ninjastream = 33
$preferred_server = 0; // paste only server number, leave 0 for no preference

// here you can choose source list style
// 1 = button with server count and full page overlay with server list
// 2 = button with icon and dropdown with server list
$player_sources_toggle_type = 2;

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

if(isset($_GET['video_id'])) { $video_id = $_GET['video_id']; $is_tmdb = 0; $season = 0; $episode = 0; $player_url = ""; if(isset($_GET['tmdb'])) { $is_tmdb = $_GET['tmdb']; } if(isset($_GET['season'])) { $season = $_GET['season']; } else if (isset($_GET['s'])) { $season = $_GET['s']; } if(isset($_GET['episode'])) { $episode = $_GET['episode']; } else if(isset($_GET['e'])) { $episode = $_GET['e']; } if(!empty(trim($video_id))) { $request_url = "https://getsuperembed.link/?video_id=$video_id&tmdb=$is_tmdb&season=$season&episode=$episode&player_font=$player_font&player_bg_color=$player_bg_color&player_font_color=$player_font_color&player_primary_color=$player_primary_color&player_secondary_color=$player_secondary_color&player_loader=$player_loader&preferred_server=$preferred_server&player_sources_toggle_type=$player_sources_toggle_type"; if(function_exists('curl_version')) { $curl = curl_init(); curl_setopt($curl, CURLOPT_URL, $request_url); curl_setopt($curl, CURLOPT_RETURNTRANSFER, true); curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true); curl_setopt($curl, CURLOPT_TIMEOUT, 7); curl_setopt($curl, CURLOPT_HEADER, false); curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, FALSE); $player_url = curl_exec($curl); curl_close($curl); } else { $player_url = file_get_contents($request_url); } if(!empty($player_url)) { if(strpos($player_url,"https://") !== false) { header("Location: $player_url"); } else { echo "<span style='color:red'>$player_url</span>"; } } else { echo "Request server didn't respond"; } } else { echo "Missing video_id"; } } else { echo "Missing video_id"; }

?>
