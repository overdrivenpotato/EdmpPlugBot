/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */
var scripts = [
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/commands.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/cron.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/lottery.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/blackjack.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/afkcheck.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/handlers.js",
    "https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/bot.js"];


function updateBot() {
    setTimeout(function(){$.getScript("https://rawgit.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js");}, 2000);
}


function load(script)
{
    if(typeof script === "undefined")
        script = 0;
    $.getScript(scripts[script++], function(){
        if(script < scripts.length)
        {
            load(script);
        }
    });
}

load();
