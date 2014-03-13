//function Command(cmd, callback, permission, customPerm)
function Chatter(username, userID, date, message) {
    this.cmd = cmd;
    this.userID = userID;
    this.date = date;
    this.message = message;
}

var chatters = [];

function oonchat () {

    Chaters[chatters.length] = new Chatter("help,", function(author){
        var avail = getAvailable(author);
        var chatoutput = "@" + author + ", you have access to the following commands: ";
        for(var i = 0; i < avail.length; i++)
        {
            chatoutput += "!" + avail[i].cmd + (i != avail.length - 1 ? ", " : "");
        }
        log(chatoutput, log.visible);
    });

}