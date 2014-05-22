function lottery(author) {
    if(new Date().getMinutes() >= 10) {
        log("@" + author + ", the lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
        return;
    } else if(lotteryEntries.indexOf(author) > -1)  {
        log("@" + author + " you are already in the lottery! The winner will be picked from " + lotteryEntries.length + " entries. Please type !addiction for any help.", log.visible);
        return;
    } else if(getPosition(author) == 0) {
        log("@" + author + ", you're already the next to DJ, type !addiction for help with your problem.", log.visible);
        return;
    } else if (API.getWaitListPosition(getId(author)) == -1) {
        log("@" + author + ", you must be on the DJ wait list to enter the !lottery", log.visible);
        return;
    }

    lotteryEntries.push(author);
    log("[!lottery] @" + author + " has entered the lottery! (" + lotteryEntries.length + " entries)", log.visible);
}


function lotteryUpdate() {
    if(new Date().getMinutes() >= 10){
        if(lotteryUpdated)
            return;
        lotteryUpdated = true;

        if(lotteryEntries.length > 1) {
            var winner = lotteryEntries[Math.round(Math.random() * (lotteryEntries.length - 1))];

            if(API.getWaitListPosition(getId(winner)) < 0) {
                lotteryUpdated = false;
                return;
            }

            log("@" + winner + " has won the hourly lottery! The lottery occurs at the start of each hour for a ten minute window. Type !lottery within 10 minutes after a new hour for a chance to win!", log.visible);
            API.moderateMoveDJ(getId(winner), 1);
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
    if(message.search("has entered the lottery") == -1) {
        return false;// Do this first cause there's a higher chance of the chatted msg being irrelevant to lotto
    } else {
        if(lastLotto != "") {
            API.moderateDeleteChat(lastLotto);
        }

        lastLotto = chatID;

        return true;
    }
}


function lotteryHourly() {// enable or disable the lottery
    lotteryEnabled = (API.getWaitList().length >= 7);// disable lottery unless 7+ DJs queued

    if (lotteryEnabled) {
        log("The lottery is now open, type !lottery for a chance to be bumped to #1 in the DJ wait list!", log.visible);
    } else {
        log("lotteryEnabled = false at lotteryHourly()", log.info)
    }
}