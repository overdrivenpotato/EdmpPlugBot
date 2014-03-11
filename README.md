EdmpPlugBot
===========

Bot for the r/edmp plug.dj room.

To start, simply login as the bot and copy + paste the following into your address bar
```javascript
javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://raw.github.com/overdrivenpotato/EdmpPlugBot/master/src/loader.js';})();
```

**Note**: in chrome you will need to add ```javascript:``` back manually to the beginning as it will be removed upon paste.

##Commands
* !goosesux
   * Self explanatory.
* !skip
    * Skips the current dj playing. Requires mod level >= 2 (At least bouncer)
* !privateskip
    * Skips the current dj and repositions them back to the beginning of the waitlist. Can be triggered by a mod or the dj themselves
* !eta
    * Gives an eta for when your turn will be based on previous plays and your position in the waitlist.
* !mal
    * ples no
* !reminder
    * Allows mods to set an automatic reminder to show up in chat every 10 minutes, linking to the /r/edmp plug.dj thread
* !help, !commands
    * Lists all available commands to the user
* !stop
    * Stops the bot. *Note: This has been disabled to prevent accidentally disabling the bot. Use ```!update``` to refresh instead.
* !update
    * Updates the bot to match the newest version on this repo. Will restart upon calling this command.
* !credits
    * Displays credits (me + invincibear)
* !smoke
    * wheateryday
* !lottery
    * Enters the lottery. At the beginning of every hour, a lottery is held for 10 minutes. After 10 minutes, one contestant is picked and placed at the top of the waitlist
* !remove
    * Removes the currently playing DJ