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
            commandDispatch("!skip", API.getUser().username);
        }
    }
}

function dispatch(message, author)
{
    message = message.replace(/&nbsp;/g, '');
    if(message.match(/(^!)(!?)/))
    {
        try
        {
            var end = message.indexOf(' ');

            commandDispatch(message.substr(1, end == -1 ? message.length : end), author);
        }
        catch(exp)
        {
            console.log("Error: " + exp);
        }
    }
}

function commandDispatch(command, author)
{
    console.log(author + " has dispatched: \'" + command + "\'");
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
        case "mal":
            chat("ware!");
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
    var position = getPosition(username);
    var averageTime = getAverageTime();
    var ETA = position * averageTime;

    return Math.round(ETA);
}

function getPosition(username) {
    var userID   = getId(username);
    var position = API.getWaitListPosition(userID);
}

function getAverageTime() {
    // total songs / total minutes
}