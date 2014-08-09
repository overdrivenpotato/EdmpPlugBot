/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */
var scripts = [
    "http://empireventures.ca/edmp.php?f=commands.js",
    "http://empireventures.ca/edmp.php?f=cron.js",
    "http://empireventures.ca/edmp.php?f=lottery.js",
    "http://empireventures.ca/edmp.php?f=blackjack.js",
    "http://empireventures.ca/edmp.php?f=afkcheck.js",
    "http://empireventures.ca/edmp.php?f=handlers.js",
    "http://empireventures.ca/edmp.php?f=bot.js"];

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