/**
 * User: Marko
 * Date: 3/8/14
 * Time: 9:20 PM
 */
// fix dice position moving stuff (need a full room to test with)
// populate trackAFKs with room list upon !update
// add time checks to cron timers to prevent spam that will snowball out of control
// fix 8ball not working when @author is used (invincibear note: can't recreate the problem anymore?)

log("Loading bot...");

var curdate = new Date();

var skipFixEnabled = false;
var lotteryEnabled = false;
var ReminderEnabled = (curdate.getDay() == 3 || curdate.getDay() == 6);// disable reminder on non-meet days to prevent spam

var version = "0.4.5";
var meetupUrl = "http://reddit.com/r/edmproduction/";

var trackAFKs = []; // [0=>username, 1=>userID, 2=>time of last msg, 3=>message data/txt]
var upvotes = ["upChode", "upGrope", "upSpoke", "upToke", "upBloke", "upBoat", "upGoat", "upHope", "upPope"];

var totalSongTime = 0, totalSongs = 0;
var defaultSongLength = 4;// measured in minutes
var MaxAFKMinutes = 2;// 90m/1.5hr afk DJ max (set this var in minutes)

var lastMeetupMessageTime = (typeof lastMeetupMessageTime === "undefined") ? 0 : lastMeetupMessageTime;
var lastPrivateSkip =       (typeof lastPrivateSkip === "undefined")       ? 0 : lastPrivateSkip;
var lastSkipTime =          (typeof lastSkipTime === "undefined")          ? 0 : lastSkipTime;
var lastDJAdvanceTime =     (typeof lastDJAdvanceTime === "undefined")     ? 0 : lastDJAdvanceTime;
var lastCronHourly =        (typeof lastCronHourly === "undefined")        ? 0 : lastCronHourly;
var lastCronFiveMinutes =   (typeof lastCronFiveMinutes === "undefined")   ? 0 : lastCronFiveMinutes;

var lotteryEntries = typeof lotteryEntries === "undefined" ? []   : lotteryEntries;
var lotteryUpdated = typeof lotteryUpdated === "undefined" ? true : lotteryUpdated;

var lastJoined = "";
var scClientId = "ff550ffd042d54afc90a43b7151130a1";

API.on(API.WAIT_LIST_UPDATE, onWaitListUpdate);
API.on(API.DJ_ADVANCE, onDJAdvance);
API.on(API.CHAT, onChat);
API.on(API.USER_JOIN, onJoin);

log.info = 3;
log.visible = 2;


function log(message, level) {
    level = (typeof level === "undefined") ? log.info : level;

    if(level < log.info) {
        console.log("Chatting: ");
        chat(message);
    }

    console.log(message);
}


function updateBot() {
    log("Restarting in 2 seconds...", log.info);
    stop(true);
    log("Starting timeout... ", log.info);
    setTimeout(function(){
        $.getScript("https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js");
    }, 2000);
}


function cronHourly() {
    log("cronHourly() has been summoned!", log.info);

    var d = new Date();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var countdown = (60 * (60 - min) + (60 - sec)) * 1000;

    if (min == "00" || min == "0" || typeof min === undefined) {// browser-dependant
        log("the hour is fresh, run additional hourly functions", log.info);
        lotteryHourly();// check to see the lottery can be activated
        reminderHourly();// check to see if it is now a meetup day to activate the reminder
    }

    log("setting cronHourly() check for " + (countdown / 1000) + " seconds from now", log.info);
    setTimeout(cronHourly, countdown);// check back in an hour
}


function cronFiveMinutes() {
    log("cronFiveMinutes() has been summoned! The minutes are ripe, run additional 5-minute functions", log.info);
    checkAFKs(MaxAFKMinutes);// Check for AFK DJs

log("Date.now() - lastCronFiveMinutes=" + (Date.now() - lastCronFiveMinutes), log.info);
    if((Date.now() - lastCronFiveMinutes) > (5 * 60 * 1000)) {// spam prevention
        log("setting cronFiveMinutes() check for " + (5 * 60) + " seconds from now", log.info);
        setTimeout(cronFiveMinutes, (5 * 60 * 1000));
    }// check back in 5 minutes

    lastCronFiveMinutes = Date.now();
}


function stop(update) {
    clearInterval(window.edmpBot);
    log("Shutting down the bot. Bye!", log.visible);
    API.off();

    if(!update) {
        setTimeout(function(){
            log("p.s. ptero is fat", log.visible);
        }, 15000);
    }
}


function skipFix() {
    if(lastSkipTime < 1) {
        lastSkipTime = Date.now();
        return;
    }

    var times = $("#now-playing-time").children(":last").html().split(":");

    if(times[0] < 1 && times[1] < 1) {
        var timeN = Date.now();

        if(timeN - lastSkipTime > 5000) {
            log("Skipping due to lag", 1);
            commandDispatch("!skip", API.getUser().username.trim());
        }
    }
}


function meetupReminder() {
    if(ReminderEnabled && (meetupUrl.length > 0) && ((Date.now() - lastMeetupMessageTime) > 600000)) {
        chat("Make sure to " + upvotes[Math.round(Math.random() * (upvotes.length - 1))] + " the /r/edmp thread at " + meetupUrl + "!");
        lastMeetupMessageTime = Date.now();
    }
}


function dispatch(message, author) {
//log("Dispatching message: " + message);
    while(true) {
        if(message.indexOf("<a") == -1) {
            break;
        }

        var start = message.indexOf("<a");
        console.log("start:" + start);
        var end = message.indexOf("a>");
        console.log("end:" + end);
        var link = $(message.substr(start, end)).attr("href");
        console.log("link:" + link);

        message = message.split(message.substr(start, end));
        message = message[0] + link + message[1];
    }
    message = message.replace(/&nbsp;/g, '');

    if(message.match(/(^!)(!?)/)) {
        message = message.substr(message.indexOf("!"));
        try {
            var args = message.split(" ");
            console.log("args:" + args);
            commandDispatch(args , author);
        } catch(exp) {
            console.log("Error: " + exp.stack);
        }
    }
}


function commandDispatch(args, author) {
    args[0] = args[0].substring(1);
    console.log(author + " has dispatched: \'" + args[0] + "\'" + " with args: " + args);
    execCommand(author, args);
}


function isPlaying(username) {
    return typeof API.getDJ() !== "undefined" && API.getDJ().username == username.trim();
}


function moveToFirst(username) {
    API.moderateMoveDJ(getId(username), 1);
}


function skipDj() {
    API.moderateForceSkip();
}


function chat(text) {
    $("#chat-input-field").val("/me " + text);
    var e = $.Event('keydown');
    e.which = 13;
    $('#chat-input-field').trigger(e);
}


function getPermLevel(username) {
    return API.getUser(getId(username)).permission;
}


function getId(username) {
    var users = API.getUsers();

    for(var i = 0; i < users.length; i++) {
        if(users[i].username == username.trim()) {
            return users[i].id;
        }
    }

    return null;
}


function getETA(username) {// use the countdown at the top of the page if you're the next up to play, otherwise do average song length calculations
    var current = $("#now-playing-time").children(":last").html().split(":");
    current[0] = (current[0][0] == "0") ? current[0][1] : current[0];// strip leading 0 from minutes
    var totalSeconds = parseFloat(current[0] * 60) + parseFloat(current[1]);

    return (getPosition(username) == 0) ? Math.round(totalSeconds / 60) : Math.round((getPosition(username) + 1) * getAverageTime());// round to prevent unforeseeable errors
}


function getLastChat(username) {
    log("getLastChat called", log.info);

    for (var i = 0; i < trackAFKs.length; i++) {
//log("i=" + i + ", trackAFKs[i].indexOf(data.fromID)=" + trackAFKs[i].indexOf(data.fromID), log.info);
        if (trackAFKs[i].indexOf(data.fromID) == 1) {// found them!
            return trackAFKs[i][2];
        }
    }

    return -1;// didn't find the user
}


function updateAFKs(data) {
//    log("updateAFKs called, trackAFKs.length=" + trackAFKs.length, log.info);
    if (!trackAFKs.length) {// gotta start with somebody!
        trackAFKs.push([data.from, data.fromID, Date.now(), data.message]);
        log("pushed the very first entry into trackAFKs", log.info);
        return;
    }

    for (var i = 0; i < trackAFKs.length; i++) {
//log("i=" + i + ", trackAFKs[i].indexOf(data.fromID)=" + trackAFKs[i].indexOf(data.fromID), log.info);
        if (trackAFKs[i].indexOf(data.fromID) == 1) {// Update existing entry
            trackAFKs[i][2] = Date.now();
            return;
        } else if (i == (trackAFKs.length - 1)) {// Hasn't yet chatted, add an entry
            trackAFKs.push([data.from, data.fromID, Date.now(), data.message]);
            return;
        }
    }
}


function checkAFKs(minutes) {
    log("checkAFKs summoned", log.info);
    var DJWaitList = API.getWaitList();

    for (var i = 0; i < DJWaitList.length; i++) {// cycle through DJ wait list
        for (var j = 0; j < trackAFKs.length; j++) {// cycle through trackAFKs to compare against
            if (trackAFKs[j].indexOf(DJWaitList[i].username) == 1) {// found the waiting DJ in the trackAFKs array
                var afkMinutes = (Date.now() - trackAFKs[j][2]) / 1000;
                var afkName = ["Discipliner", "Decimator", "Slayer", "Obliterator"];

                if (afkMinutes >= (minutes - 10)) {// give them their first warning, 10 minutes to AFK deadline!
                    log("AFK Checker: @" + DJWaitList[i].username + ", reply/chat within 10 minutes or you'll be removed from the DJ wait list.", log.visible);
                } else if (afkMinutes >= (minutes - 5)) {// final warning, 5 minutes left to act!
                    log("AFK Checker: @" + DJWaitList[i].username + " FINAL WARNING, reply/chat within 5 minutes or you'll be removed from the DJ wait list.", log.visible);
                } else if (afkMinutes <= minutes) {// reached the AFK limit, remove from DJ wait list
                    log("AFK " + afkName[Math.round(Math.random() * (afkName.length - 1))] + ": @" + DJWaitList[i].username + " you've been removed from the DJ wait list, fucking wanker.", log.visible);
                    API.moderateRemoveDJ(DJWaitList[i].id);// remove from DJ wait list
                }

                break;
            }
        }
    }
}


function checkAFKResponse(username) {
// send an ACK to ppl who respond to the AFK checker
}

function getPosition(username) {
    return API.getWaitListPosition(getId(username));
}


function onChat(data) {
//log ("onChat called, data.type=" + data.type, log.info);
    if(data.type == "message") {
        dispatch(data.message, data.from);
    }
    lotteryUpdate();

    if(data.type == "message" || data.type == "emote") {
        updateAFKs(data);
    }
}


// Check to see if the user is repeatedly playing the same song
function onDJAdvance(obj) {
    lastPrivateSkip = Date.now();
// check if upcoming song & previously played song is the same
//if same, send an @author chat warning
// if same 2x, send an @author chat warning, skip the track
// if same 3x, send an @author chat warning and remove from DJ list
    var songshistory = API.getHistory(); // get dj history
    var songs = [];

    for(var i = 0; i < songshistory.length; i++) {
        if (typeof API.getDJ() !== "undefined" && songshistory[i].user.id == API.getDJ().id) {
            songs.push(songshistory[i].media.id.substr(2));// find played songs by same user in history, insert into an array
        }
    }

    if (songs.length >= 4 && (songs[0] == API.getMedia().cid && songs[1] == API.getMedia().cid && songs[2] == API.getMedia().cid)) {
        API.moderateRemoveDJ(API.getDJ().id);// third offense, remove from dj wait list
        API.moderateForceSkip();// skip their turn
        log("@" + API.getDJ().username + ", you've already played that song thrice before. Please play a different song and rejoin the DJ wait list.", log.visible);
    } else {
        if (songs.length >= 3 && (songs[0] == API.getMedia().cid && songs[1] == API.getMedia().cid)) {// second offense, skip
            API.moderateForceSkip();// skip their turn
            API.moderateMoveDJ(API.getDJ().id, 1);// return them to the front of the line to try another song
            log("@" + API.getDJ().username + ", you've already played that song twice before. Please play a different song or you will be removed from the DJ wait list.", log.visible);
        } else {// first offense, slap on the wrist
            if (songs.length >= 2 && songs[0] == API.getMedia().cid) {
                log("@" + API.getDJ().username + ", you've already played that song before. Please play a different song.", log.visible);
            }
        }
    }
}


function onJoin(user) {// greet new user after a short delay to ensure they receive the message
    if (lastJoined != user.id) {// prevent spam in case somebody has two tabs with different plug.dj rooms
        setTimeout(function() {log("Welcome @" + user.username + "! Type !help for more information and a list of available commands.", log.visible);}, 2000);
        lastJoined = user.id;
    }
}


function onWaitListUpdate (users) {// Alert upcoming users that their set is about to start when total users > 7 if they're AFK
    if (users.length >= 7 && ((Date.now() - lastDJAdvanceTime) > 2000)) {// anti-spam measure, only msg if this function hasn't been called within 2 seconds
        log("@" + users[1].username + ", your set begins in ~" + getETA(users[1].username)+ " minutes", log.info);
    }

    lastDJAdvanceTime = Date.now();
}


function getAverageTime() {
    var averageTime = Math.floor(totalSongTime / totalSongs / 60);
    return (isNaN(averageTime)) ? defaultSongLength : averageTime;
}


function loadXMLDoc(filename) {//From http://www.w3schools.com/dom/dom_loadxmldoc.asp
    if (window.XMLHttpRequest) {
        xhttp=new XMLHttpRequest();
    } else {// code for IE5 and IE6
        xhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }

    xhttp.open("GET",filename,false);
    xhttp.send();
    return xhttp.responseXML;
}


function getSourceUrl(id, callBack) {
    if(isSc(id)) {
        getScUrl(id.split(":")[1], callBack);
    } else {
        getYtUrl(id.split(":")[1], callBack);
    }
}


function getScUrl(soundId, callBack) {
    $.getJSON("http://api.soundcloud.com/tracks/" + soundId + ".json?client_id=" + scClientId,
        function(e){
            callBack(e.permalink_url);
        });
}


function getYtUrl(videoId, callBack) {
    callBack($(loadXMLDoc("http://gdata.youtube.com/feeds/api/videos/" + videoId).getElementsByTagName("player")).attr("url"));
}


function isSc(id) {
    id = id.split(":");
    return (id[0] == 2 || id[0] == "2");
}


function getSourceLength(id, callBack) {
    if(isSc(id)) {
        getScLengthSeconds(id.split(":")[1], callBack);
        log("getScLengthSeconds, here's the id=" + id + ", id.split(':')[1]=" + id.split(":")[1], log.info);
    } else {
        getYtVidSeconds(id.split(":")[1], callBack);
        log("getYtVidSeconds, here's the id=" + id + ", id.split(':')[1]=" + id.split(":")[1], log.info);
    }
}


function getScLengthSeconds(soundId, callBack) {
    $.getJSON("http://api.soundcloud.com/tracks/" + soundId + ".json?client_id=" + scClientId,
        function(e){
            callBack(e.duration / 1000);
        });
}


function getYtVidSeconds(videoId, callBack) {
    callBack($(loadXMLDoc("http://gdata.youtube.com/feeds/api/videos/" + videoId).getElementsByTagName("duration")).attr("seconds"));
}


function analyzeSongHistory() {
    var history = API.getHistory();

    for (var i = 0; i < history.length; i++) {
        try {
            getSourceLength(history[i].media.id, function(seconds){
                var Sseconds = (isNaN(parseFloat(seconds))) ? (defaultSongLength * 60) : parseFloat(seconds);// failsafe
                totalSongs++;

//log("media.id=" + history[i].media.id + ", Sseconds=" + Sseconds, log.info);
                totalSongTime += Sseconds;
//log("Time changed to " + totalSongTime, log.info);
            });
        } catch(err) {
            console.error(err);
            log("Getting song length failed. history[" + i + "].media.id=" + history[i].media.id, log.info);
        }
    }
}


function rollTheDice (author) {
    if ((API.getWaitList().length - (getPosition(author) + 1)) > 3 ) {// Must not be [3rd last - last]
        log("@" + author + ", you can't roll if you're fresh on the DJ wait list, wait a few songs or get help by typing !addiction", log.visible);
        return;
    } else if (getPosition(author) == -1) {
        log("@" + author + ", you're already DJing, you can't move positions!", log.visible);
        return;
    } else if (getPosition(author) == 0) {
        log("@" + author + ", you're already the next to DJ, type !addiction for help with your problem.", log.visible);
        return;
    }

    var x = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var y = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var dicetotal = x + y;

    if (dicetotal == 7) {
        if ((getPosition(author) - 4) < 1) {
            API.moderateMoveDJ(getId(author), getPosition(author) - 4);
            log ("@" + author + ", you rolled a " + x + " and a " + y + ", congratulations, you've earned a 3 slot bump closer to the front!", log.visible);
        } else {
            API.moderateMoveDJ(getId(username), 1);
            log ("@" + author + ", you rolled a " + x + " and a " + y + ", congratulations, you've earned a 5 slot bump to the front of the line!", log.visible);
        }
    } else if (x == y) {
        log ("@" + author + ", you rolled doubles congrats! You neither advance nor retard a position, close call!")
    } else {
        API.moderateMoveDJ(getId(author), getPosition(author) + 2);
        log ("@" + author + ", you rolled a " + x + " and a " + y + ", you need doubles or 7 to not lose position!", log.visible);
    }
}

function eightball(author, args) {
    var outcomes = [
        "It is certain",
        "You need to spend $99 on a 9ball upgrade to answer that",
        "Without a doubt",
        "Yes definitely",
        "You may rely on it",
        "Why don't you hire a therapist instead",
        "Most likely",
        "Yes",
        "Alien signs point to yes",
        "Reply hazy try again",
        "Ask again later",
        "Better not tell you now",
        "Cannot predict now, forgot how to psyche",
        "Concentrate and ask again",
        "Don't count on it",
        "Eurgh, lemme sleep, hungover as balls",
        "My sources say no",
        "Dude, I'm way too stoned of an 8ball to answer that",
        "Not a f*cking chance",
        "Who do you think I am, Ms Cleo?",
        "Does Invincibear do it in the park?",
        "I'm not sure, @Ptero's mom knows best",
        "Of all the questions you could've asked, you chose THAT one?!?!"
    ];

    if(args.length < 2) {
        log("@" + author + ", you never asked a question!? Usage: !8ball Is Invincibear dope?", log.visible);
    } else {
        log("@" + author + ", " + outcomes[Math.round(Math.random() * outcomes.length)], log.visible);
    }
}


function lotteryHourly() {// enable or disable the lottery
    lotteryEnabled = (API.getWaitList().length >= 7);// disable lottery unless 7+ DJs queued

    if (lotteryEnabled) {
        log("The lottery is now open, type !lottery for a chance to be bumped to #1 in the DJ wait list!", log.visible);
    } else {
        log("lotteryEnabled = false at lotteryHourly()", log.info)
    }
}


function lotteryUpdate() {
    if(new Date().getMinutes() >= 10){
        if(lotteryUpdated)
            return;
        lotteryUpdated = true;

        if(lotteryEntries.length > 1) {
            var winner = lotteryEntries[Math.round(Math.random() * lotteryEntries.length)];

            if(API.getWaitListPosition(getId(winner)) < 0) {
                lotteryUpdated = false;
                return;
            }

            log("@" + winner + " has won the hourly lottery! The lottery occurs hourly. Type !lottery within 10 minute of the next hour for a chance to win!", log.visible);
            moveToFirst(winner);
        } else {
            if (lotteryEnabled) {
                log("Resetting lottery. Not enough contestants. The lottery occurs hourly. Type !lottery within 10 minutes of the next hour for a chance to win!", log.visible);
            }
        }
        lotteryEntries = [];
    } else {
        lotteryUpdated = false;
    }
}


function reminderHourly() {// Check for a new day
    curdate = new Date();
    ReminderEnabled = (curdate.getDay() == 3 || curdate.getDay() == 6);// only enables on Wednesdays & Saturdays
}


analyzeSongHistory();
cronHourly();// hourly checks, can't depend on chatter
cronFiveMinutes();// 5-minute checks

window.edmpBot = window.setInterval(function(){
    if(skipFixEnabled) {
        skipFix();
    }
    meetupReminder();
}, 10);

log("Loaded EDMPbot v" + version, log.visible);