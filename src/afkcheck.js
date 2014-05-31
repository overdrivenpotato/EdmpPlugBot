function getLastChat(userID) {
    for(var i = 0; i < trackAFKs.length; i++) {
        if(trackAFKs[i].indexOf(userID) == 1) {// found them!
            return [trackAFKs[i][2], trackAFKs[i][4], i, trackAFKs[i][3]];
        }
    }

    return -1;// didn't find the user
}


function updateAFKs(data) {
    var i = 0;

    if(!trackAFKs.length) {// gotta start with somebody!
        var users = API.getUsers();

        for(i = 0; i < users.length; i++) {// Cycle through users list and populate trackAFs with them
            trackAFKs.push([users[i].username, users[i].id, Date.now(), "", false]);
        }
        return;
    }

    for(i = 0; i < trackAFKs.length; i++) {
        if(trackAFKs[i].indexOf(data.fromID) == 1) {// Update existing entry
            trackAFKs[i][2] = Date.now();
            trackAFKs[i][3] = data.message;
            trackAFKs[i][4] = false;// reset AFK warning

            return;
        } else if(i == (trackAFKs.length - 1)) {// Hasn't yet chatted, add an entry
            trackAFKs.push([data.from, data.fromID, Date.now(), data.message, false]);

            return;
        }
    }
}


function checkAFKs(minutes) {// Makes sure DJs chat every x minutes, we want as much participation as possible, not AFK DJs
    var DJWaitList      = API.getWaitList();
    var AFKlist         = "";
    checkAFKFirstStrike = [];
    checkAFKSecondStrike= [];
    checkAFKThirdStrike = [];

    for (var i = 0; i < DJWaitList.length; i++) {// cycle through DJ wait list
        for (var j = 0; j < trackAFKs.length; j++) {// cycle through trackAFKs to compare against
            if (DJWaitList[i].id != botID && trackAFKs[j].indexOf(DJWaitList[i].id) == 1) {// found the waiting DJ in the trackAFKs array
                var afkMinutes = (Date.now() - trackAFKs[j][2]) / 60 / 1000;

                if(afkMinutes >= minutes) {// reached the AFK limit, remove from DJ wait list
                    API.moderateRemoveDJ(DJWaitList[i].id);// remove from DJ wait list
                    checkAFKThirdStrike.push(DJWaitList[i].username);
                } else if(afkMinutes >= (minutes - AFKSecondWarningMinutes)) {// final warning, AFKSecondWarningMinutes minutes left to act!
                    checkAFKSecondStrike.push(DJWaitList[i].username);
                } else if(afkMinutes >= (minutes - AFKFirstWarningMinutes)) {// give them their first warning, AFKFirstWarningMinutes minutes to AFK deadline!
                    checkAFKFirstStrike.push(DJWaitList[i].username);
                }

                break;
            }
        }
    }

    if (checkAFKFirstStrike.length > 0) {
        for(i = 0; i < checkAFKFirstStrike.length; i++) {
            AFKlist = AFKlist + "@" + checkAFKFirstStrike[i];
            AFKlist = (i != (checkAFKFirstStrike.length - 1)) ? AFKlist + "," : AFKlist + "";// only add trailing comma if there are more AFK DJs waiting
        }

        log("AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))] + ": " + AFKlist + ", reply/chat within " + AFKFirstWarningMinutes + " minutes or you'll be removed from the DJ wait list", log.visible);
        AFKlist = "";
    }
    if (checkAFKSecondStrike.length > 0) {
        for(i = 0; i < checkAFKSecondStrike.length; i++) {
            AFKlist = AFKlist + "@" + checkAFKSecondStrike[i];
            AFKlist = (i != (checkAFKSecondStrike.length - 1)) ? AFKlist + "," : AFKlist + "";// only add trailing comma if there are more AFK DJs waiting
        }

        log("AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))] + ": " + AFKlist + " FINAL WARNING, reply/chat within " + AFKSecondWarningMinutes + " minutes or you'll be removed from the DJ wait list", log.visible);
        AFKlist = "";
    }
    if (checkAFKThirdStrike.length > 0) {
        for(i = 0; i < checkAFKThirdStrike.length; i++) {
            AFKlist = AFKlist + "@" + checkAFKThirdStrike[i];
            AFKlist = (i != (checkAFKThirdStrike.length - 1)) ? AFKlist + "," : AFKlist + "";// only add trailing comma if there are more AFK DJs waiting
        }

        log("AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))] + ": " + AFKlist + " you've been removed from the DJ wait list, fucking " + afkInsults[Math.round(Math.random() * (afkInsults.length - 1))], log.visible);
    }
}


function checkAFKResponse(username) {// send an ACK to ppl who respond to the AFK checker
    var lastChat   = getLastChat(getId(username));
    var afkMinutes = (Date.now() - lastChat[0]) / 60 / 1000;

    if(getId(username) != botID && afkMinutes > MaxAFKMinutes && lastChat[1]) {// not bot, was afk, was already warned
        log("@" + username + " satisfied the AFK " + afkNames[Math.round(Math.random() * (afkNames.length - 1))], log.visible);
    }
}