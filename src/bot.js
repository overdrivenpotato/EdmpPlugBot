/**
 * User: Marko
 * Date: 3/8/14
 * Time: 9:20 PM
 */
// fix dice position moving stuff (need a full room to test with)
// add secret commands that don't list in !help
// auto-like played songs
// stupid !8ball glitch from preceding functions
// tell the channel when an admin joins (when there wasn't one before)
// tell the channel when all the admins leave (party!!!!)
// add blackjack game to skip 21 slots


log("Loading bot...");

var curdate = new Date();

var skipFixEnabled  = false;
var lotteryEnabled  = false;
var ReminderEnabled = (curdate.getDay() == 3 || curdate.getDay() == 6);// disable reminder on non-meet days to prevent spam

var version   = "0.6.4";
var meetupUrl = "http://reddit.com/r/edmproduction/";

var trackAFKs      = [];// format: array[0=>username, 1=>userID, 2=>time of last msg, 3=>message data/txt, 4=bool warned or not]
var deck           = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, "J", "J", "J", "J", "Q", "Q", "Q", "Q", "K", "K", "K", "K", "A", "A", "A", "A"];//joker needed because probability of getting a 0 with currently implemented random logic is stupid low
var blackJackUsers = [];// format: array[0=>userID, 1=> wager, 2=>user's hand array[card1, card2, ...], 3=>dealer's hand array[card1, card2, ...], 4=> deck array[0-51], 5=> active game bool false|true if game over, 6=> bool false|true if cards faceup, 7=>stand bool false|true=!stand called/forced]
var upvotes        = ["upChode", "upGrope", "upSpoke", "upToke", "upBloke", "upBoat", "upGoat", "upHope", "upPope"];
var afkNames       = ["Discipliner", "Decimator", "Slayer", "Obliterator"];

var totalSongTime     = 0;
var totalSongs        = 0;
var defaultSongLength = 4;// measured in minutes
var MaxAFKMinutes     = 90;// 90m/1.5hr afk DJ max (set this var in minutes)

var lastMeetupMessageTime = (typeof lastMeetupMessageTime === "undefined") ? 0 : lastMeetupMessageTime;
var lastPrivateSkip       = (typeof lastPrivateSkip === "undefined")       ? 0 : lastPrivateSkip;
var lastSkipTime          = (typeof lastSkipTime === "undefined")          ? 0 : lastSkipTime;
var lastDJAdvanceTime     = (typeof lastDJAdvanceTime === "undefined")     ? 0 : lastDJAdvanceTime;
var lastCronHourly        = (typeof lastCronHourly === "undefined")        ? 0 : lastCronHourly;
var lastCronFiveMinutes   = (typeof lastCronFiveMinutes === "undefined")   ? 0 : lastCronFiveMinutes;

var lotteryEntries = typeof lotteryEntries === "undefined" ? []   : lotteryEntries;
var lotteryUpdated = typeof lotteryUpdated === "undefined" ? true : lotteryUpdated;

var lastJoined = "";// userID of last joined user
var scClientId = "ff550ffd042d54afc90a43b7151130a1";// API credentials
var botID      = "531bdea096fba5070c4cad51";

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
    log("Starting 2s loader timer... ", log.info);
    setTimeout(function(){$.getScript("https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js");}, 2000);
}


function cronHourly() {// called at the start of a new hour ie. 0 minutes & seconds
    log("cronHourly() has been called!", log.info);

    var d = new Date();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var countdown = (60 * (60 - min) + (60 - sec)) * 1000;

    if (min == "00" || min == "0" || typeof min === undefined) {// browser-dependant
        log("the hour is fresh, run additional hourly functions", log.info);
        lotteryHourly();// check to see the lottery can be activated
        reminderHourly();// check to see if it is now a meetup day to activate the reminder
    }

    if (lastCronHourly == 0 || (Date.now() - lastCronHourly) >= (60 * 60 * 1000)) {// spam & resource overload prevention
        log("setting cronHourly() check for " + (countdown / 60 / 1000) + " minutes from now", log.info);
        setTimeout(cronHourly, countdown);// check back in an hour
    }

    lastCronHourly = Date.now();
}


function cronFiveMinutes() {// called every 5 minutes
    log("cronFiveMinutes() has been called! The minutes are ripe, run additional 5-minute functions", log.info);
    checkAFKs(MaxAFKMinutes);// Check for AFK DJs

    if(lastCronFiveMinutes == 0 || (Date.now() - lastCronFiveMinutes) >= (5 * 60 * 1000)) {// spam & resource overload prevention
        log("setting cronFiveMinutes() check for " + (5 * 60) + " seconds from now", log.info);
        setTimeout(cronFiveMinutes, (5 * 60 * 1000));// check back in 5 minutes
    }

    lastCronFiveMinutes = Date.now();
}


function stop(update) {
    clearInterval(window.edmpBot);
    log("Shutting down the bot. Bye!", log.visible);
    API.off();

    if(!update) {
        setTimeout(function(){log("p.s. ptero is fat", log.visible);}, 15000);
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


function checkAFKs(minutes) {// Makes sure DJs chat every x minutes, we want as much participation as possible, not AFK DJs
//log("checkAFKs(" + minutes + ") called", log.info);
    var DJWaitList = API.getWaitList();

    for(var i = 0; i < DJWaitList.length; i++) {// cycle through DJ wait list
//log("looping through DJWaitList, i=" + i, log.info);
        for(var j = 0; j < trackAFKs.length; j++) {// cycle through trackAFKs to compare against
//log("looping through trackAFKs, j=" + j, log.info);
            if(DJWaitList[i].id != botID && trackAFKs[j].indexOf(DJWaitList[i].id) == 1) {// found the waiting DJ in the trackAFKs array
                var afkMinutes = (Date.now() - trackAFKs[j][2]) / 60 / 1000;
//log("found " + DJWaitList[i].username + " in trackAFKS[] and they've been AFK for " + afkMinutes + " minutes called by checkAFKs(" + minutes + ")", log.info);
                if(afkMinutes >= (minutes - 10)) {// give them their first warning, 10 minutes to AFK deadline!
                    log("AFK Checker: @" + DJWaitList[i].username + ", reply/chat within 10 minutes or you'll be removed from the DJ wait list.", log.visible);
                    trackAFKs[j][4] = true;// set warned flag to true
                } else if(afkMinutes >= (minutes - 5)) {// final warning, 5 minutes left to act!
                    log("AFK Checker: @" + DJWaitList[i].username + " FINAL WARNING, reply/chat within 5 minutes or you'll be removed from the DJ wait list.", log.visible);
                    trackAFKs[j][4] = true;// set warned flag to true
                } else if(afkMinutes >= minutes) {// reached the AFK limit, remove from DJ wait list
                    log("AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))] + ": @" + DJWaitList[i].username + " you've been removed from the DJ wait list, fucking wanker.", log.visible);
                    trackAFKs[j][4] = true;// set warned flag to true
                    API.moderateRemoveDJ(DJWaitList[i].id);// remove from DJ wait list
                }

                break;
            }
        }
    }
}


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
//log ("onChat called, data.type=" + data.type, log.info);
    if(data.type == "message") {
        dispatch(data.message, data.from);
    }
    lotteryUpdate();

    if(data.type == "message" || data.type == "emote") {
        checkAFKResponse(data.from);
        updateAFKs(data);
    }
}


function onDJAdvance(obj) {// Check to see if the user is repeatedly playing the same song
    lastPrivateSkip = Date.now();
    var songshistory = API.getHistory(); // get dj history
    var songs = [];// reset the array, don't need long-term history

    for(var i = 0; i < songshistory.length; i++) {
        if (typeof API.getDJ() !== "undefined" && songshistory[i].user.id == obj.dj.id) {
            songs.push(songshistory[i].media.id.substr(2));// find played songs by same user in history, insert into an array
        }
    }

    if (songs.length >= 4 && (songs[0] == obj.media.cid && songs[1] == obj.media.cid && songs[2] == obj.media.cid)) {
        API.moderateRemoveDJ(obj.dj.id);// third offense, remove from dj wait list
        API.moderateForceSkip();// skip their turn
        log("@" + obj.dj.username + ", you've already played that song thrice before. Please play a different song and rejoin the DJ wait list.", log.visible);
    } else {
        if (songs.length >= 3 && (songs[0] == obj.media.cid && songs[1] == obj.media.cid)) {// second offense, skip
            API.moderateForceSkip();// skip their turn
            API.moderateMoveDJ(obj.dj.id, 1);// return them to the front of the line to try another song
            log("@" + obj.dj.username + ", you've already played that song twice before. Please play a different song or you will be removed from the DJ wait list.", log.visible);
        } else {// first offense, slap on the wrist
            if (songs.length >= 2 && songs[0] == obj.media.cid) {
                log("@" + obj.dj.username + ", you've already played that song before. Please play a different song.", log.visible);
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
    if ((API.getWaitList().length - (getPosition(author) + 1)) < 3 ) {// Must not be [3rd last - last]
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


function lotteryUpdate() {
    if(new Date().getMinutes() >= 10){
        if(lotteryUpdated)
            return;
        lotteryUpdated = true;

        if(lotteryEntries.length > 1) {
            var winner = lotteryEntries[Math.round(Math.random() * (lotteryEntries.length - 1))];

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


function getBlackJackGame(username, count) {
    count = (typeof count === "undefined") ? false : count;
    var i = 0;

    for (i; i < blackJackUsers.length; i++) {
        if (blackJackUsers[i].indexOf(getId(username)) != -1) {
            return (count) ? i : blackJackUsers[i];
        }
    }

    return -1;// if not already playing
}


function deleteBlackJackGame(username) {// game over, remove from blackJackUsers array
    var i = 0;

    for (i; i < blackJackUsers.length; i++) {
        if (blackJackUsers[i].indexOf(getId(username)) != -1) {
            blackJackUsers.splice(i, 1);
            return;
        }
    }
}


function _getRandCard(deck, remove) {
    var randNumber = Math.round(Math.random() * (deck.length - 1));

    if (remove) {
        deck.splice(randNumber, 1);
    }

    return [deck, randNumber];
}


function getSumOfHand(hand) {// return the total point value of a given hand ["Q", 3, "A", 6]
    var skippedAces = 0;
    var total       = 0;

    for(i = 0; i < hand.length; i++) {
       switch (hand[i]) {
           case 'A':
               skippedAces++;
           break;
           case 2:
               total = total + 2;
               break;
           case 3:
               total = total + 3;
               break;
           case 4:
               total = total + 4;
               break;
           case 5:
               total = total + 5;
               break;
           case 6:
               total = total + 6;
               break;
           case 7:
               total = total + 7;
               break;
           case 8:
               total = total + 8;
               break;
           case 9:
               total = total + 9;
               break;
           case 10:
           case 'J':
           case 'Q':
           case 'K':
               total = total + 10;
           break;
           case '?':// joker
           default:
           break;
       }
    }

    if (skippedAces) {
        for(i = 0; i < skippedAces; i++) {
            total = ((total + 11) <= 21) ? (total + 11) : (total + 1);// Ace = 11pts unless over 21, then Ace = 1pt
        }
    }

    return total;
}


function blackJackStand(author){// function for dealer to keep hitting if needed
log("blackJackStand() called, game=" + game, log.info);
    var game                = getBlackJackGame(author, true);
    var output              = "@" + author + ", dealer's final hand: ";
    var getCard             = null;

    if(getSumOfHand(blackJackUsers[game][2]) < getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) < 21) {
        log("@" + author + " your score is lower than @EDMPbot's, you must accept another card with !hitme", log.visible);
        return;
    } else {
        blackJackUsers[game][7] = true;
    }

    while(game != -1 && getSumOfHand(blackJackUsers[game][2]) > getSumOfHand(blackJackUsers[game][3])) {// Dealer keeps hitting until score is higher than the user's
log("while loop", log.info);
        getCard      = _getRandCard(blackJackUsers[game][4], true);// deal a card and get the new deck-chosen card
        blackJackUsers[game][3].push(blackJackUsers[game][4].getCard[1]);// add the new card to the dealer's hand
        blackJackUsers[game][4] = getCard[0];// make sure we use the spliced deck
    }

    output += blackJackUsers[game][3].join("-") + " totaling " + getSumOfHand(blackJackUsers[game][3]) + "; your final hand: " + blackJackUsers[game][2].join("-") + ", totalling " + getSumOfHand(blackJackUsers[game][3]) + ". ";

    if(getSumOfHand(blackJackUsers[game][2]) < getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][3]) <= 21) {
        log(output + "@EDMPBot wins, you suck compared to it.", log.visible);
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][3]) > 21) {
        log(output + "Dealer busts, you WIN & advance " + blackJackUsers[game][1] + " DJ slots.", log.visible);
// move the winner forward in line
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][2]) == getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) == 21) {
        log(ouput + "You dodged a bullet, you both scored 21!", log.visible);
        deleteBlackJackGame(author);
    } else {
        log("something else, derp?", log.visible);
    }
}


function blackJack(author, args) {
    var savedGame = null;
    var getCard   = null;
    var game      = null;
    var output    = "";

    switch(args[0]) {
        case 'hitme':
        case 'hit':
            savedGame = getBlackJackGame(author);
            game      = getBlackJackGame(author, true);

            if (blackJackUsers[game][7]) {
                log("@" + author + " you've already agreed to !stand, you must let the dealer play out their hand.");
                return;
            }

            if (savedGame != -1) {
                getCard      = _getRandCard(savedGame[4], true);// deal a card and get the new deck-chosen card
                savedGame[2].push(savedGame[4][getCard[1]]);// add the new card to the user's hand
                savedGame[4] = getCard[0];// make sure we use the spliced deck
                blackJackUsers[game] = savedGame;

                output = "@" + author + ", dealt a " + savedGame[4][getCard[1]] + " making your hand: " + savedGame[2].join("-") + ", totaling " + getSumOfHand(savedGame[2]) + " ";

                if(getSumOfHand(savedGame[2]) == 21 && getSumOfHand(savedGame[3]) == 21) {
                    log(output + "; You got lucky and tied @EDMPBot!", log.visible);
                    deleteBlackJackGame(author);
                    return;
                } else if(getSumOfHand(savedGame[2]) == 21) {
                    log(output + "& forcing you to !stand, action is on the dealer now.", log.visible);
                    blackJackStand(author);
                    return;
                } else if(getSumOfHand(savedGame[2]) > 21) {
                    log(output + "which is a BUST, please see !addiction to deal with your loss.", log.visible);
                    deleteBlackJackGame(author);// game over, remove from blackJackUsers array
                    return;
                } else {
                    log(output + "; dealer's hand: " + savedGame[3].join("-") + ", totaling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hitme or !stand.", log.visible);
                }
            } else {
                log("@" + author + ", please start a new game with the !blackjack command, including the amount of DJ wait list slots to wager. Usage: !blackjack 5", log.visible);
            }
        break;
        case 'stand':
        case 'hold':
            blackJackStand(author);
        break;
        case 'blackjack':
        default:
//log("let's play blackjack!", log.info);
//log("args.length="+args.length, log.info);
            if(args.length <= 1) {
                log("@" + author + " please wager an amount of slots, you can't bet more than the amount of slots you can afford to lose. Usage: !blackjack 5", log.visible);
                return;
            } else if(isNaN(args[1])) {
                log("@" + author + " please enter a valid wager.", log.visible);
                return;
            } else if(getPosition(author) == API.getWaitList().length){//} || getPosition(author) == -1) {
                log("@" + author + ", you can't gamble when you have nothing to lose! See !addiction for more details.", log.visible);
                return;
            } else if(args[1] > (API.getWaitList().length - getPosition(author))) {
                log("@" + author + ", your wager has been changed to " + (API.getWaitList().length - getPosition(author)), log.visible);
                args[1] = ((API.getWaitList().length - getPosition(author)) < 1) ? 1 : (API.getWaitList().length - getPosition(author));// because math
            }

            savedGame = getBlackJackGame(author);

            if (savedGame != -1) {
                log("@" + author + ", you already have a game running. Your hand: " + savedGame[2][0] + "-" + savedGame[2][1] + ", totaling " + getSumOfHand(savedGame[2]) + "; dealer's hand: " + savedGame[3][0] + "-" + savedGame[3][1] + ", totalling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hitme or !stand.", log.visible);
            } else {
                var newDeck    = deck;
                var handUser   = [];// values of cards from newDeck, not the keys
                var handDealer = [];
                game           = null;
                getCard        = null;
                output         = "";

                getCard        = _getRandCard(newDeck, true);// deal a card and get the new deck-chosen card
                handUser.push(newDeck[getCard[1]]);// add the first card to the user's hand
                newDeck        = getCard[0];// make sure we use the spliced deck

                getCard        = _getRandCard(newDeck, true);// deal another card
                handDealer.push(newDeck[getCard[1]]);// add second dealt card to dealer's hand
                newDeck        = getCard[0];

                getCard        = _getRandCard(newDeck, true);// deal another card
                handUser.push(newDeck[getCard[1]]);// add the third card to the user's hand
                newDeck        = getCard[0];// make sure we use the spliced deck

                getCard        = _getRandCard(newDeck, true);// deal another card
                handDealer.push(newDeck[getCard[1]]);// add fourth dealt card to dealer's hand
                newDeck        = getCard[0];

                blackJackUsers.push([getId(author), args[1], handUser, handDealer, newDeck, false, false]);// add dealt hands and reduced decks to blackJackUsers tracking array

                game   = blackJackUsers.length - 1;// set array key for future storage/retrieval within function;
                output = "@" + author + " dealt: X-" + handUser[1] + ". Dealer was dealt: X-" + handDealer[1] + ". ";

                if(handUser[1] == "A" || handDealer[1] == "A") {
                    log(output + "Ace detected, flipping cards to reveal your hand: " + handUser[0] + "-" + handUser[1] + "; dealer's hand: " + handDealer[0] + "-" + handDealer[1] + ". Checking for ten-point cards...");
                    blackJackUsers[game][6] = true;// cards now face-up

                    setTimeout(function(){// delay needed because plug.dj can't handle rapid-succession messages
                        if(((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" || handUser[0] == "K") && handUser[1] == "A") && ((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A")) {
                            log("@" + author + ", you dodged a bullet, you both hit BlackJack!", log.visible);
                            blackJackUsers[game][5] = true;// game over
                        } else if((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" ||handUser[0] == "K") && handUser[1] == "A") {
                            log("Congratulations @" + author + ", you won! You've gained " + args[1] + " positions!", log.visible);
                            blackJackUsers[game][5] = true;// game over
// move user forward in line
                        } else if((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A") {
                            log("Hey everybody, @" + author + ", just got beaten at !blackjack by @EDMBot! You've lost " + args[1] + " positions, pitiful.", log.visible);
// move user backward in line
                            blackJackUsers[game][5] = true;// game over
                        }
                    }, 500);
                } else {
                    output += "No Aces detected, flipping cards to reveal your hand: " + handUser[0] + "-" + handUser[1] + "; dealer's hand: " + handDealer[0] + "-" + handDealer[1] + ". ";

                    if(getSumOfHand(handUser) == 21 && getSumOfHand(handDealer) == 21) {
                        output += "You dodged a bullet, you both hit BlackJack!";
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        return;
                    } else if(getSumOfHand(handUser) == 21) {
                        output += "You won! You've gained " + args[1] + " positions!";
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        return;
                    } else if(getSumOfHand(handDealer) == 21) {
                        output += "You just got beaten at !blackjack by @EDMBot! You've lost " + args[1] + " positions, pitiful.";
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        return;
                    } else {
                        output += "Your options are to either !hitme or !stand.";
                    }

                    log(output , log.visible);
                    blackJackUsers[game][6] = true;// cards now face-up
                }

                if(blackJackUsers[game][5]) {
                    blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                    return;
                }
            }
        break;
    }
}


// Hourly shit and general bot stuffs


function lotteryHourly() {// enable or disable the lottery
    lotteryEnabled = (API.getWaitList().length >= 7);// disable lottery unless 7+ DJs queued

    if (lotteryEnabled) {
        log("The lottery is now open, type !lottery for a chance to be bumped to #1 in the DJ wait list!", log.visible);
    } else {
        log("lotteryEnabled = false at lotteryHourly()", log.info)
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