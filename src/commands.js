/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */


function getAvailable(author)
{
    var avail = [];
    for(var i = 0; i < commands.length; i++)
    {
        if(commands[i].hasPermission(author))
        {
            avail.push(commands[i]);
        }
    }
    return avail;
}

function execCommand(author, args)
{
    for(var i = 0; i < commands.length; i++)
    {
        for(var j = 0; j < commands[i].cmd.length; j++)
        {
            if(commands[i].cmd[j] == args[0].toLowerCase())
            {
                commands[i].exec(author, args);
                return;
            }
        }
    }
    console.log(author + " has entered an invalid command.");
}


function Command(cmd, callback, permission, customPerm)
{
    this.cmd = cmd.split(",");
    this.callback = callback;
    this.permission = typeof permission === "undefined" ? 0 : permission;

    this.exec = function(author, args){
        if(this.hasPermission(author))
        {
            this.callback(author, args);
        }
        else
        {
            console.log("No permission");
        }
    };

    this.hasPermission = function(author){
        return getPermLevel(author) >= this.permission ||
            (typeof customPerm !== "undefined" ? customPerm(author) : false);
    };

    this.toString = function(){
        return this.cmd.toString();
    };
}

function LinkCommand(cmd, url)
{
    this.prototype = new Command(cmd, function(){
        log(url, log.visible);
    }).prototype;
}

var commands = [
    new Command("goosesux", function(){
        log("Yes he does.", log.visible);
    }),

    new Command("turndown", function(){
        log("FOR WHAT?", log.visible);
    }),
    
    new Command("skip", function(author){
        skipDj();
        log(author + " has skipped " + API.getDJ().username, log.visible);
    }, API.ROLE.BOUNCER, function(author){
        return isPlaying(author);
    }),


    new Command("skipfix", function(){
        skipFixEnabled = !skipFixEnabled;
        log("skipfix is set to " + skipFixEnabled);
    }, API.ROLE.MANAGER),


    new Command("privateskip", function(){
        var current = API.getDJ().username;
        if(lastPrivateSkip < 5)
        {
            lastPrivateSkip = Date.now();
        }
        else
        {
            var time = Date.now();
            if(time - lastPrivateSkip > 30000)
            {
                log("Couldn't skip " + current + " due to timeout.");
                return;
            }
        }

        log("Skipping " + current + " and repositioning due to private track.", log.visible);
//        var times = $("#now-playing-time").children(":last").html().split(":");
//        var seconds = times[0] * 60 + times[1];
//        getSourceLength(API.getHistory()[0].media.id, function(time)
//        {
//            if(true){}
//        });
        skipDj();
        var processor = setInterval(function(){
            if(current != API.getDJ().username)
            {
                clearInterval(processor);
                moveToFirst(current);
            }
        }, 10);
    }, API.ROLE.BOUNCER, function(author){
        return isPlaying(author);
    }),


    new Command("eta", function(author){
        if(isPlaying(author))
            log("@" + author + " you're already the DJ, get your ears cleaned out!", log.visible);
        else if(API.getWaitListPosition(getId(author)) != -1)
            log("@" + author + ", it will be your turn to DJ in ~" + getETA(author) + " minutes.", log.visible);
        else
            log("@" + author + ", you are not on the DJ wait list!", log.visible);
    }),


    new Command("mal", function(){
        log("ware!", log.visible);
    }),


    new Command("reminder", function(author, args){
        if(args.length < 2)
        {
            log("@" + author + " please use in the form of '!reminder http://reddit.com/r/edmproduction/PutTheUrlHere", log.visible);
        }
        else {
            lastMeetupMessageTime = 0;
            meetupUrl = args[1];
        }
    }, API.ROLE.MANAGER),


    new Command("help,commands,", function(author){
        var avail = getAvailable(author);
        var chatoutput = "@" + author + ", you have access to the following commands: ";
        for(var i = 0; i < avail.length; i++)
        {
            chatoutput += "!" + avail[i].cmd + (i != avail.length - 1 ? ", " : "");
        }
        log(chatoutput, log.visible);
    }),


    new Command("stop", function(){
//        stop();
        log("Stop has been disabled.", log.visible);
    }, API.ROLE.MANAGER),


    new Command("update", function(){
        updateBot();
    }, API.ROLE.MANAGER, function(author){
        return author.trim().toLocaleLowerCase() == "invincibear";
    }),


    new Command("rollthedice", function(author){
        rollTheDice(author);
    }),


    new Command("afktest", function(author){
        log("trackAFKs=" + trackAFKs, log.visible);
        checkAFK(author);
    }),


    new Command("8ball", function(author, args){
        eightball(author, args);
    }),


    new Command("credits,info", function(){
        log("EDMPbot was developed by @overdrivenpotato and @Invincibear. Type !help for available commands.", log.visible);
    }),


    new Command("smoke", function(){
        log("WEED ERRYDAY", log.visible);
    }),


    new Command("lottery", function(author){
        if(new Date().getMinutes() >= 10)
        {
            log("@" + author + ", the lottery occurs at the start of each hour." +
                "Type !lottery within 10 minutes for a chance to win!", log.visible);
            return;
        }
        if(lotteryEntries.indexOf(author) > -1)
        {
            log("@" + author + " you are already in the lottery! " +
                "The winner will be picked from " + lotteryEntries.length + " entries. Please type !addiction for any help.", log.visible);
            return;
        }

        lotteryEntries.push(author);
        log("@" + author + " has entered the lottery! There are now " + lotteryEntries.length + " entries!", log.visible);
    }),


    new Command("remove", function(author){
        var dj = API.getDJ();
        if(typeof dj === "undefined")
        {
            log("No dj to remove.", log.visible);
            return;
        }
        log(author + " has removed " + dj.username + " from the stage.", log.info);
        API.moderateRemoveDJ(dj.id);
    }, API.ROLE.MANAGER),


    new Command("addiction", function(author){
        log("The first step @" + author + ", is admitting you have a gambling problem. Get your life together and quit gambling on !rollthedice and !lottery.", log.visible);
    })

];
