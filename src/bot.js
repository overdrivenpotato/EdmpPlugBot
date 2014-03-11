/**
 * User: Marko
 * Date: 3/8/14
 * Time: 9:20 PM
 */

var skipFixEnabled = false;
var version = "0.2.0";
var trackAFKs = new Array();


//API.on(API.WAIT_LIST_UPDATE, waitListUpdated);
API.on(API.DJ_ADVANCE, checkRepeatSong);
API.on(API.CHAT, onChat);

log.info = 3;
log.visible = 2;
function log(message, level)
{
    level = (typeof level === "undefined") ? log.info : level;
    if(level < log.info)
    {
        console.log("Chatting: ");
        chat(message);
    }
    console.log(message);
}

function updateBot()
{
    log("Restarting in 3 seconds...", log.visible);
    stop(true);
    log("Starting timeout... ", log.info);
    setTimeout(function(){
        $.getScript("https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js");
    }, 3000);
}

function stop(update)
{
    clearInterval(window.edmpBot);
    log("Shutting down the bot. Bye!", log.visible);
    API.off();
    if(!update)
    {
        setTimeout(function(){
            log("p.s. ptero is fat", log.visible);
        }, 15000);
    }
}

var lastSkipTime = 0;
function skipFix()
{
    if(lastSkipTime < 1)
    {
        lastSkipTime = Date.now();
        return;
    }

    var times = $("#now-playing-time").children(":last").html().split(":");
    if(times[0] < 1 && times[1] < 1)
    {
        var timeN = Date.now();
        if(timeN - lastSkipTime > 5000)
        {
            log("Skipping due to lag", 1);
            commandDispatch("!skip", API.getUser().username.trim());
        }
    }
}

var lastMeetupMessageTime = 0;
var upvotes = ["upchode", "upgrope", "upspoke", "uptoke", "upbloke", "upboat", "upgoat"];
function meetupReminder()
{
    if(meetupUrl.length > 0 && Date.now() - lastMeetupMessageTime > 600000)
    {
        lastMeetupMessageTime = Date.now();
        chat("Make sure to " + upvotes[Math.round(Math.random() * upvotes.length)] + " the /r/edmp thread at " + meetupUrl + "!");
    }
}

function dispatch(message, author)
{
    log("Dispatching message: " + message);
    while(true)
    {
        if(message.indexOf("<a") == -1)
            break;
        var start = message.indexOf("<a");
        var end = message.indexOf("a>");
        var link = $(message.substr(start, end)).attr("href");
        message = message.split(message.substr(start, end));
        message = message[0] + link + message[1];
    }
    message = message.replace(/&nbsp;/g, '');
    if(message.match(/(^!)(!?)/))
    {
        message = message.substr(message.indexOf("!"));
        try
        {
            var args = message.split(" ");
            commandDispatch(args , author);
        }
        catch(exp)
        {
            console.log("Error: " + exp.stack);
        }
    }
}

var meetupUrl = "";
function commandDispatch(args, author)
{
    args[0] = args[0].substring(1);
    console.log(author + " has dispatched: \'" + args[0] + "\'" + " with args: " + args);
    execCommand(author, args);
}

function isPlaying(username)
{
    return typeof API.getDJ() !== "undefined" && API.getDJ().username == username.trim();
}

function moveToFirst(username) {
    API.moderateMoveDJ(getId(username), 1);
}

function skipDj()
{
    API.moderateForceSkip();
}

function chat(text)
{
    $("#chat-input-field").val("/me " + text);
    var e = $.Event('keydown');
    e.which = 13;
    $('#chat-input-field').trigger(e);
}

function getPermLevel(username)
{
    return API.getUser(getId(username)).permission;
}

function getId(username) {
    var users = API.getUsers();
    for(var i = 0; i < users.length; i++)
    {
        if(users[i].username == username.trim())
        {
            return users[i].id;
        }
    }
    return null;
}

function getETA(username) {
    return Math.round((getPosition(username) + 1) * getAverageTime());
}

function getPosition(username) {
    return API.getWaitListPosition(getId(username));
}

// Alert upcoming users that their set is about to start when total users > if they're AFK
function waitListUpdated (users) {
    if (users.length >= 7) {
        log("@" + users[1].username + ", your set begins in ~" + getETA(users[1].username)+ " minutes", log.visible);
    }
}

var totalSongTime = 0, totalSongs = 0;
function getAverageTime()
{
    return Math.floor(totalSongTime / totalSongs / 60);
}

// Check to see if the user is repeatedly playing the same song
function checkRepeatSong(obj)
{
// check if upcoming song & previously played song is the same
//if same, send an @author chat warning
// if same 2x, send an @author chat warning & skip
// if same 3x, send an @author chat warning and remove from DJ list
    var songshistory = API.getHistory(); // get dj history
    var songs = new Array();

    for(var i = 0; i < songshistory.length; i++) {
        if (songshistory[i].user.id == API.getDJ().id) {
            songs.push(songshistory[i].media.id.substr(2));// find played songs by same user in history, insert into an array
        }
    }

    if (songs.length >= 4 && (songs[0] == API.getMedia().cid && songs[1] == API.getMedia().cid && songs[2] == API.getMedia().cid)) {
        API.moderateRemoveDJ(API.getDJ().id);//remove from dj wait list
        API.moderateForceSkip();//skip their turn
        log("@" + API.getDJ().username + ", you've already played that song thrice before. Please play a different song and rejoin the DJ wait list.", log.visible);
    } else {
        if (songs.length >= 3 && (songs[0] == API.getMedia().cid && songs[1] == API.getMedia().cid)) {
            API.moderateForceSkip();
            API.moderateMoveDJ(API.getDJ().id, 1);
            log("@" + API.getDJ().username + ", you've already played that song twice before. Please play a different song or you will be removed from the DJ wait list.", log.visible);
        } else {
            if (songs.length >= 2 && songs[0] == API.getMedia().cid) {
                log("@" + API.getDJ().username + ", you've already played that song before. Please play a different song.", log.visible);
            }
        }
    }
}

//From http://www.w3schools.com/dom/dom_loadxmldoc.asp
function loadXMLDoc(filename)
{
    if (window.XMLHttpRequest)
    {
        xhttp=new XMLHttpRequest();
    }
    else // code for IE5 and IE6
    {
        xhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhttp.open("GET",filename,false);
    xhttp.send();
    return xhttp.responseXML;
}

function getSourceLength(id, callBack)
{
    id = id.split(":");
    if(id[0] == 1)
    {
        log("checking yt");
        getYtVidSeconds(id[1], callBack);
    }
    else if(id[0] == 2)
    {
        log("checking sc");
        getScLengthSeconds(id[1], callBack);
    }
}

var scClientId = "ff550ffd042d54afc90a43b7151130a1";
function getScLengthSeconds(soundId, callBack)
{
    $.getJSON("http://api.soundcloud.com/tracks/" + soundId + ".json?client_id=" + scClientId,
        function(e){
            callBack(e.duration / 1000);
        });
}

function getYtVidSeconds(videoId, callBack)
{
    callBack($(loadXMLDoc("http://gdata.youtube.com/feeds/api/videos/" + videoId).getElementsByTagName("duration")).attr("seconds"));
}

function analyzeSongHistory()
{
    var history = API.getHistory();
    for(var i = 0; i < history.length; i++)
    {
        try
        {
            getSourceLength(history[i].media.id, function(seconds){
                totalSongs++;
                totalSongTime += parseFloat(seconds);
                log("Time changed to " + totalSongTime);
            });
        } catch(err)
        {
            console.error(err);
        }
    }
}

log("Loading bot...");
analyzeSongHistory();
log("Loaded EDMPbot v" + version, log.visible);
window.edmpBot = window.setInterval(function(){
    if(skipFixEnabled)
    {
        skipFix();
    }
    meetupReminder();
}, 10);

API.on(API.CHAT, function(data){
    if(data.type == "message")
    {
        dispatch(data.message, data.from);
    }
    lotteryUpdate();
});

function rolldice(dbl)
{
    var x = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var y = Math.floor(Math.random() * ((6 - 1) + 1) + 1);
    var dicetotal = x + y;
    $('.dice1').attr('id', "dice" + x);
    $('.dice2').attr('id', "dice" + y);
    if (x == y) {//check for doubles
        dbl++;
        if(dbl%3==0) {
        //Now reroll the dice, but if you hit 3 doubles in a row, you get message go to jail.
            rolldice(dbl);
        }
    }
}

function rollTheDice ()
{
    log("coming soon!", log.visible);
//    getId(author);

}

function eightball(author)
{
    log("@" + author +  ", you shouldn't gamble on chance", log.visible);
}

function onChat(data)
{
    if(data.type == "message" || data.type == "emote") {
        trackAFKs.push(new Array(data.fromID, Date.now()));
    }
}

function checkAFK(username)
{
    var userID = getId(username);
    var start = trackAFKs.length - 1;

    for (i = start; i >= 0; i--) {
        log("i=" + i, log.visible);
        log("trackAFKs:" + trackAFKs[i].search(getID), log.visible);
        if (trackAFKs[i].search(userID) != -1) {
            //do time calculations, now-stored time < 60 minutes
            var times = trackAFKs[0].split(",");
            var difference = (Date.now() - times[1]) / 1000 / 60 / 60;
            log(username + "spoke " + difference + " hours ago", log.visible);
            break;
        }
    }
}

var lotteryEntries = [];
var lotteryUpdated = true;
function lotteryUpdate()
{
    if(new Date().getMinutes() >= 10){
        if(lotteryUpdated)
            return;
        lotteryUpdated = true;

        if(lotteryEntries.length > 1)
        {
            var winner = lotteryEntries[Math.round(Math.random() * lotteryEntries.length)];
            if(API.getWaitListPosition(getId(winner)) < 0)
            {
                lotteryUpdated = false;
                return;
            }
            log("@" + winner + " has won the hourly lottery! " +
                "The lottery occurs hourly. Type !lottery within 10 minute of the next hour for a chance to win!", log.visible);
            moveToFirst(winner);
        }
        else
        {
            log("Resetting lottery. Not enough contestants. " +
                "The lottery occurs hourly. Type !lottery within 10 minute of the next hour for a chance to win!", log.visible);
        }
        lotteryEntries = [];
    }
    else
    {
        lotteryUpdated = false;
        return;
    }
}