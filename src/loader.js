/**
 * Created with JetBrains WebStorm.
 * User: Marko
 * Date: 3/9/14
 * Time: 10:34 PM
 */
var scripts = [
    "https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/commands.js",
    "https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/afk.js",
    "https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/bot.js"];

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