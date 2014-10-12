function lottery(author, args) {
    if(args.length == 2) {
        switch(args[1]) {
            case "on":
                lotteryEnabled = true;
                log("@" + author + " has enabled the hourly lottery", log.visible);
                return;
            break;
            case "off":
                lotteryEnabled = false;
                log("@" + author + " has disabled the hourly lottery", log.visible);
                return;
            break;
        }
    }

    if(new Date().getMinutes() >= 10) {
        log("@" + author + ", the lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
        return;
    } else if(lotteryEntries.indexOf(getId(author)) > -1)  {
        log("You're already in the lottery @" + author + "! (" + lotteryEntries.length + " entries) See !addiction for help", log.visible);
        return;
    } else if(getPosition(author) == 0) {
        log("@" + author + ", you're already the next to DJ, type !addiction for help with your problem.", log.visible);
        return;
    } else if (API.getWaitListPosition(getId(author)) == -1) {
        log("@" + author + ", you must be on the DJ wait list to enter the !lottery", log.visible);
        return;
    }

    lotteryEntries.push(getId(author));
    log("[!lottery] @" + author + " has entered the lottery! (" + lotteryEntries.length + " entries)", log.visible);
}


function lotteryUpdate() {
    if(new Date().getMinutes() >= 10){
        if(lotteryUpdated)
            return;
        lotteryUpdated = true;

        if(lotteryEntries.length > 1) {
            var winner = lotteryEntries[Math.round(Math.random() * (lotteryEntries.length - 1))];

            if(API.getWaitListPosition(winner) < 0) {
                lotteryUpdated = false;
                return;
            }

            log("@" + getUsername(winner)+ " has won the hourly lottery! The lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
            API.moderateMoveDJ(winner, 1);
        } else {
            if (lotteryEnabled) {
                log("Not enough contestants, lottery reset. The lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
            }
        }
        lotteryEntries = [];
    } else {
        lotteryUpdated = false;
    }
}


function checkLottoOutput(chatID, message) {
    if(message.search("has entered the lottery") == "-1") {
        return false;// Do this first cause there's a higher chance of the chatted msg being irrelevant to lotto
    } else {
        if(lastLotto != "") {
            API.moderateDeleteChat(lastLotto);
        }

        lastLotto = chatID;

        return true;
    }
}


function lottoCleanup() {
    var DJWaitList  = API.getWaitList();
    var found       = false;
    var removed     = [];
    var lottoList   = "";

    for(var i = 0; i < lotteryEntries.length; i++) {// cycle through lotteryEntries
        found = false;

        for(var j = 0; j < DJWaitList.length; j++) {// cycle through DJ wait list to compare against
            if(lotteryEntries[i] == DJWaitList[j].id) {// found the waiting DJ in the DJWaitList
                found = true;
                break;
            }
        }

        if(!found) {
            removed.push(lotteryEntries[i]);// compile a list of removed lotto players
            lotteryEntries.splice(lotteryEntries[i], 1);// remove from the lotto array
        }
    }

    if(removed.length > 0) {
        for(i = 0; i < removed.length; i++) {
            lottoList = lottoList + "@" + removed[i];
            lottoList = (i != (removed.length - 1)) ? lottoList + "," : lottoList + "";// only add trailing comma if removing more than one contestant
        }
    }
}


function lotteryHourly() {// enable or disable the lottery
    lotteryEnabled = (API.getWaitList().length >= 7);// disable lottery unless 7+ DJs queued

    if (lotteryEnabled) {
        log("The lottery is now open, type !lottery for a chance to be bumped to #1 in the DJ wait list!", log.visible);
    }
}