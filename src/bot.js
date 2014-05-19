// stupid !8ball glitch from preceding functions
// blackjack needs to be limited to a player at a time, 5 minute time limit
// if one person plays blackjack but is denied because of slot position, another person can't play (flood protection flaw)
// add disconnect protection, 10 minute grace period?
// roll the dice says can't roll because already DJing but reality is they're the last DJ in the queue
// add !War game to swap slots with the challenger
// ptero wants an AFK function that mass-tags all the AFKs in one go, and another function to tag everybody who doesn't meh or woot
// hourly cron no longer working???
// remove anti-spam stuffs when somebody leaves the room
// afk check never gets past the first check (10m warning)
// afk check should send one message to a bunch of ppl, not a bunch of messages to one person at a time
// change lottery to use the / instead of !, condense the entries and make less spammy
// less spam!!!!!!! only ever one active lotto or blackjack message at a time
// remove from lotto list if you leave the wait list



log("Loading bot...");

var curdate = new Date();

var skipFixEnabled  = false;
var lotteryEnabled  = false;
var blackJackEnabled= true;//(curdate.getDay() != 3 && curdate.getDay() != 6);// disable by default on meet-up days
var ReminderEnabled = false;//(curdate.getDay() == 3 || curdate.getDay() == 6);// disable reminder on non-meet days to prevent spam
var GreetingEnabled = (curdate.getDay() != 3 && curdate.getDay() != 6);// disable by default on meet-up days

var version   = "0.7.5";
var meetupUrl = "";

var trackAFKs        = [];// format: array[0=>username, 1=>userID, 2=>time of last msg, 3=>message data/txt, 4=bool warned or not]
var blackJackUsers   = [];// format: array[0=>userID, 1=> wager, 2=>user's hand array[card1, card2, ...], 3=>dealer's hand array[card1, card2, ...], 4=> deck array[0-51], 5=> active game bool false|true if game over, 6=> bool false|true if cards faceup, 7=>stand bool false|true=!stand called/forced]
var upvotes          = ["upchode", "upgrope", "upspoke", "uptoke", "upbloke", "upboat", "upgoat", "uphope", "uppope"];
var afkNames         = ["Discipliner", "Decimator", "Slayer", "Obliterator"];
var blackJackPlayer  = [Date.now(), ""];// format: array[timestamp, userid];
var blackJackPlayers = [];

var totalSongTime      = 0;
var totalSongs         = 0;
var defaultSongLength  = 4;// measured in minutes
var MaxAFKMinutes      = 30;// afk DJ max (set this var in minutes)
var blackJackTimeLimit = 5 * 60 * 1000;// 5 minute time limit per blackjack player
var disconnectGrace    = 10 * 60 * 1000;// 10 minute grace period for accidental disconnects

var lastMeetupMessageTime = (typeof lastMeetupMessageTime === "undefined") ? 0 : lastMeetupMessageTime;
var lastSkipTime          = (typeof lastSkipTime === "undefined")          ? 0 : lastSkipTime;
var lastDJAdvanceTime     = (typeof lastDJAdvanceTime === "undefined")     ? 0 : lastDJAdvanceTime;
var lastCronHourly        = (typeof lastCronHourly === "undefined")        ? 0 : lastCronHourly;
var lastCronFiveMinutes   = (typeof lastCronFiveMinutes === "undefined")   ? 0 : lastCronFiveMinutes;

var lotteryEntries = typeof lotteryEntries === "undefined" ? []   : lotteryEntries;
var lotteryUpdated = typeof lotteryUpdated === "undefined" ? true : lotteryUpdated;

var lastJoined      = "";// userID of last joined user
var lastSkipped     = "";// userID of last private track auto-skipped user
var lastLotto       = "";// msgID of the last chatted lotto entry
var lastBlackJack   = "";// msgID of the last chatted lotto entry
var scClientId      = "ff550ffd042d54afc90a43b7151130a1";// API credentials
var botID           = "531bdea096fba5070c4cad51";
var invincibear     = "52fff97b3b7903273314e678";
var nvp             = "53090acb63051f462837692e";

API.on(API.WAIT_LIST_UPDATE, onWaitListUpdate);
API.on(API.DJ_ADVANCE, onDJAdvance);
API.on(API.WAIT_LIST_UPDATE, onWaitListUpdate);
API.on(API.CHAT, onChat);
API.on(API.USER_JOIN, onJoin);
API.on(API.USER_LEAVE, onLeave);

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

function cronHourly() {// called at the start of a new hour ie. 0 minutes & seconds
    log("cronHourly() has been called!", log.info);

    var d = new Date();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var countdown = (60 * (60 - min) + (60 - sec)) * 1000;

    if (min == "00" || min == "0" || min == "01" || min == "1" || typeof min === undefined) {// browser-dependant, had to add 01 for some silly reason
        log("the hour is fresh, run additional hourly functions", log.info);
        lotteryHourly();// check to see the lottery can be activated
        ReminderEnabled = false;//(curdate.getDay() == 3 || curdate.getDay() == 6);// disable reminder on non-meet days to prevent spam
//        reminderHourly();// check to see if it is now a meetup day to activate the reminder
    }

    if (lastCronHourly == 0 || (Date.now() - lastCronHourly) >= (60 * 60 * 1000)) {// spam & resource overload prevention
        log("setting cronHourly() check for " + (countdown / 60 / 1000) + " minutes from now", log.info);
        setTimeout(cronHourly, countdown);// check back in an hour
    }

    lastCronHourly = Date.now();
}


function cronFiveMinutes() {// called every 5 minutes
    log("cronFiveMinutes() has been called! The minutes are ripe, run additional 5-minute functions", log.info);
//    checkAFKs(MaxAFKMinutes);// Check for AFK DJs

    if(lastCronFiveMinutes == 0 || (Date.now() - lastCronFiveMinutes) >= (5 * 60 * 1000)) {// spam & resource overload prevention
        log("setting cronFiveMinutes() check for " + (5 * 60) + " seconds from now", log.info);
        setTimeout(cronFiveMinutes, (5 * 60 * 1000));// check back in 5 minutes
    }

    lastCronFiveMinutes = Date.now();
}


function stop(update) {
    clearInterval(window.edmpBot);
    log("Shutting down the bot. Bye!", log.info);
    API.off();

    if(!update) {
        setTimeout(function(){log("p.s. ptero is fat", log.visible);}, 15000);
    }
}


function meetupReminder() {
    if((meetupUrl.length > 0) && ((Date.now() - lastMeetupMessageTime) > 600000)) {
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
            return commandDispatch(args , author);
        } catch(exp) {
            console.log("Error: " + exp.stack);
            return false;
        }
    }
}


function commandDispatch(args, author) {
    args[0] = args[0].substring(1);
    console.log(author + " has dispatched: \'" + args[0] + "\'" + " with args: " + args);
    return execCommand(author, args);
}


function isPlaying(username) {
    return typeof API.getDJ() !== "undefined" && API.getDJ().username == username.trim();
}


function skipDj() {
    API.moderateForceSkip();
}


function chat(text) {
    $("#chat-input-field").val("/em " + text);
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


function getUsername(userID) {
    var users = API.getUsers();

    for(var i = 0; i < users.length; i++) {
        if(users[i].id == userID.trim()) {
            return users[i].username;
        }
    }

    return null;
}


function getETA(username) {// use the countdown at the top of the page if you're the next up to play, otherwise do average song length calculations
    return (getPosition(username) == 0) ? Math.round(API.getTimeRemaining() / 60) : Math.round((getPosition(username) + 1) * getAverageTime());// round to prevent unforeseeable errors
}


function getLastChat(userID) {
//log("getLastChat(" + userID + ") called", log.info);

    for(var i = 0; i < trackAFKs.length; i++) {
        if(trackAFKs[i].indexOf(userID) == 1) {// found them!
//log("found " + trackAFKs[i][0] + " in trackAFKs getLastChat() call", log.info);
            return [trackAFKs[i][2], trackAFKs[i][4]];
        }
    }

    return -1;// didn't find the user
}


function updateAFKs(data) {
//log("updateAFKs(data) called, trackAFKs.length=" + trackAFKs.length, log.info);
    var i = 0;

    if(!trackAFKs.length) {// gotta start with somebody!
        var users = API.getUsers();

        for(i = 0; i < users.length; i++) {// Cycle through users list and populate trackAFs with them
            trackAFKs.push([users[i].username, users[i].id, Date.now(), null, false]);
            log("pushed the very first entries into trackAFKs (all of API.getUsers())", log.info);
        }
        return;
    }

    for(i = 0; i < trackAFKs.length; i++) {
//log("i=" + i + ", trackAFKs[i].indexOf(data.fromID)=" + trackAFKs[i].indexOf(data.fromID), log.info);
        if(trackAFKs[i].indexOf(data.fromID) == 1) {// Update existing entry
            trackAFKs[i][2] = Date.now();
            trackAFKs[i][4] = false;// reset AFK warning
log("updated " + data.from + " to trackAFKs", log.info);
            return;
        } else if(i == (trackAFKs.length - 1)) {// Hasn't yet chatted, add an entry
            trackAFKs.push([data.from, data.fromID, Date.now(), data.message, false]);
log("added " + data.from + " to trackAFKs", log.info);
            return;
        }
    }
}


//function checkAFKs(minutes) {// Makes sure DJs chat every x minutes, we want as much participation as possible, not AFK DJs
//log("checkAFKs(" + minutes + ") called", log.info);
//    var DJWaitList = API.getWaitList();

//    for(var i = 0; i < DJWaitList.length; i++) {// cycle through DJ wait list
//log("looping through DJWaitList, i=" + i, log.info);
//        for(var j = 0; j < trackAFKs.length; j++) {// cycle through trackAFKs to compare against
//log("looping through trackAFKs, j=" + j, log.info);
//            if(DJWaitList[i].id != botID && trackAFKs[j].indexOf(DJWaitList[i].id) == 1) {// found the waiting DJ in the trackAFKs array
//                var afkMinutes = (Date.now() - trackAFKs[j][2]) / 60 / 1000;
//log("found " + DJWaitList[i].username + " in trackAFKS[] and they've been AFK for " + afkMinutes + " minutes called by checkAFKs(" + minutes + ")", log.info);
//                if(afkMinutes >= (minutes - 10)) {// give them their first warning, 10 minutes to AFK deadline!
//                    log("AFK Checker: @" + DJWaitList[i].username + ", reply/chat within 10 minutes or you'll be removed from the DJ wait list.", log.visible);
//                    trackAFKs[j][4] = true;// set warned flag to true
//                } else if(afkMinutes >= (minutes - 5)) {// final warning, 5 minutes left to act!
//                    log("AFK Checker: @" + DJWaitList[i].username + " FINAL WARNING, reply/chat within 5 minutes or you'll be removed from the DJ wait list.", log.visible);
//                    trackAFKs[j][4] = true;// set warned flag to true
//                } else if(afkMinutes >= minutes) {// reached the AFK limit, remove from DJ wait list
//                    log("AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))] + ": @" + DJWaitList[i].username + " you've been removed from the DJ wait list, fucking wanker.", log.visible);
//                    trackAFKs[j][4] = true;// set warned flag to true
//                    API.moderateRemoveDJ(DJWaitList[i].id);// remove from DJ wait list
//                }

//                break;
//            }
//        }
//    }
//}


function checkAFKResponse(username) {// send an ACK to ppl who respond to the AFK checker
    var lastChat   = getLastChat(getId(username));
    var afkMinutes = (Date.now() - lastChat[0]) / 60 / 1000;

    if(getId(username) != botID && afkMinutes > MaxAFKMinutes && lastChat[1]) {// not bot, was afk, was already warned
        log("@" + username + " satisfied the AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))], log.visible);
    }
}


function getPosition(username) {
    return API.getWaitListPosition(getId(username));
}


function onChat(data) {
log("onChat called, data=", log.info);log(data, log.info);
    if(data.type == "message") {
        if(dispatch(data.message, data.from) && data.message.substr(0, 6) != "!8ball") {
            API.moderateDeleteChat(data.chatID);
        }
    }
    lotteryUpdate();

    if(data.type == "message" || data.type == "emote") {
        checkAFKResponse(data.from);
        updateAFKs(data);

        if (data.fromID == botID) {
            if (!checkLottoOutput(data.chatID, data.message)) {// far more like to find a lotto msg than a bj msg
                checkBlackJackOutput(data.chatID, data.message);
            }
        }
    }
}


function onDJAdvance(obj) {// Check to see if the user is repeatedly playing the same song
log(obj);
    lastPrivateSkip = Date.now();
    var songshistory = API.getHistory(); // get dj history
    var songs = [];// reset the array, don't need long-term history

    for(var i = 0; i < songshistory.length; i++) {
        if (typeof API.getDJ() !== "undefined" && songshistory[i].user.id == obj.dj.id) {
            songs.push(songshistory[i].media.id.substr(2));// find played songs by same user in history, insert into an array
        }
    }

    if(songs.length >= 4 && (songs[0] == obj.media.cid && songs[1] == obj.media.cid && songs[2] == obj.media.cid)) {
        API.moderateRemoveDJ(obj.dj.id);// third offense, remove from dj wait list
        log("@" + obj.dj.username + ", you've already played that song thrice before. Please play a different song and rejoin the DJ wait list.", log.visible);
    } else {
        if(songs.length >= 3 && (songs[0] == obj.media.cid && songs[1] == obj.media.cid)) {// second offense, skip
            API.moderateForceSkip();// skip their turn
            API.moderateMoveDJ(obj.dj.id, 1);// return them to the front of the line to try another song
            log("@" + obj.dj.username + ", you've already played that song twice before. Please play a different song or you will be removed from the DJ wait list.", log.visible);
        } else {// first offense, slap on the wrist
            if(songs.length >= 2 && songs[0] == obj.media.cid) {
                log("@" + obj.dj.username + ", you've already played that song before. Please play a different song.", log.visible);
            }
        }
    }

    setTimeout(function(){$("#woot").click();}, 2000);// auto-woot the song

    if(obj.media.id.indexOf("2:") != -1) {
        getSourceLength(obj.media.id, function(time){
            if(time == 0) {
                var DJid = getId(API.getDJ().username);

                if(lastSkipped != DJid) {
                    log("@" + API.getDJ().username + " your track is either private or missing, please line up another song in your playlist. Hurry! You've been bumped back to the front of the line!", log.visible);
                    lastSkipped = DJid;
                    privateSkip(API.getDJ().username);
                } else {
                    log("@" + API.getDJ().username + " you've now played two private/missing tracks in a row, you've been removed from the DJ wait list.", log.visible);
                    API.moderateRemoveDJ(DJid);
                }
            }
        });
    }
}


function privateSkip(user) {
    skipDj();

    var processor = setInterval(function () {
        if (user != API.getDJ().username) {
            clearInterval(processor);
            API.moderateMoveDJ(getId(user), 1);
        }
    }, 10);
}


function onJoin(user) {// greet new user after a short delay to ensure they receive the message
    if (lastJoined != user.id && GreetingEnabled) {// prevent spam in case somebody has two tabs with different plug.dj rooms
        setTimeout(function() {log("Welcome @" + user.username + "! Type !help for more information and a list of available commands.", log.visible);}, 2500);// Delay needed for new entrant to actually connect and see the msg
        lastJoined = user.id;
    }

    var admins      = API.getStaff();
    var realAdmins  = [];

    for(var i = 0; i < admins.length; i++) {
        if(admins[i].permissions >= API.ROLE.BOUNCER) {
            realAdmins.push(admins[i]);
        }
    }

    if(realAdmins.length > 1 || (realAdmins.length == 1 && realAdmins[0].id != botID)) {
        log("***ATTENTION*** Adult supervision has arrived in the form of @" + user.username + ", the most terrible of all admins.", log.visible);
    }
}


function onLeave(user) {// greet new user after a short delay to ensure they receive the message
log(user, log.info);
    if (lastJoined != user.id && GreetingEnabled) {// prevent spam in case somebody has two tabs with different plug.dj rooms, although plug.dj now has their own spam prevention for this scenario
        var admins      = API.getStaff();
        var realAdmins  = [];

        for(var i = 0; i < admins.length; i++) {
            if(admins[i].permissions >= API.ROLE.BOUNCER) {
                realAdmins.push(admins[i]);
            }
        }

        if(user.permissions >= API.ROLE.BOUNCER && (realAdmins.length < 1 || (realAdmins.length == 1 && realAdmins[0].id == botID))) {// only display msg when the LAST amdin leaves, not when anybody leaves
            log("***ATTENTION*** there are no admins left in the room. ERMERGHURD TIIIMMM TERRR PRRTTTEEEE!", log.visible);
        }
        if (user.username == "Ptero") {
            log("OH look, Princess @Ptero has left the building.", log.visible);
        }

        lastJoined = user.id;
    }
}


function onWaitListUpdate (users) {// Alert upcoming users that their set is about to start when total users > 7 if they're AFK
    if (users.length >= 7 && ((Date.now() - lastDJAdvanceTime) > 2000)) {// anti-spam measure, only msg if this function hasn't been called within 2 seconds
        log("@" + users[1].username + ", your set begins in ~" + getETA(users[1].username)+ " minutes", log.info);
    }

    lastDJAdvanceTime = Date.now();

// remove from lotto list, remove from afk check list
}


function getAverageTime() {
    var averageTime = Math.floor(totalSongTime / totalSongs / 60);
    return (isNaN(averageTime)) ? defaultSongLength : averageTime;
}


function loadXMLDoc(filename) {//From http://www.w3schools.com/dom/dom_loadxmldoc.asp
    var xHttp;
    if (window.XMLHttpRequest) {
        xHttp = new XMLHttpRequest();
    } else {// code for IE5 and IE6
        xHttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xHttp.open("GET", filename, false);
    xHttp.send();
    return xHttp.responseXML;
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
        }).fail(function() {
            callBack(0);
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


function rollTheDice(author) {
    if((API.getWaitList().length - (getPosition(author) + 1)) < 3 ) {// Must not be [3rd last - last]
        log("Wait a few songs @" + author + ", or get help with !addiction", log.visible);
        return;
    } else if(getPosition(author) == 0) {
       log("@" + author + ", you're already the next DJ, get help with !addiction", log.visible);
        return;
    } else if(getPosition(author) == -1) {//log("@" + author + ", you're already DJing, you can't move positions!", log.visible);
        return;
    }

    var x = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var y = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var dicetotal = x + y;

    if (dicetotal == 7 || x == y) {
        if ((getPosition(author) + 1 - 3) > 1) {
            API.moderateMoveDJ(getId(author), getPosition(author) + 1 - 3);
        } else {
            API.moderateMoveDJ(getId(author), 1);
        }

        log ("@" + author + ", you rolled a " + x + " and a " + y + ", congratulations! You've earned a 3 slot bump closer to the front!", log.visible);
    } else {
        log ("@" + author + ", you rolled a " + x + " and a " + y + ", you need doubles or 7 to advance.", log.visible);
        API.moderateMoveDJ(getId(author), getPosition(author) + 1 + 2);
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
        "Cannot predict now, forgot how to psyche",
        "Don't count on it",
        "Eurgh, lemme sleep, hungover as balls",
        "My sources say no",
        "Dude, I'm way too stoned of an 8ball to answer that",
        "Not a f*cking chance",
        "Who do you think I am, Ms Cleo?",
        "Does Invincibear do it in the park?",
        "I'm not sure, @Ptero's mom knows best",
        "Of all the questions you could've asked, you chose THAT one?!?!",
        "I could answer that but more importantly since your doctor is too much of a pussy to tell you this... you have AIDS."
    ];
log(args, log.info);
    if(args.length < 2) {
        log("@" + author + ", you never asked a question!? Usage: !8ball Is Invincibear dope?", log.visible);
    } else {
        log("@" + author + ", " + outcomes[Math.round(Math.random() * (outcomes.length - 1))], log.visible);
    }
}



//
// Hourly shit and general bot stuffs
//

function init() {
    window.edmpBot = window.setInterval(function(){
        meetupReminder();
    }, 10);

    analyzeSongHistory();
    cronHourly(); // hourly checks, can't depend on chatter
    cronFiveMinutes(); // 5-minute checks

    log("Loaded EDMPbot v" + version, log.visible);
}

try {
    init();
} catch(exp) {
    log("Error while initializing bot: " + exp.stack);
}
