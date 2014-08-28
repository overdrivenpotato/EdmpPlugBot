/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */
var scripts = [
    "https://empirestorage.ca/edmp?f=commands.js",
    "https://empirestorage.ca/edmp?f=cron.js",
    "https://empirestorage.ca/edmp?f=lottery.js",
    "https://empirestorage.ca/edmp?f=blackjack.js",
    "https://empirestorage.ca/edmp?f=afkcheck.js",
    "https://empirestorage.ca/edmp?f=handlers.js",
    "https://empirestorage.ca/edmp?f=bot.js"];


function updateBot() {
    setTimeout(function(){$.getScript("https://empirestorage.ca/edmp?f=loader.js");}, 2000);
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