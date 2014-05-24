function getBlackJackGame(username, count) {
    count = (typeof count === "undefined") ? false : count;

    for (i = 0; i < blackJackUsers.length; i++) {// search stored games
        if (blackJackUsers[i].indexOf(getId(username)) != -1) {
            return (count) ? i : blackJackUsers[i];
        }
    }

    return -1;// if not already playing
}


function deleteBlackJackGame(username, freepass) {// game over, remove from blackJackUsers array
    freepass    = (typeof freepass === "undefined") ? false : freepass;

    blackJackPlayer = [Date.now(), ""];// remove userID of previous current player

    for(i = 0; i < blackJackUsers.length; i++) {// search stored games
        if(blackJackUsers[i].indexOf(getId(username)) != -1) {
            blackJackUsers.splice(blackJackUsers.indexOf(getId(username)), 1);
            break;
        }
    }

    if(freepass && blackJackPlayers.indexOf(getId(username)) != -1) {// don't prohibit them from waiting for 5 others to play BJ
        blackJackPlayers.splice(blackJackPlayers.indexOf(getId(username)), 1);// remove from the list that inhibits immediate plays
    }
}


function _getRandCard(deck, remove) {
    var randNumber = Math.round(Math.random() * (deck.length - 1));

    if(remove) {
        deck.splice(randNumber, 1);
    }

    return [deck, randNumber];
}


function getSumOfHand(hand){// return the total point value of a given hand ["Q", 3, "A", 6]
    var skippedAces = 0;
    var total       = 0;

    for(i = 0; i < hand.length; i++) {
        switch(hand[i]) {
            case 'A':
                skippedAces++;
                break;
            case 2:
                total = total + 2;
                break;
            case 3:
                total = total + 3;
                break;
            case 4:
                total = total + 4;
                break;
            case 5:
                total = total + 5;
                break;
            case 6:
                total = total + 6;
                break;
            case 7:
                total = total + 7;
                break;
            case 8:
                total = total + 8;
                break;
            case 9:
                total = total + 9;
                break;
            case 10:
            case 'J':
            case 'Q':
            case 'K':
                total = total + 10;
                break;
            case '?':// joker
            default:
                break;
        }
    }

    if (skippedAces) {
        for(i = 0; i < skippedAces; i++) {
            total = ((total + 11) <= 21) ? (total + 11) : (total + 1);// Ace = 11pts unless over 21, then Ace = 1pt
        }
    }

    return total;
}


function blackJackStand(author){// function for dealer to keep hitting if needed
    var game                = getBlackJackGame(author, true);
    var output              = "[!blackjack]@" + author + ", dealer's final hand: ";
    var getCard             = null;
    log("blackJackStand(" + author + ") called, game=" + game, log.info);

    if(getSumOfHand(blackJackUsers[game][2]) < getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) < 21) {
        log("[!blackjack]@" + author + " your score is lower than @EDMPbot's, you must accept another card with !hit", log.visible);
        return;
    } else {
        blackJackUsers[game][7] = true;
    }

    while(game != -1 && getSumOfHand(blackJackUsers[game][2]) >= getSumOfHand(blackJackUsers[game][3])) {// Dealer keeps hitting until score is higher than the user's
        getCard      = _getRandCard(blackJackUsers[game][4], true);// deal a card and get the new deck-chosen card
        blackJackUsers[game][3].push(blackJackUsers[game][4][getCard[1]]);// add the new card to the dealer's hand
        blackJackUsers[game][4] = getCard[0];// make sure we use the spliced deck
    }

    output += blackJackUsers[game][3].join("-") + " totaling " + getSumOfHand(blackJackUsers[game][3]) + "; your final hand: " + blackJackUsers[game][2].join("-") + ", totalling " + getSumOfHand(blackJackUsers[game][2]) + ". ";

    if(getSumOfHand(blackJackUsers[game][2]) < getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][3]) <= 21) {
        log(output + "@EDMPBot wins, you suck compared to it.", log.visible);
        API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
//log("deleteBlackJackGame author="+author, log.info);
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][3]) > 21) {
        log(output + "Dealer busts, you WIN & advance " + blackJackUsers[game][1] + " DJ slots.", log.visible);
        API.moderateMoveDJ(getId(author), getPosition(author) + 1 - blackJackUsers[game][1]);
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][2]) == getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) == 21) {
        log(ouput + "You dodged a bullet, you both scored 21!", log.visible);
        deleteBlackJackGame(author, true);
    } else {
        log("something else, derp?", log.visible);
    }
}


function checkBlackJackWager(author, wager) {// make sure players bet what||less than they can gain||lose
    var correctedPosition   = parseInt(getPosition(author) + 1);
    var maxWin              = correctedPosition - 1;
    var maxLose             = API.getWaitList().length - correctedPosition;
    wager                   = parseInt(wager);

    if((correctedPosition - wager) < 1 || (correctedPosition + wager) > API.getWaitList().length) {// check if they bet more than they can win
        wager = (maxWin > maxLose) ? maxLose : maxWin;// use the lesser amount
    }

    return wager;
}


function checkBlackJackPlayer(author) {// throttle blackjack games
    var authorID = getId(author);

    if(blackJackPlayer[1] == "") {// no active player
        for(var i = 0;i < 5; i++) {
            if(blackJackPlayers[i] == authorID) {
                log("@" + author + ", you must wait a few turns before you can play !blackjack again", log.visible);
                return false;
            }
        }

        blackJackPlayer[1] = authorID;// set current userID to enforce 1 player at a time
        blackJackPlayers.unshift(authorID);// new player, add to blackjack players tracker
        return true;
    } else if(blackJackPlayer[1] != "" && blackJackPlayer[1] != authorID) {// wrong active player
        log("One blackjack player at a time, @" + author, log.visible);
        return false;
    } else if((Date.now() - blackJackPlayer[0]) > blackJackTimeLimit) {// time limit expired
        var username = getUsername(blackJackPlayer[1]);
        var game     = getBlackJackGame(username, true);//array key of current saved game

        log("@" + username + ", time expired and you forfeit your blackjack game, losing " + blackJackUsers[game][1] + " slots");
        API.moderateMoveDJ(blackJackPlayer[1], getPosition(username) + 1 + blackJackUsers[game][1]);
        deleteBlackJackGame(username, true);

        return true;
    } else if(blackJackPlayer[1] == authorID) {// they are the current player
        return true;
    }

    return true;
}


function blackJack(author, args) {// ever been to a casino? good, then I won't explain this function
    var savedGame = null;
    var getCard   = null;
    var game      = null;
    var output    = "";
    args[0]       = (typeof args[0] === "undefined")   ? "" : args[0];
    args[1]       = (typeof args[1] === "undefined")   ? "" : args[1];

    if(!blackJackEnabled && args[1] != "on" && args[1] != "off") {
        log("[!blackjack] @" + author + ", blackJack isn't enabled, you can type !admins for a list of admins who can use " + '"!blackjack on"', log.visible);
        return;
    }

    if(args[1] == "on") {
        blackJackEnabled = true;
        log("Blackjack is now active! Type !blackjack insertnumberofslotstogamblehere to play!", log.visible);
        return;
    } else if(args[1] == "off") {
        blackJackEnabled = false;
        log("Blackjack is now closed, try again later.", log.visible);
        deleteBlackJackGame(author, true);
        return;
    }

    if(!checkBlackJackPlayer(author) && args[1] != "hit" && args[1] != "hitme" && args[1] != "stand" && args[1] != "hold") {
log("lost code in !blackjack", log.info);
       return;// why the eff was this even called then??
    }

    switch(args[0]) {
        case 'hitme':
        case 'hit':
            savedGame = getBlackJackGame(author);// array of current saved game
            game      = getBlackJackGame(author, true);//array key of current saved game

            if(savedGame != -1 && blackJackUsers[game][7]) {
                log("@" + author + " you've already agreed to !stand, you must let the dealer play out their hand");
                return;
            }

            if(savedGame != -1) {
                getCard              = _getRandCard(savedGame[4], true);// deal a card and get the new deck-chosen card
                savedGame[2].push(savedGame[4][getCard[1]]);// add the new card to the user's hand
                savedGame[4]         = getCard[0];// make sure we use the spliced deck
                blackJackUsers[game] = savedGame;

                output               = "[!blackjack]@" + author + ", dealt a " + savedGame[4][getCard[1]] + " making your hand: " + savedGame[2].join("-") + ", totaling " + getSumOfHand(savedGame[2]) + " ";

                if(getSumOfHand(savedGame[2]) == 21 && getSumOfHand(savedGame[3]) == 21) {
                    log(output + "; You got lucky and tied @EDMPBot!", log.visible);
                    deleteBlackJackGame(author, true);
                    return;
                } else if(getSumOfHand(savedGame[2]) == 21) {
                    log(output + "& forcing you to !stand, action is on the dealer now", log.visible);
                    blackJackStand(author);
                    return;
                } else if(getSumOfHand(savedGame[2]) > 21) {
                    log(output + "which is a BUST, please see !addiction to deal with your loss", log.visible);
                    API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
                    deleteBlackJackGame(author);// game over, remove from blackJackUsers array
                    return;
                }  else if (getSumOfHand(savedGame[2]) < getSumOfHand(savedGame[3])) {
                    log(output + "; dealer's hand: " + savedGame[3].join("-") + ", totaling " + getSumOfHand(savedGame[3]) + ". Your hand is weaker, you must !hit", log.visible);
                } else {
                    log(output + "; dealer's hand: " + savedGame[3].join("-") + ", totaling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hit or !stand", log.visible);
                }
            } else {
                log("[!blackjack]@" + author + ", please start a new game, include the amount of DJ wait list slots to wager. Usage: !blackjack 5", log.visible);
            }
            break;
        case 'stand':
        case 'hold':
            blackJackStand(author);
            break;
        case 'blackjack':
        default:
            if(isNaN(args[1]) || args[1] == "" || typeof args[1] === "undefined") {
                log("[!blackjack] @" + author + " please enter a valid wager like so: !blackjack 3", log.visible);
                deleteBlackJackGame(author, true);
                return;
            } else if(isPlaying(author)) {
                log("@" + author + ", you're already DJing, you have no slots to gamble. See !addiction for more details.", log.visible);
                deleteBlackJackGame(author, true);
                return;
            } else if(getPosition(author) == (API.getWaitList().length - 1) || getPosition(author) == -1 || getPosition(author) == 0) {
                log("@" + author + ", you can't gamble when you have nothing to lose! See !addiction for more details.", log.visible);
                deleteBlackJackGame(author, true);
                return;
            } else if(checkBlackJackWager(author, args[1]) != args[1]) {// check if they bet excessively
                args[1] = checkBlackJackWager(author, args[1]);
                log("@" + author + ", your wager has been changed to " + args[1], log.visible);
            }

            savedGame = getBlackJackGame(author);

            if (savedGame != -1) {
                log("[!blackjack]@" + author + ", you already have a game running. Your hand: " + savedGame[2][0] + "-" + savedGame[2][1] + ", totaling " + getSumOfHand(savedGame[2]) + "; dealer's hand: " + savedGame[3][0] + "-" + savedGame[3][1] + ", totalling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hit or !stand.", log.visible);
            } else {
                var newDeck    = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, "J", "J", "J", "J", "Q", "Q", "Q", "Q", "K", "K", "K", "K", "A", "A", "A", "A"];
                var handUser   = [];// values of cards from newDeck, not the keys
                var handDealer = [];
                game           = null;
                getCard        = null;
                output         = "";

                getCard        = _getRandCard(newDeck, true);// deal a card and get the new deck-chosen card
                handUser.push(newDeck[getCard[1]]);// add the first card to the user's hand
                newDeck        = getCard[0];// make sure we use the spliced deck

                getCard        = _getRandCard(newDeck, true);// deal another card
                handDealer.push(newDeck[getCard[1]]);// add second dealt card to dealer's hand
                newDeck        = getCard[0];

                getCard        = _getRandCard(newDeck, true);// deal another card
                handUser.push(newDeck[getCard[1]]);// add the third card to the user's hand
                newDeck        = getCard[0];// make sure we use the spliced deck

                getCard        = _getRandCard(newDeck, true);// deal another card
                handDealer.push(newDeck[getCard[1]]);// add fourth dealt card to dealer's hand
                newDeck        = getCard[0];

                blackJackUsers.push([getId(author), args[1], handUser, handDealer, newDeck, false, false]);// add dealt hands and reduced decks to blackJackUsers tracking array

                game   = blackJackUsers.length - 1;// set array key for future storage/retrieval within function;
                output = "[!blackjack]@" + author + " dealt: [?]-" + handUser[1] + ". Dealer's dealt: [?]-" + handDealer[1] + ". ";

                if(handUser[1] == "A" || handDealer[1] == "A") {
                    output += "Ace detected, revealing hands, yours: " + handUser[0] + "-" + handUser[1] + "; dealer's: " + handDealer[0] + "-" + handDealer[1] + ". ";

                    if(((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" || handUser[0] == "K") && handUser[1] == "A") && ((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A")) {
                        log(output + "You dodged a bullet, you both hit BlackJack!", log.visible);
                        blackJackUsers[game][6] = true;// cards now face-up
                        deleteBlackJackGame(author, true);
                    } else if((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" ||handUser[0] == "K") && handUser[1] == "A") {
                        log(output + "Congratulations you won!", log.visible);
                        blackJackUsers[game][6] = true;// cards now face-up
                        deleteBlackJackGame(author);
                        API.moderateMoveDJ(getId(author), getPosition(author) + 1 - blackJackUsers[game][1]);
                    } else if((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A") {
                        log(output + "@" + author + " got beaten at !blackjack by @EDMBot", log.visible);
                        API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
                        blackJackUsers[game][6] = true;// cards now face-up
                        deleteBlackJackGame(author);
                    } else {
                        if (getSumOfHand(handUser) < getSumOfHand(handDealer)) {
                            output += "Your hand is weaker, you must !hit";
                        } else {
                            output += "Your options are to either !hit or !stand.";
                        }

                         log(output, log.visible);
                    }
                } else {
                    output += "No Aces detected, flipping cards to reveal your hand: " + handUser[0] + "-" + handUser[1] + "; dealer's hand: " + handDealer[0] + "-" + handDealer[1] + ". ";

                    if(getSumOfHand(handUser) == 21 && getSumOfHand(handDealer) == 21) {
                        output += "You dodged a bullet, you both hit BlackJack!";
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        return;
                    } else if(getSumOfHand(handUser) == 21) {
                        output += "You won! You've gained " + args[1] + " positions!";
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        API.moderateMoveDJ(getId(author), getPosition(author) + 1 - blackJackUsers[game][1]);
                        return;
                    } else if(getSumOfHand(handDealer) == 21) {
                        output += "You just got beaten at !blackjack by @EDMBot! You've lost " + args[1] + " positions, pitiful.";
                        API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
                        blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                        return;
                    } else if (getSumOfHand(handUser) < getSumOfHand(handDealer)) {
                        output += "Your hand is weaker, you must !hit";
                    } else {
                        output += "Your options are to either !hit or !stand.";
                    }

                    log(output , log.visible);
                    blackJackUsers[game][6] = true;// cards now face-up
                }

                if(blackJackUsers[game][5]) {
                    blackJackUsers.splice(game, 1);// game over, remove from blackJackUsers array
                    return;
                }
            }
            break;
    }
}


function checkBlackJackOutput(chatID, message) {
    if(message.search("/\[!blackjack\]") == "-1") {
        return false;// Do this first cause there's a higher chance of the chatted msg being irrelevant to BlackJack
    } else {
        if(lastBlackJack != "") {
log("!!!!!!!!!!!!!!!!!!! API.moderateDeleteChat(lastBlackJack); API.moderateDeleteChat(" + lastBlackJack + ");", log.info);
            API.moderateDeleteChat(lastBlackJack);
        }

        lastBlackJack = chatID;
    }
}