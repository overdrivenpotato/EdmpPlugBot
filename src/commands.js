/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */


function getAvailable(author) {
    var avail = [];

    for(var i = 0; i < commands.length; i++) {
        if(commands[i].hasPermission(author) && commands[i].listed) {
            avail.push(commands[i]);
        }
    }

    return avail;
}


function execCommand(author, args) {
    for(var i = 0; i < commands.length; i++) {
        for(var j = 0; j < commands[i].cmd.length; j++) {
            if(commands[i].cmd[j] == args[0].toLowerCase()) {
                commands[i].exec(author, args);
                return true;
            }
        }
    }

    console.log(author + " has entered an invalid command.");
    return false;
}


function Command(cmd, callback, permission, customPerm, listed) {
    this.cmd = cmd.split(",");
    this.callback = callback;
    this.permission = (typeof permission === "undefined") ? 0 : permission;
//    this.listed = typeof listed === "undefined" ? true : listed;

    this.exec = function(author, args) {
        if(this.hasPermission(author)) {
            this.callback(author, args);
            return true;
        } else {
            console.log("No permission");
            return false;
        }
    };

    this.hasPermission = function(author){
        return getPermLevel(author) >= this.permission ||
            (typeof customPerm !== "undefined" ? customPerm(author) : false);
    };

    this.listed = (typeof listed === "undefined") ? true : listed;// bool, false = doesn't list in !help

    this.toString = function(){
        return this.cmd.toString();
    };
}


// **********
// ***
// List help commands first, then admin-only commands, then important or interactive commands, then fun commands, in case the msg is too long and gets cut off
// ***
// **********

var commands = [
    new Command("help", function(author){
        var avail = getAvailable(author);
        var chatoutput = "@" + author + ", you can use: ";
        for(var i = 0; i < avail.length; i++) {
            chatoutput += "!" + avail[i].cmd + (i != avail.length - 1 ? ", " : "");
        }
        log(chatoutput, log.visible);
    }),


    new Command("info", function() {
        log("[!info] EDMPbot " + version + " was developed by @overdrivenpotato and @Invincibear, minor contribution by @NVP. Type !help for available commands.", log.visible);
    }),


    new Command("reminder", function(author, args) {
        if(args.length < 2) {
            log("@" + author + " [!reminder] please use in the form of '!reminder http://reddit.com/r/edmproduction/PutTheUrlHere", log.visible);
        } else {
            lastMeetupMessageTime = 0;
            meetupUrl = args[1];
        }
    }, API.ROLE.MANAGER),


    new Command("stopreminder", function(author) {
        meetupUrl = "";
        log("[!stopreminder] @" + author + " reminder stopped.", log.visible);
    }, API.ROLE.MANAGER),


    new Command("skipfix", function() {
        skipFixEnabled = !skipFixEnabled;
        log("skipfix is set to " + skipFixEnabled);
    }, API.ROLE.MANAGER, null, false),


    new Command("update", function() {
//log("Restarting the bot, Bye!...", log.visible);// really not needed, if you don't see it come up it's already fucked
        stop(true);
        log("Starting 2s loader timer... ", log.info);
        setTimeout(function(){$.getScript("https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js");}, 2000);
    }, API.ROLE.MANAGER, function(author){
        return (getId(author) == invincibear || getId(author) == nvp);
    }),


    new Command("remove", function(author) {
        var dj = API.getDJ();
        if(typeof dj === "undefined") {
            log("@" + author + " [!remove] No dj to remove.", log.visible);
            return;
        }
        log("[!remove] " + author + " has removed " + dj.username + " from the stage.", log.info);
        API.moderateRemoveDJ(dj.id);
    }, API.ROLE.MANAGER),


    new Command("privateskip", function(author) {
        var current = API.getDJ().username;
        var times = $("#now-playing-time").children(":last").html().split(":");
        var seconds = (parseInt(times[0] * 60) + parseInt(times[1]));

        getSourceLength(API.getMedia().id, function(time)
        {
            if(((time - seconds) < 30)) {// || getPermLevel(author) >= API.ROLE.BOUNCER) {
                log("Skipping " + current + " and repositioning due to private track.", log.visible);
                skipDj();

                var processor = setInterval(function () {
                    if (current != API.getDJ().username) {
                        clearInterval(processor);
                        moveToFirst(current);
                    }
                }, 10);
            } else {
                log("Couldn't skip @" + current + " due to timeout.", log.visible);
            }
        });

    }, API.ROLE.BOUNCER, function(author) {
        return isPlaying(author);
    }),


    new Command("skip", function(author) {
        skipDj();
        log(author + " has skipped " + API.getDJ().username, log.visible);
    }, API.ROLE.BOUNCER, function(author) {
        return isPlaying(author);
    }),


    new Command("eta", function(author) {
        var DJmsgs = ["you're already the DJ, get your ears cleaned out!", "quit wankin' your wiener, you're already the DJ!"];

        if(isPlaying(author)) {
            log("@" + author + DJmsgs[Math.round(Math.random() * (DJmsgs.length - 1))], log.visible);
        } else if (API.getWaitListPosition(getId(author)) != -1) {
            var eta = getETA(author);
            var etaMsg = "[!eta] @" + author + ", it will be your turn to DJ ";
            etaMsg += (eta == "0") ? "SOOO SOOOOOONNN!" :
                ("in ~" + (eta / 60 < 1 ? "" : Math.floor(eta / 60) + "h " ) + eta % 60 + "m");

            log(etaMsg, log.visible);
        } else {
            log("[!eta] @" + author + ", you are not on the DJ wait list!", log.visible);
        }
    }),


    new Command("url", function(author) {
        if (typeof API.getDJ() !== "undefined") {
            getSourceUrl(API.getMedia().id, function(link) {
                log("[!url] @" + author + " " + link.replace("&feature=youtube_gdata_player", ""), log.visible);// make youtube links prettier
            })
        } else {
            log("[!url] Nobody is DJing, @" + author, log.visible);
        }
    }),


    new Command("admins", function(author) {
        var admins      = API.getStaff();
        var logtext     = "Admins Online: ";
        var realAdmins  = [];

        for(var i = 0; i < admins.length; i++) {
            logtext += (admins[i].id != botID && admins[i].permissions >= API.ROLE.BOUNCER) ? (admins[i].username + ((i == (admins.length - 1)) ? "" : ", ")) : "";

            if(admins[i].permissions >= API.ROLE.BOUNCER) {
                realAdmins.push(admins[i]);
            }
        }

        if(realAdmins.length < 1 || (realAdmins.length == 1 && realAdmins[0].id == botID)) {
            log("Oh. My. God. NO ADULT SUPERVISION!!! You're on your own, @" + author, log.visible);
        } else {
            log(logtext, log.visible);
        }
    }),


    new Command("rollthedice", function(author) {
//        log("!rollthedice is disabled until further notice. Try again later.", log.visible);
        rollTheDice(author);
    }),


    new Command("lottery", function(author) {
        if(new Date().getMinutes() >= 10) {
//            log("@" + author + ", the lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
//            return;
        } else if(lotteryEntries.indexOf(author) > -1)  {
//            log("@" + author + " you are already in the lottery! The winner will be picked from " + lotteryEntries.length + " entries. Please type !addiction for any help.", log.visible);
//            return;
        } else if(getPosition(author) == 0) {
            log("@" + author + ", you're already the next to DJ, type !addiction for help with your problem.", log.visible);
            return;
        }

        lotteryEntries.push(author);
        log("[!lottery] @" + author + " has entered the lottery! (" + lotteryEntries.length + " entries)", log.visible);
    }),

    
    new Command("blackjack", function(author, args) {// There's a var top of bot.js to turn it off
        blackJack(author, args);
    }),


    new Command("hit,hitme,stand,hold", function(author, args) {
        blackJack(author, args);
    }, null, null, false),// keep hidden, they will be revealed when a user stars a game of !blackjack


    new Command("addiction", function(author) {
        if (author == "Ptero") {
            log("Sorry @Ptero, but you've got some serious issues that even I cant fix. Consult a real doctor.", log.visible);
        }
        else {
        log("The first step @" + author + ", is admitting you have a gambling problem. Get your life together and quit gambling on !rollthedice, !lottery, and !blackjack.", log.visible);
        }
    }),


    new Command("8ball", function(author, args) {
        eightball(author, args);
    }),


    new Command("smoke", function() {
        log("SMOKE WEED ERRYDAY", log.visible);
    }, null, null, false),

    new Command("real", function() {
        log("REAL TRAP SHIT!", log.visible);
    }, null, null, false),
    
    new Command("turndown", function() {
        log("TURN DOWN FOR WHAT?", log.visible);
    }, null, null, false),

    new Command("nothing", function() {
        log("WELL FINE THEN, bitch", log.visible);
    }, null, null, false),

    new Command("herp", function() {
        log("derp", log.visible);
    }, null, null, false),

    new Command("damn", function() {
        log("DAMN SON, WHERE'D YOU FIND THIS??", log.visible);
    }, null, null, false),

    new Command("sympathy", function() {
        log("Please direct your sympathy to @spyre", log.visible);
    }, null, null, false),

    new Command("hype", function() {
        log("#HYPE 1 PLAY!", log.visible);
    }, null, null, false),

    new Command("420", function() {
        log("420, BLAZE IT: FAGGOT", log.visible);
    }, null, null, false),

    new Command("awe", function() {
        log("AWWWEEE YEEEAAAHHH!", log.visible);
    }, null, null, false),

    new Command("ricky", function() {
        log("RIP Ricky", log.visible);
    }, null, null, false),

    new Command("doughboy", function() {
        log("RIP Doughboy", log.visible);
    }, null, null, false),

    new Command("rick", function() {
        log("Never gonna give you up, Never gonna let you down, Never gonna run around and desert you, Never gonna make you cry, Never gonna say goodbye, Never gonna tell a lie and hurt you.", log.visible);
    }, null, null, false),

    new Command("suck", function() {
        log("!suck @Ptero's dick for mod", log.visible);
    }, null, null, false),

    new Command("nignog", function() {
        log("nig nog tryin to get a handbeezy? http://youtu.be/vm3TjRxntQk", log.visible);
    }, null, null, false),

    new Command("gamble", function(author) {
        log("@" + author + ", you can lose your dreams and aspirations by playing !lottery, !rollthedice, and !blackjack. When you're tired of being such a drain on society, get help with !addiction", log.visible);
    }, null, null, false),

    new Command("fuck,shit,cunt", function() {
        log("WATCH YOUR FUCKING LANGUAGE!", log.visible);
    }, null, null, false),

    new Command("shrek", function(author) {
        log("But @" + author + ", Shrek is LOVE...", log.visible);
    }, null, null, false)
];