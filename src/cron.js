function cronHourly() {// called at the start of a new hour ie. 0 minutes & seconds
    log("cronHourly() has been called!", log.info);

    var d = new Date();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var countdown = (60 * (60 - min) + (60 - sec) - 60) * 1000;// -60 cause shit keeps checking at 01 after pl have already entered the lotto

    if (min == "00" || min == "0" || min == "01" || min == "1" || typeof min === undefined) {// browser-dependant, had to add 01 for some silly reason
        log("the hour is fresh, run additional hourly functions", log.info);
        lotteryHourly();// check to see the lottery can be activated
        ReminderEnabled = false;//(curdate.getDay() == 3 || curdate.getDay() == 6);// disable reminder on non-meet days to prevent spam
//        reminderHourly();// check to see if it is now a meetup day to activate the reminder
    }

    if (lastCronHourly == 0 || (Date.now() - lastCronHourly) >= (60 * 60 * 1000)) {// spam & resource overload prevention
        setTimeout(cronHourly, countdown);// check back in an hour
    }

    lastCronHourly = Date.now();
}


function cronFiveMinutes() {// called every 5 minutes
    if(checkAFKEnabled) {// Check for AFK DJs
        checkAFKs(MaxAFKMinutes);
    }

    var timestamp = new Date(Date.now() + (5 * 60 * 1000));
    log("setting cronFiveMinutes() check for " + (5 * 60) + " seconds from now at " + timestamp.getHours() + ":" + timestamp.getMinutes() + ":" + timestamp.getSeconds(), log.info);
    setTimeout(cronFiveMinutes, (5 * 60 * 1000));// check back in 5 minutes
    lastCronFiveMinutes = Date.now();
}


function cronSpecialEvent() {// called every 5 minutes
    if(checkAFKEnabled) {// Check for AFK DJs
        checkSpecialEvent();
    }

    var timestamp = new Date(Date.now() + (1.5 * 60 * 1000));
    log("setting cronSpecialEvent() check for " + (1.5 * 60) + " seconds from now at " + timestamp.getHours() + ":" + timestamp.getMinutes() + ":" + timestamp.getSeconds(), log.info);
    setTimeout(cronFiveMinutes, (5 * 60 * 1000));// check back in 1.5 minutes
    lastCronSpecialEventMinutes = Date.now();
}

