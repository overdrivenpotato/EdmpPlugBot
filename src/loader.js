/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */
var scripts = [
    "http://empirestorage.ca/edmp?f=commands.js",
    "http://empirestorage.ca/edmp?f=lottery.js",
    "http://empirestorage.ca/edmp?f=blackjack.js",
    "http://empirestorage.ca/edmp?f=afkcheck.js",
    "http://empirestorage.ca/edmp?f=handlers.js",
    "http://empirestorage.ca/edmp?f=bot.js"];

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