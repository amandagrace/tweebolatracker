//IMPORT LIBRARIES
var Twit = require('twit');
var T = new Twit(require('./config.js'));
var request = require('request');

//GEOCODING
var mqkey = 'Fmjtd%7Cluurn96an0%2Cag%3Do5-9w85hz'; //mapquest api key

//DEBUGGING MODE
var debug = false; //only prints to console if true

//QUERY
var query = {q: "#ebola", count: 10, result_type: "recent"}; /*finds recent
                                                       tweets with #ebola*/

//STORAGE
var infectedTweeters = [];
var infectedSNs = []; /*used to check if the user is infected before
                        adding them to the infectedTweeters list*/
var infectedLocations = [];
var locationNames = []; /*used to check if the location is already
                          in the infectedLocations list*/
var infectedStates = [];
var infectedCountries = [];
var USinfected = false;
var respondedTweets = [];

//This function gets the most recent tweet with #ebola and infects the tweeter
function runInfection() {
    T.get('search/tweets', query, function (error, data) {
        if (!error) {
            var tweet = data.statuses[0];
            var tweeter = tweet.user;
            infectTweeter(tweeter);
        } else {
            console.log('There was an error with your hashtag search:', error);
        }
    });
}

function infectTweeter(tweeter) {
    var tweeterSN = tweeter.screen_name;
    if (infectedSNs.indexOf(tweeterSN) == -1) {
        var tweeterLocation = tweeter.location;
        getGeocodedLocation(tweeterLocation, function(location){
            var geocodedLocation = location;
            var infectedTweeter = {screen_name: tweeterSN, location: geocodedLocation};
            infectedTweeters.push(infectedTweeter);
            infectedSNs.push(infectedTweeter.screen_name);
            updateInfectedLocations(infectedTweeter.location);
        });
    }
}

function updateInfectedLocations(location) {
    var inUS = false;
    if (location != null) {
        if (location.adminArea1 == "US") {
            location = location.adminArea3;
            inUS = true;
            if (USinfected == false) {
                infectedCountries.push("US");
                USinfected = true;
            }
        } else {
            location = location.adminArea1;
        }
        var index = locationNames.indexOf(location);
        if (index == -1 && location != '') {
            if (inUS) {
                infectedStates.push(location);
                location.concat(', US');
            } else {
                infectedCountries.push(location);
            }
            var infectedLocation = {location: location, count: 1};
            infectedLocations.push(infectedLocation);
            locationNames.push(infectedLocation.location);
        } else if (location != '') {
            var infectedLocation = infectedLocations[index];
            infectedLocation.count++;
        }
    }
}

function getGeocodedLocation(userLocation, callback) {
    userLocation = userLocation.replace(/ /g, "%20");
    userLocation = userLocation.replace(/[^a-zA-Z0-9-_%]/g, '');
    var url = 'http://www.mapquestapi.com/geocoding/v1/address?key='.concat(mqkey)
        .concat('&inFormat=kvp&outFormat=json&location=').concat(userLocation)
        .concat('&maxResults=1');
    request(url, function(err, response, data) {
        if (err != null) { return; }
        var locationData = JSON.parse(data);
        var location = locationData.results[0].locations[0];
        if (location != null) {
            callback(location);
        }
    });
}

function respondToMention() {
    T.get('statuses/mentions_timeline', {count:10, include_rts:0},  function (err, reply) {
        if (err != null) {
            console.log('Error: ', err);
        }
        else {
            var mention = reply[0];
            if (mention != null && respondedTweets.indexOf(mention.id_str) == -1){
                var mentionContent = mention.text;
                var mentioner = mention.user.screen_name;

                if (mentionContent.indexOf('#tweebolaStates') != -1 ||
                    mentionContent.indexOf('#tweebolastates') != -1) {
                    var response = "@".concat(mentioner).concat(" Infected States: ").concat(infectedStates.toString());
                    T.post('statuses/update', {status: response}, function(err, reply) {
                        if (err != null) {
                            console.log('Error: ', err);
                        } else {
                            console.log('Tweeted: ', response);
                            respondedTweets.push(mention.id_str);
                        }
                    });
                }

                if (mentionContent.indexOf('#tweebolaCountries') != -1 ||
                    mentionContent.indexOf('#tweebolacountries') != -1) {
                    var response = "@".concat(mentioner).concat(" Infected Countries: ").concat(infectedCountries.toString());
                    T.post('statuses/update', {status: response}, function(err, reply) {
                        if (err != null) {
                            console.log('Error: ', err);
                        } else {
                            console.log('Tweeted: ', response);
                            respondedTweets.push(mention.id_str);
                        }
                    });
                }

              /*  if (mentionContent.indexOf('#infectionStatus') != -1 ||
                    mentionContent.indexOf('#infectionstatus') != -1) {
                    if (infectedSNs.indexOf(mentioner) > -1) {
                        var response = "@".concat(mentioner).concat(" Yes, you've caught #tweebola! Consider donating to people who are actually sick. http://www.cdcfoundation.org/ebola-outbreak #ebola");
                        T.post('statuses/update', {status: response}, function(err, reply) {
                            if (err != null) {
                                console.log('Error: ', err);
                            } else {
                                console.log('Tweeted: ', response);
                                respondedTweets.push(mention.id_str);
                            }
                        });
                    } else {
                        var response = "@".concat(mentioner).concat(" You don't have #tweebola! Consider donating to people who are actually sick. http://www.cdcfoundation.org/ebola-outbreak #ebola");
                        T.post('statuses/update', {status: response}, function (err, reply) {
                            if (err != null) {
                                console.log('Error: ', err);
                            } else {
                                console.log('Tweeted: ', response);
                                respondedTweets.push(mention.id_str);
                            }
                        });
                    }
                } */

                if (mentionContent.indexOf('#whatisTweebola') != -1 ||
                    mentionContent.indexOf('#whatistweebola') != -1 ||
                    mentionContent.indexOf('#whatIsTweebola') != -1) {
                    var response = "@".concat(mentioner).concat(" #Tweebola is a Twitter based disease of #ebola paranoia. Help those whose fears are warranted: http://www.cdcfoundation.org/ebola-outbreak");
                    T.post('statuses/update', {status: response}, function (err, reply) {
                        if (err != null) {
                            console.log('Error: ', err);
                        } else {
                            console.log('Tweeted: ', response);
                            respondedTweets.push(mention.id_str);
                        }
                    });
                }
            }
        }
    });
}

function hourlyTweebolaUpdate() {
    var mostInfectedLocation = infectedLocations[0];
    if (mostInfectedLocation != null) {
        var topValue = infectedLocations[0].count;
    }
    for (var i = 1; i < infectedLocations.length; i++) {
        if (infectedLocations[i].count > topValue) {
            mostInfectedLocation = infectedLocations[i];
            topValue = infectedLocations[i].count;
        }
    }
    var update = 'Tweebola Cases: '.concat(infectedTweeters.length)
        .concat('\nInfected Countries: ').concat(infectedCountries.length)
        .concat('\nInfected States: ').concat(infectedStates.length);
    if (mostInfectedLocation != null) {
        update = update.concat('\nMost Infected Region: '.concat(mostInfectedLocation.location))
            .concat("\nRegion's #tweebola count: ").concat(mostInfectedLocation.count);
        if (mostInfectedLocation.location == "TX, US") {
            update = update.concat("\nRegion's #ebola count: 3");
        } else if (mostInfectedLocation.location == "NY, US") {
            update = update.concat("\nRegion's #ebola count: 1");
        } else if (mostInfectedLocation.location == "ES") {
            update = update.concat("\nRegion's #ebola count: 1");
        } else if (mostInfectedLocation.location == "ML") {
            update = update.concat("\nRegion's #ebola count: 1");
        } else if (mostInfectedLocation.location == "SN") {
            update = update.concat("\nRegion's #ebola count: 1");
        } else if (mostInfectedLocation.location == "GN") {
            update = update.concat("\nRegion's #ebola count: 1906+");
        } else if (mostInfectedLocation.location == "SL") {
            update = update.concat("\nRegion's #ebola count: 5235+");
        } else if (mostInfectedLocation.location == "LR") {
            update = update.concat("\nRegion's #ebola count: 6535+");
        } else if (mostInfectedLocation.location == "NG") {
            update = update.concat("\nRegion's #ebola count: 20");
        } else {
            update = update.concat("\nRegion's #ebola count: 0");
        }
    }
    if (debug) {
        console.log(update);
    } else {
        T.post('statuses/update', {status: update}, function(err, reply) {
            if (err != null) {
                console.log('Error: ', err);
            } else {
                console.log('Tweeted: ', update);
            }
        });
    }
}

runInfection();
setInterval(runInfection, 1000 * 10);
setInterval(respondToMention, 1000 * 120);
setInterval(hourlyTweebolaUpdate, 1000 * 60 * 60);