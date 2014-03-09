/**
 * User: Marko
 * Date: 3/8/14
 * Time: 9:20 PM
 */

var lastMsg = "";
var skipFixEnabled = false;


window.setInterval(function(){
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
    var command = args[0];
    console.log(author + " has dispatched: \'" + command + "\'" + " with args: " + args);
    switch(command.toLowerCase().trim())
    {
        case "goosesux":
            log("Yes he does.", 2);
            break;
        case "skip":
            if(isPlaying(author))
            {
                skipDj();
                break;
            }
            if(getPermLevel(author) > 1 && typeof API.getDJ() !== "undefined")
            {
                log(author + " has skipped " + API.getDJ().username, 2);
                skipDj();
            }
            break;
        case "skipfix":
            skipFixEnabled = !skipFixEnabled;
            break;
        case "privateskip":
            if(isPlaying(author) || getPermLevel(author) >= 2)
            {
                var current = API.getDJ().username;
                log("Skipping " + current + " and repositioning due to private track.", 2);
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
            var minutesToDJ = getETA(author);
            log("@" + author, ", it will be your turn to DJ in ~" + minutesToDJ + " minutes.");
        break;
        case "mal":
            chat("ware!");
            break;
        case "reminder":
            if(getPermLevel(author) < 3)
            {
                break;
            }
            if(args.length < 2)
            {
                chat("@" + author + " please use in the form of '!reminder http://reddit.com/r/edmproduction/PutTheUrlHere");
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

function log(log, level)
{
    level = (typeof level === "undefined") ? 3 : level;
    if(level < 3)
    {
        console.log("Chatting: ");
        chat(log);
    }
    console.log(log);
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
