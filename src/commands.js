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
            log("No permission", log.info);

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
            log("@" + author + " [!reminder] please use in the form of '!reminder http://reddit.com/BLAH or !reminder off", log.visible);
        } else if (args[1] == "off") {
            meetupUrl = "";
            log("[!reminder] @" + author + " reminder stopped.", log.visible);
        } else {
            lastMeetupMessageTime = 0;
            meetupUrl = args[1];
        }
    }, API.ROLE.MANAGER),


    new Command("specialgreeting", function(author, args) {
        if(args.length < 2) {
            log("@" + author + " [!specialgreeting] please use in the form of '!specialgreeting We are professional noize-ballerz", log.visible);
            return;
        }

        switch(args[1]) {
            case "on":
                SpecialGreetingEnabled = true;
                log("@" + author + " has enabled a special greeting", log.visible);
                break;
            case "off":
                SpecialGreetingEnabled = false;
                log("@" + author + " has disabled the special greeting", log.visible);
                break;
            default:
                SpecialGreeting = args[1];
                    log("@" + author + ", has set a new special greeting", log.visible);
                break;
        }
    }, API.ROLE.COHOST),


    new Command("update", function() {
//log("Restarting the bot, Bye!...", log.visible);// really not needed, if you don't see it come up it's already fucked
        stop(true);
        log("Starting 2s loader timer... ", log.info);
        updateBot();
    }, API.ROLE.MANAGER, function(author){
        return (getId(author) == nvp);
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


    new Command("privateskip,ps", function(author) {// We will test out the new auto-checker and possible remove this command
        var current = API.getDJ().username;
        var times = $("#now-playing-time").children(":last").html().split(":");
        var seconds = (parseInt(times[0] * 60) + parseInt(times[1]));

        getSourceLength(API.getMedia().id, function(time)
        {
            if(((time - seconds) < 30) || getPermLevel(author) >= API.ROLE.BOUNCER) {
                privateSkip(current);
                log("Skipped @" + current + " and repositioned due to a private/missing track", log.visible);
            } else {
                log("Couldn't skip @" + current + " due to timeout.", log.visible);
            }
        });

    }, API.ROLE.BOUNCER, function(author) {
        return isPlaying(author);
    }),


    new Command("skip", function(author) {
        API.moderateForceSkip();
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


    new Command("url,link", function(author) {
        if (typeof API.getDJ() !== "undefined") {
            getSourceUrl(API.getMedia(), function(link) {
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
            logtext = (admins[i].id != botID && admins[i].role >= API.ROLE.BOUNCER) ? logtext + (admins[i].username + ((i == (admins.length - 1)) ? "" : ", ")) : logtext + "";

            if(admins[i].role >= API.ROLE.BOUNCER) {
                realAdmins.push(admins[i]);
            }
        }

        if(realAdmins.length < 1 || (realAdmins.length == 1 && realAdmins[0].id == botID)) {
            log("Oh. My. God. NO ADULT SUPERVISION!!! You're on your own, @" + author, log.visible);
        } else {
            log(logtext, log.visible);
        }
    }),


    new Command("move", function(author, args) {
        if(args.length < 2 || args[1].indexOf("@") == -1) {
            log("@" + author + " please use in the form of: !move @" + author + " 14");
            return;
        }

        API.moderateMoveDJ(getId(args[1].substr(1)), parseInt(args[2]));
    }, API.ROLE.BOUNCER),


    new Command("smite", function(author, args) {
        if(args.length < 2 || args[1].indexOf("@") == -1) {
            log("@" + author + " please use in the form of: !smite @" + author);
            return;
        }
log(";name: "+getId(args[1].substr(1))+"; id:"+getId(args[1].substr(1)) + "args: "+args, log.info);
        uid = getId(args[1].substr(1));
        API.API.moderateRemoveDJ(uid);
    }, API.ROLE.BOUNCER),


    new Command("checkafks", function(author, args) {
        if(args.length < 2) {
            log("@" + author + " please use in the form of: !checkafks on (or) !checkafks off (or) !checkafks 45");
            return;
        }

        switch(args[1]) {
            case "on":
                checkAFKEnabled = true;
                log("@" + author + " has enabled AFK checking, MAX AFK time is " + MaxAFKMinutes + " minutes", log.visible);
                break;
            case "off":
                checkAFKEnabled = false;
                log("@" + author + " has disabled AFK checking", log.visible);
                break;
            default:
                if (!isNaN(args[1])) {
                    MaxAFKMinutes = (args[1] * 2) / 2;// positive minutes only
                    msg = (checkAFKEnabled) ? "@" + author + " has set the MAX AFK time to " + MaxAFKMinutes + " minutes" : " and enabled AFK checking.";
                    log(msg, log.visible);
                }
                break;
        }
    }, API.ROLE.MANAGER),


    new Command("checkspam", function(author, args) {
        if(args.length < 2) {
            log("@" + author + " please use in the form of: !checkspam on (or) !checkspam off");
            return;
        }

        switch(args[1]) {
            case "on":
                checkSPAMEnabled = true;
                log("@" + author + " has enabled SPAM reduction", log.visible);
                break;
            case "off":
                checkSPAMEnabled = false;
                log("@" + author + " has disabled SPAM reduction", log.visible);
                break;
        }
    }, API.ROLE.MANAGER),


    new Command("rollthedice", function(author, args) {
        if(args.length == 1) {
            rollTheDice(author);
        } else if(args[1] == "on") {
            RollTheDiceEnabled = true;
            log(author + " has enabled !rollthedice", log.visible);
        }else if(args[1] == "off") {
            RollTheDiceEnabled = false;
            log(author + " has disabled !rollthedice", log.visible);
        }
    }),


    new Command("lottery", function(author, args) {
        lottery(author, args);
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

    new Command("turnup", function() {
        log("TURN UP TO DEATH", log.visible);
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
        log("@spyre has no time for your sympathy", log.visible);
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
        log("!suck @Ptero's dick for mod", log.info);
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

    new Command("ableton", function() {
        log("Ableton \"I'm a bro too, bro do you even lift, bro\" race", log.visible);
    }, null, null, false),

    new Command("fl,fruity,fruityloops,flstudio", function() {
        log("FruityLoops \"I have a small penis\" race", log.visible);
    }, null, null, false),

    new Command("cubase", function() {
        log("Cubase \"lonely Invincibear\" MASTER race", log.visible);
    }, null, null, false),

    new Command("logic", function() {
        log("Logic \"I pay Apple too much to get buttfucked\" race", log.visible);
    }, null, null, false),

    new Command("protools", function() {
        log("ProTools \"dayum I'm a pro tool\" race", log.visible);
    }, null, null, false),

    new Command("bitwig", function() {
        log("Bitwig MASTER race", log.visible);
    }, null, null, false),

    new Command("garageband", function() {
        log("Garage Band \"I have no clue what I'm doing\" race", log.visible);
    }, null, null, false),

    new Command("reason", function() {
        log("Reason \"can't untangle those fucking wires\" race", log.visible);
    }, null, null, false),

    new Command("reaper", function() {
        log("reaper what? reaper who?", log.visible);
    }, null, null, false),

    new Command("dubturbo", function() {
        log("I make \"dupstep\" too bro!", log.visible);
    }, null, null, false),

    new Command("acid", function() {
        log("Sony, lol, yeah right", log.visible);
    }, null, null, false),

    new Command("sonar", function() {
        log("Submarines have better sonar capabilities", log.visible);
    }, null, null, false),

    new Command("studioone,studione", function() {
        log("dream on studio one", log.visible);
    }, null, null, false),

    new Command("harmor", function() {
        log("Harmor MASTER race", log.visible);
    }, null, null, false),

    new Command("sylenth,sylenth1", function() {
        log("Sylenth1 MASTER race", log.visible);
    }, null, null, false),

    new Command("massive", function() {
        log("Massive normal race", log.visible);
    }, null, null, false),

    new Command("mixcraft", function() {
        log("Only radio stations use Mixcraft", log.visible);
    }, null, null, false),

    new Command("fm8", function() {
        log("FM8 MASTER race", log.visible);
    }, null, null, false),

    new Command("serum", function() {
        log("Serum MASTER race", log.visible);
    }, null, null, false),

    new Command("trap", function() {
        log("http://imgur.com/O7vL7Sw", log.visible);
    }, null, null, false),

    new Command("goosesux", function() {
        log("Yes he does", log.visible);
    }, null, null, false),

    new Command("serum", function() {
        log("The only synth you'll ever need", log.visible);
    }, null, null, false),

    new Command("shrek", function(author) {
        log("But @" + author + ", Shrek is LOVE...", log.visible);
    }, null, null, false),

    new Command("girls", function() {
        log("Why can't girls produce? Because they don't use Reason or Logic", log.visible);
    }, null, null, false)
];