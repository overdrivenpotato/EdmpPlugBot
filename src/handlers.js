function onChat(data) {
    if(data.type == "message") {
        if(data.fromID != botID) {
            checkChatSpam(data);
        }

        if(dispatch(data.message, data.from) && data.message.substr(0, 6) != "!8ball") {
            API.moderateDeleteChat(data.chatID);
        }
    }
    lotteryUpdate();

    if(data.type == "message" || data.type == "emote") {
        checkAFKResponse(data.from);
        updateAFKs(data);

        if(data.fromID == botID) {
            checkLottoOutput(data.chatID, data.message);// far more like to find a lotto msg than a bj msg
            checkBlackJackOutput(data.chatID, data.message);
        }
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

    setTimeout(function(){document.getElementById("woot").click()}, 2000);// auto-woot the song

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


function onLeave(user) {
    if (lastJoined != user.id && GreetingEnabled) {// prevent spam in case somebody has two tabs with different plug.dj rooms, although plug.dj now has their own spam prevention for this scenario
        var admins      = API.getStaff();
        var realAdmins  = [];

        for(var i = 0; i < admins.length; i++) {
            if(admins[i].permission >= API.ROLE.BOUNCER) {
                realAdmins.push(admins[i]);
            }
        }

        if(user.permission >= API.ROLE.BOUNCER && (realAdmins.length < 1 || (realAdmins.length == 1 && realAdmins[0].id == botID))) {// only display msg when the LAST admin leaves, not when anybody leaves
            log("***ATTENTION*** there are no admins left in the room. ERMERGHURD TIIIMMM TERRR PRRTTTEEEE!", log.visible);
        }
        if(user.username == "Ptero") {
            log("OH look, Princess @Ptero has left the building.", log.visible);
        }

        lastJoined = user.id;
    }
}


function onWaitListUpdate(users) {// Check for lotto updates
    lottoCleanup();
}