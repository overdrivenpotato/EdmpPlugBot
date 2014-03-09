/**
 * User: Marko
 * Date: 3/8/14
 * Time: 9:20 PM
 */

var lastMsg = "";
var skipFixEnabled = false;
var version = "0.1.4";

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
    log("Restarting in 5 seconds...", log.visible);
    stop(true);
    log("Starting timeout... ", log.info);
    setTimeout(function(){
        $.getScript("https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/bot.js");
    }, 5000);
}

function stop(update)
{
    clearInterval(window.edmpBot);
    log("Shutting down the bot. Bye!", log.visible);
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
function meetupReminder()
{
    if(meetupUrl.length > 0 && Date.now() - lastMeetupMessageTime > 600000)
    {
        lastMeetupMessageTime = Date.now();
        chat("Make sure to upvote the r/edmp thread at " + meetupUrl + "!");
    }
}

function dispatch(message, author)
{
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
            console.log("Error: " + exp);
        }
    }
}

var meetupUrl = "";
function commandDispatch(args, author)
{
    var command = args[0].substring(1);
    console.log(author + " has dispatched: \'" + command + "\'" + " with args: " + args);
    switch(command.toLowerCase().trim())
    {
        case "goosesux":
            log("Yes he does.", log.visible);
            break;
        case "skip":
            if(isPlaying(author))
            {
                skipDj();
                break;
            }
            if(getPermLevel(author) > 1 && typeof API.getDJ() !== "undefined")
            {
                log(author + " has skipped " + API.getDJ().username, log.visible);
                skipDj();
            }
            break;
        case "skipfix":
            skipFixEnabled = !skipFixEnabled;
            break;
        case "privateskip":
            if(isPlaying(author) || getPermLevel(author) >= API.ROLE.BOUNCER)
            {
                var current = API.getDJ().username;
                log("Skipping " + current + " and repositioning due to private track.", log.visible);
                skipDj();
                var processor = setInterval(function(){
                    if(current != API.getDJ().username)
                    {
                        clearInterval(processor);
                        moveToFirst(current);
                    }
                }, 10);
            }
            break;
        case "eta":
            if(!isPlaying(author)) {
                var minutesToDJ = getETA(author);
                log("@" + author + ", it will be your turn to DJ in ~" + minutesToDJ + " minutes.", log.visible);
            } else {
                log("@" + author + " you're already the DJ, get your ears cleaned out!");
            }
            break;
        case "mal":
            chat("ware!");
            break;
        case "reminder":
            if(getPermLevel(author) < API.ROLE.MANAGER)
            {
                break;
            }
            if(args.length < 2)
            {
                log("@" + author + " please use in the form of '!reminder http://reddit.com/r/edmproduction/PutTheUrlHere", log.visible);
                break;
            }
            meetupUrl = args[1];
            break;
        case "stopreminder":
            if(getPermLevel(author) >= API.ROLE.MANAGER)
            {
                meetupUrl = "";
            }
            break;
        case "commands":
            var chatoutput = "@" + author + ", you have access to the following commands: ";
            //noinspection FallthroughInSwitchStatementJS
            switch (getPermLevel(author)) {
                case API.ROLE.ADMIN:
                    chatoutput += "";
                case API.ROLE.HOST:
                    chatoutput += "";
                case API.ROLE.COHOST:
                    chatoutput += "";
                case API.ROLE.MANAGER:
                    chatoutput += ", !update, !stop, ";
                case API.ROLE.BOUNCER:
                    chatoutput += "";
                case API.ROLE.RESIDENTDJ:
                    chatoutput += "";
                case API.ROLE.NONE:
                    chatoutput += ", !privateskip, !eta";
                    break;
            }
            log(chatoutput, log.visible);
            break;
        case "stop":
            if(getPermLevel(author) >= API.ROLE.MANAGER)
            {
                stop();
            }
            break;
        case "update":
            if(getPermLevel(author) >= API.ROLE.MANAGER)
            {
                updateBot();
            }
            break;
        default:
            console.log(author + " has entered an invalid command.");
            break;
    }
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
    for(var user in API.getUsers())
    {
        if(user.username == username.trim())
        {
            return user.id;
        }
    }
    return null;
}

function getETA(username) {
    return Math.round(getPosition(username) * getAverageTime());
}

function getPosition(username) {
    return API.getWaitListPosition(getId(username));
}

function getAverageTime() {
    // total songs / total minutes
    return 3;
}

// Check to see if the user is repeatedly playing the same song
function checkRepeatSong() {

    // get dj history
    // find played songs by same user in history, insert into an array
    // check if upcoming song & previously played song is the same
        //if same, send an @author chat warning
        // if same 2x, send an @author chat warning & skip
        // if same 3x, send an @author chat warning and remove from DJ list
}

// Alert upcoming users that their set is about to start
function waitListUpdated (users) {
    //When total users > 7, warn the #2 DJ his set is coming up if he hasn't said anything in chat in x minutes
    var len = users.length;

    if (len) {// >= 7
        log("@" + users[1].username + ", your set begins in ~$x minutes", log.info);
    }
}

API.on(API.WAIT_LIST_UPDATE, waitListUpdated);

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
        getYtVidSeconds(id[1], callBack);
    }
    else if(id[0] == 2)
    {
        getScLengthSeconds(id[1], callBack);
    }
}

var scClientId = "ff550ffd042d54afc90a43b7151130a1";
function getScLengthSeconds(soundId, callBack)
{
    $.getJSON("http://api.soundcloud.com/tracks/" + soundId + ".json?client_id=" + scClientId,
        function(e){
            callBack(e.duration);
        });
}

function getYtVidSeconds(videoId, callBack)
{
    callBack($(loadXMLDoc("http://gdata.youtube.com/feeds/api/videos/" + videoId).getElementsByTagName("duration")).attr("seconds"));
}

log("Loaded EDMPbot v" + version, log.visible);
window.edmpBot = window.setInterval(function(){
    var message = $(".message:last");
    if(message.attr("class") != lastMsg)
    {
        lastMsg = message.attr("class");
        dispatch(message.children(":last").html(), message.children(".from").html().trim());
    }
    if(skipFixEnabled)
    {
        skipFix();
    }
    meetupReminder();
}, 10);