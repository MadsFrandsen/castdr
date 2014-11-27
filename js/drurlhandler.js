function DrUrlHandler() {
  this.mediaUrl = "";
  this.title = "";
  this.imgUrl = "";
  this.startTime = 0;
}

DrUrlHandler.prototype.getInfo = function() {
  return this.color + ' ' + this.type + ' apple';
};

DrUrlHandler.prototype.handleUrl = function(url) {
  try {
    var slugs = this.interpretDrUrl(url);
    if (slugs.isLive) {
      this.success();
    } else {
      this.fetchProgramCard(slugs.episodeSlug);
    }
  } catch (e) {
    console.log(e)
    alert("Ooops!\n" + e)
    this.onError(e)
  }
}

DrUrlHandler.prototype.interpretDrUrl = function(url) {
  var index = url.search(/dr.dk\//i)
  if (index == -1) {
    throw "Not a dr.dk url";
  }
  var pathStart = index + "dr.dk/".length;
  var path = url.substring(pathStart).split(/[\/#?~!*()';]/);

  if (path.length < 2 || "tv" != path[0]) {
    throw "Please select a program or channel on dr.dk/tv"
  }

  switch (path[1]) {
    case "se":
      return this.interpretDrProgramUrl(path);
      break;
    case "live":
      return this.interpretDrLiveUrl(path);
      break;
    default:
      throw "Please select a program or channel on dr.dk/tv\nURL path must start with /tv/se or /tv/live";
  }
}

DrUrlHandler.prototype.interpretDrProgramUrl = function(path) {
  // Remove "boern/CHANNEL" from the path.
  if (path[2] == "boern") {
    path = path.slice(2);
  }

  if (path.length < 4) {
    throw "Please select a program.\nURL is not long enough.";
  }

  // Ensure no bad characters in ids
  if (!(encodeURIComponent(path[2]) == path[2] &&
    encodeURIComponent(path[3]) == path[3])) {
    throw "Bad characters in URL";
  }

  if(path.length > 4) {
    this.startTime = parseTime(path[6])
  } else {
    this.startTime = 0;
  }

  var slugs = {
    seriesSlug: path[2],
    episodeSlug: path[3]
  };
  console.log("Program slugs found:");
  console.log(slugs);
  return slugs;
}

DrUrlHandler.prototype.interpretDrLiveUrl = function(path) {
  // DR might inject "boern" in the URL for the kids channels.
  if (path[2] == "boern") {
    if (!path[3]) {
      throw "This is not a proper live path: /tv/live/boern/";
    }
    path = path.slice(1);
  }

  // Ensure no bad characters in id
  if (path[2] && !(encodeURIComponent(path[2]) == path[2])) {
    throw "Bad characters in URL";
  }

  // The default channel is DR1 and might not be in the URL.
  var id = path[2] ? path[2] : "dr1";

  switch (id) {
    case "":
    case "dr1":
      this.title = "DR1 Live";
      this.imgUrl = "/castdr/img/dr1.jpg";
      this.mediaUrl = "http://dr01-lh.akamaihd.net/i/dr01_0@147054/master.m3u8?b=100-1600";
      break;
    case "dr2":
      this.title = "DR2 Live";
      this.imgUrl = "/castdr/img/dr2.jpg";
      this.mediaUrl = "http://dr02-lh.akamaihd.net/i/dr02_0@147055/master.m3u8?b=100-1600";
      break;
    case "dr3":
      this.title = "DR3 Live";
      this.imgUrl = "/castdr/img/dr3.jpg";
      this.mediaUrl = "http://dr03-lh.akamaihd.net/i/dr03_0@147056/master.m3u8?b=100-1600";
      break;
    case "dr-k":
      this.title = "DR K Live";
      this.imgUrl = "/castdr/img/dr-k.jpg";
      this.mediaUrl = "http://dr04-lh.akamaihd.net/i/dr04_0@147057/master.m3u8?b=100-1600";
      break;
    case "ramasjang":
    case "dr-ramasjang":
      this.title = "DR Ramasjang Live";
      this.imgUrl = "/castdr/img/dr-ramasjang.jpg";
      this.mediaUrl = "http://dr05-lh.akamaihd.net/i/dr05_0@147058/master.m3u8?b=100-1600";
      break;
    case "ultra":
    case "dr-ultra":
      this.title = "DR ULTRA Live";
      this.imgUrl = "/castdr/img/dr-ultra.jpg";
      this.mediaUrl = "http://dr06-lh.akamaihd.net/i/dr06_0@147059/master.m3u8?b=100-1600";
      break;
    default:
      throw "Unkown live channel: " + id;
  }

  console.log("Live channel found:");
  console.log(this);

  return {
    isLive: true
  }
}

DrUrlHandler.prototype.fetchProgramCard = function(slug) {
  var url = "http://www.dr.dk/mu-online/api/1.1/programcard/" + slug;
  return fetchJson(url, this.fetchManifest.bind(this));
}

DrUrlHandler.prototype.fetchManifest = function(programCard) {
  console.log("programCard")
  console.log(programCard)
  asset = programCard.PrimaryAsset;
  console.log("asset")
  console.log(asset)
  if (asset.Kind != "VideoResource") {
    throw "Not a video link";
  }
  if (asset.RestrictedToDenmark) {
    console.log("Denmark only program! Unkown international behaviour.")
  }
  this.title = programCard.Title;
  this.imgUrl = programCard.PrimaryImageUri;

  var url = asset.Uri;
  return fetchJson(url, this.selectVideoUrl.bind(this));
}

DrUrlHandler.prototype.selectVideoUrl = function(manifest) {
  console.log("manifest")
  console.log(manifest)
  for (i in manifest.Links) {
    link = manifest.Links[i]
    if (link.Target == "HLS") {
      this.mediaUrl = link.Uri;
      this.success();
      return;
    }
  }
}

DrUrlHandler.prototype.success = function() {
  this.onSuccess(this.mediaUrl, this.title, this.imgUrl, this.startTime);
}

/**
 * Callback for clients.
 */
DrUrlHandler.prototype.onSuccess = function(mediaUrl, title, imgUrl, startTime) {
  console.log("Successfully fetched DR URL:")
  console.log(this)
  console.log(mediaUrl)
  console.log(title)
  console.log(imgUrl)
}

/**
 * Callback for clients.
 */
DrUrlHandler.prototype.onError = function(errorMsg) {

}


function xhrSuccess() {
  this.callback(JSON.parse(this.responseText));
}

function xhrError() {
  console.error(this.statusText);
}

function fetchJson(sURL, fCallback) {
  console.log("Getting " + sURL)
  var oReq = new XMLHttpRequest();
  oReq.callback = fCallback;
  oReq.arguments = Array.prototype.slice.call(arguments, 2);
  oReq.onload = xhrSuccess;
  oReq.onerror = xhrError;
  oReq.open("get", sURL, true);
  oReq.send(null);
}

function parseTime(time) {
  times = time.split(':');
  parsedTime = parseInt(times[times.length - 1]);
  if(times.length > 1)
      parsedTime += parseInt(times[times.length - 2]) * 60;
  if(times.length > 2)
      parsedTime += parseInt(times[times.length - 3]) * 3600;
  return parsedTime;
}
