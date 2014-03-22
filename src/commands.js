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
                return;
            }
        }
    }

    console.log(author + " has entered an invalid command.");
}


function Command(cmd, callback, permission, customPerm, listed) {
    this.cmd = cmd.split(",");
    this.callback = callback;
    this.permission = (typeof permission === "undefined") ? 0 : permission;
//    this.listed = typeof listed === "undefined" ? true : listed;

    this.exec = function(author, args) {
        if(this.hasPermission(author)) {
            this.callback(author, args);
        } else {
            console.log("No permission");
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
        log("EDMPbot " + version + " was developed by @overdrivenpotato and @Invincibear, minor contribution by @NVP. Type !help for available commands.", log.visible);
    }),


    new Command("reminder", function(author, args) {
        if(args.length < 2) {
            log("@" + author + " please use in the form of '!reminder http://reddit.com/r/edmproduction/PutTheUrlHere", log.visible);
        } else {
            lastMeetupMessageTime = 0;
            meetupUrl = args[1];
        }
    }, API.ROLE.MANAGER),


    new Command("stopreminder", function(author) {
        meetupUrl = "";
        log("@" + author + " reminder stopped.", log.visible);
    }, API.ROLE.MANAGER),


    new Command("skipfix", function() {
        skipFixEnabled = !skipFixEnabled;
        log("skipfix is set to " + skipFixEnabled);
    }, API.ROLE.MANAGER),


    new Command("update", function() {
        updateBot();
    }, API.ROLE.MANAGER, function(author){
        return getId(author) == (invincibear || nvp);
    }),


    new Command("remove", function(author) {
        var dj = API.getDJ();
        if(typeof dj === "undefined") {
            log("No dj to remove.", log.visible);
            return;
        }
        log(author + " has removed " + dj.username + " from the stage.", log.info);
        API.moderateRemoveDJ(dj.id);
    }, API.ROLE.MANAGER),


    new Command("privateskip", function() {
        var current = API.getDJ().username;
        if(lastPrivateSkip < 5) {
            lastPrivateSkip = Date.now();
        } else {
            var time = Date.now();
            if(time - lastPrivateSkip > 30000) {
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
        var processor = setInterval(function() {
            if(current != API.getDJ().username) {
                clearInterval(processor);
                moveToFirst(current);
            }
        }, 10);
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
            var etaMsg = "@" + author + ", it will be your turn to DJ ";
            etaMsg += (eta == "0") ? "SOOO SOOOOOONNN!" : ("in ~" + getETA(author) + " minutes.");

            log(etaMsg, log.visible);
        } else {
            log("@" + author + ", you are not on the DJ wait list!", log.visible);
        }
    }),


    new Command("url", function(author) {
        if (typeof API.getDJ() !== "undefined") {
            getSourceUrl(API.getMedia().id, function(link) {
                log("@" + author + " " + link.replace("&feature=youtube_gdata_player", ""), log.visible);// make youtube links prettier
            })
        } else {
            log("Nobody is DJing, @" + author, log.visible);
        }
    }),


    new Command("admins", function(author) {
        var admins = API.getStaff();
        var logtext = "Admins Online: ";

        for(var i = 0; i < admins.length; i++) {
            logtext += (admins[i].id != "531bdea096fba5070c4cad51" && admins[i].permissions >= API.ROLE.BOUNCER) ? (admins[i].username + (i == admins.length - 1 ? "" : ", ")) : "";
        }

        if(admins.length < 1) {
            log("Oh. My. God. NO ADULT SUPERVISION!!! You're on your own, @" + author, log.visible);
        } else {
            log(logtext, log.visible);
        }
    }),


    new Command("rollthedice", function(author) {
        rollTheDice(author);
    }),


    new Command("lottery", function(author) {
        if(new Date().getMinutes() >= 10) {
            log("@" + author + ", the lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
            return;
        }
        if(lotteryEntries.indexOf(author) > -1)  {
            log("@" + author + " you are already in the lottery! " +
                "The winner will be picked from " + lotteryEntries.length + " entries. Please type !addiction for any help.", log.visible);
            return;
        }

        lotteryEntries.push(author);
        log("@" + author + " has entered the lottery! There are now " + lotteryEntries.length + " entries!", log.visible);
    }),

    
    new Command("blackjack", function(author, args) {
        blackJack(author, args);
    }, API.ROLE.MANAGER, function(author){
        return getId(author) == (invincibear || nvp);
    }),


    new Command("hit,hitme,stand,hold", function(author, args) {
        blackJack(author, args);
    }, null, null, false),// keep hidden, they will be revealed when a user stars a game of !blackjack


    new Command("addiction", function(author) {
        log("The first step @" + author + ", is admitting you have a gambling problem. Get your life together and quit gambling on !rollthedice and !lottery.", log.visible);
    }),


    new Command("8ball", function(author, args) {
        eightball(author, args);
    }),


    new Command("smoke", function() {
        log("WEED ERRYDAY", log.visible);
    }),


    new Command("turndown", function() {
        log("FOR WHAT?", log.visible);
    }),


    new Command("nothing", function() {
        log("WELL FINE THEN, bitch", log.visible);
    }, null, null, false),

    new Command("herp", function() {
        log("derp", log.visible);
    }, null, null, false),

    new Command("damn", function() {
        log("SON, WHERE'D YOU FIND THIS??", log.visible);
    }, null, null, false),

    new Command("pushme", function() {
        log("And then just touch me", log.visible);
    }, null, null, false),

    new Command("soicangetmy", function() {
        log("Satisfaction", log.visible);
    }, null, null, false),

    new Command("sympathy", function() {
        log("Please direct your sympathy to @spyre", log.visible);
    }, null, null, false),

    new Command("mal", function(){
        log("ware!", log.visible);
    }, null, null, false),

    new Command("goosesux", function() {
        log("Yes he does.", log.visible);
    }, null, null, false),

    new Command("becomeselfaware ", function() {
        log("Been there, done that, haven't you tried !8ball?", log.visible);
    }, null, null, false),

    new Command("hype", function() {
        log("1 PLAY!", log.visible);
    }, null, null, false)
];
