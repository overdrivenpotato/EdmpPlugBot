function getBlackJackGame(username, count) {
    count = (typeof count === "undefined") ? false : count;
    var i = 0;

    for (i; i < blackJackUsers.length; i++) {
        if (blackJackUsers[i].indexOf(getId(username)) != -1) {
            return (count) ? i : blackJackUsers[i];
        }
    }

    return -1;// if not already playing
}


function deleteBlackJackGame(username) {// game over, remove from blackJackUsers array
    var i = 0;

    blackJackPlayer = [Date.now(), ""];// remove userID of previous player

    for (i; i < blackJackUsers.length; i++) {
        if (blackJackUsers[i].indexOf(getId(username)) != -1) {
            blackJackUsers.splice(i, 1);
            return;
        }
    }
}


function _getRandCard(deck, remove) {
    var randNumber = Math.round(Math.random() * (deck.length - 1));

    if (remove) {
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
    var output              = "@" + author + ", dealer's final hand: ";
    var getCard             = null;
    log("blackJackStand(" + author + ") called, game=" + game, log.info);

    if(getSumOfHand(blackJackUsers[game][2]) < getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) < 21) {
        log("@" + author + " your score is lower than @EDMPbot's, you must accept another card with !hit", log.visible);
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
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][3]) > 21) {
        log(output + "Dealer busts, you WIN & advance " + blackJackUsers[game][1] + " DJ slots.", log.visible);
        API.moderateMoveDJ(getId(author), getPosition(author) + 1 - blackJackUsers[game][1]);
        deleteBlackJackGame(author);
    } else if(getSumOfHand(blackJackUsers[game][2]) == getSumOfHand(blackJackUsers[game][3]) && getSumOfHand(blackJackUsers[game][2]) == 21) {
        log(ouput + "You dodged a bullet, you both scored 21!", log.visible);
        deleteBlackJackGame(author);
    } else {
        log("something else, derp?", log.visible);
    }
}


function checkBlackJackWager(author, wager) {// make sure players bet what||less than they can gain||lose
    log("checkBlackJackWager(" + author + ", " + wager + ")", log.info);
    var correctedPosition = parseInt(getPosition(author) + 1);
    wager = parseInt(wager);

    if((correctedPosition - wager) < 1) {// check if they bet more than they can win
        log("firstif", log.info);
        if((correctedPosition + wager) > API.getWaitList().length) {// check if they bet more than they can lose
            wager = API.getWaitList().length - getPosition(author) + 1;// how much they can lose
            log("111wager", log.info);
        } else {// they only bet more than they can win, change to the amount of slots they can gain
            wager = getPosition(author);// how much they can win
            log("333wager", log.info);
        }
    } if((correctedPosition + wager) > API.getWaitList().length) {// check if they bet more than they can lose
        log("getPosition(author)=" + getPosition(author) + "; wager=" + wager + "; API.getWaitList().length=" + API.getWaitList().length, log.info);
        log("translates into this math", log.info);
        log(((getPosition(author) + 1) + wager) + " > " + API.getWaitList().length, log.info);
        wager = API.getWaitList().length - (getPosition(author) + 1);// how much they can lose
        log("555wager", log.info);
    } else {
        log("elsereturnwager", log.info);
        return wager;
    }
    log("returnwager", log.info);
    return wager;

}


function checkBlackJackPlayer(author) {// throttle blackjack games
    if(blackJackPlayer[1] != "") {// no active player
        for(var i = 0;i < 5; i++) {
            if(blackJackPlayers[i] == getId(author)) {
                log("@" + author + ", you must wait a few turns before you can play !blackjack again.", log.visible);
                return false;
            }
        }

        blackJackPlayers.unshift(getId(author));// new player, add to blackjack players tracker
        return true;
    } else if(blackJackPlayer[1] != getId(author)) {// wrong active player
        log("One player at a time, @" + author, log.visible);
        return false;
    } else if((Date.now() - blackJackPlayer[0]) > blackJackTimeLimit) {// time limit expired
        var username = getUsername(blackJackPlayer[0]);
        var game       = getBlackJackGame(username, true);//array key of current saved game

        log("@" + username + ", time expired and you forfeit your game of blackjack. You lose " + blackJackUsers[game][1] + " slots.");
        API.moderateMoveDJ(blackJackPlayer[1], getPosition(username) + 1 + blackJackUsers[game][1]);
        deleteBlackJackGame(username);

        return true;
    }
}


function blackJack(author, args) {// ever been to a casino? good, then I won't explain this function
    var savedGame = null;
    var getCard   = null;
    var game      = null;
    var output    = "";

    if (!blackJackEnabled && args[1] != "on" && args[1] != "off") {
        log("@" + author + ", blackJack isn't enabled, you can type !admins for a list of admins who can use " + '"!blackjack on"', log.visible);
        return;
    }
    if(!checkBlackJackPlayer(author) && args[1] != "on" && args[1] != "off") {
       return;
    }

    switch(args[0]) {
        case 'hitme':
        case 'hit':
            savedGame = getBlackJackGame(author);// array of current saved game
            game      = getBlackJackGame(author, true);//array key of current saved game

            if(savedGame != -1 && blackJackUsers[game][7]) {
                log("@" + author + " you've already agreed to !stand, you must let the dealer play out their hand.");
                return;
            }

            if(savedGame != -1) {
                getCard      = _getRandCard(savedGame[4], true);// deal a card and get the new deck-chosen card
                savedGame[2].push(savedGame[4][getCard[1]]);// add the new card to the user's hand
                savedGame[4] = getCard[0];// make sure we use the spliced deck
                blackJackUsers[game] = savedGame;

                output = "@" + author + ", dealt a " + savedGame[4][getCard[1]] + " making your hand: " + savedGame[2].join("-") + ", totaling " + getSumOfHand(savedGame[2]) + " ";

                if(getSumOfHand(savedGame[2]) == 21 && getSumOfHand(savedGame[3]) == 21) {
                    log(output + "; You got lucky and tied @EDMPBot!", log.visible);
                    deleteBlackJackGame(author);
                    return;
                } else if(getSumOfHand(savedGame[2]) == 21) {
                    log(output + "& forcing you to !stand, action is on the dealer now.", log.visible);
                    blackJackStand(author);
                    return;
                } else if(getSumOfHand(savedGame[2]) > 21) {
                    log(output + "which is a BUST, please see !addiction to deal with your loss.", log.visible);
                    API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
                    deleteBlackJackGame(author);// game over, remove from blackJackUsers array
                    return;
                } else {
                    log(output + "; dealer's hand: " + savedGame[3].join("-") + ", totaling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hit or !stand.", log.visible);
                }
            } else {
                log("@" + author + ", please start a new game with the !blackjack command, including the amount of DJ wait list slots to wager. Usage: !blackjack 5", log.visible);
            }
            break;
        case 'stand':
        case 'hold':
            blackJackStand(author);
            break;
        case 'blackjack':
        default:
            if(args[1] == "on") {
                blackJackEnabled = true;
                log("Blackjack is now active! Type !blackjack insertnumberofslotstogamblehere to play!", log.visible);
                return;
            } else if(args[1] == "off") {
                blackJackEnabled = false;
                log("Blackjack is now closed, try again later.", log.visible);
                return;
            }

            if(args.length <= 1) {
                log("@" + author + " please wager an amount of slots, you can't bet more than the amount of slots you can afford to lose. Usage: !blackjack 5", log.visible);
                return;
            } else if(isNaN(args[1])) {
                log("@" + author + " please enter a valid wager.", log.visible);
                return;
            } else if(isPlaying(author)) {
                log("@" + author + ", you're already DJing, you have no slots to gamble.", log.visible);
                return;
            } else if(getPosition(author) == (API.getWaitList().length - 1) || getPosition(author) == -1) {
                log("@" + author + ", you can't gamble when you have nothing to lose! See !addiction for more details.", log.visible);
                return;
            } else if(checkBlackJackWager(author, args[1]) != args[1]) {// check if they bet excessively
                args[1] = checkBlackJackWager(author, args[1]);
                log("@" + author + ", your wager has been changed to " + args[1], log.visible);
            }

            savedGame = getBlackJackGame(author);

            if (savedGame != -1) {
                log("@" + author + ", you already have a game running. Your hand: " + savedGame[2][0] + "-" + savedGame[2][1] + ", totaling " + getSumOfHand(savedGame[2]) + "; dealer's hand: " + savedGame[3][0] + "-" + savedGame[3][1] + ", totalling " + getSumOfHand(savedGame[3]) + ". Your options are to either !hit or !stand.", log.visible);
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
                output = "@" + author + " dealt: [?]-" + handUser[1] + ". Dealer's dealt: [?]-" + handDealer[1] + ". ";

                if(handUser[1] == "A" || handDealer[1] == "A") {
                    output += "Ace detected, revealing hands, yours: " + handUser[0] + "-" + handUser[1] + "; dealer's: " + handDealer[0] + "-" + handDealer[1] + ". ";

                    setTimeout(function(){// delay needed because plug.dj can't handle rapid-succession messages
                        if(((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" || handUser[0] == "K") && handUser[1] == "A") && ((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A")) {
                            log(output + "You dodged a bullet, you both hit BlackJack!", log.visible);
                            blackJackUsers[game][6] = true;// cards now face-up
                            deleteBlackJackGame(author);
                        } else if((handUser[0] == 10 || handUser[0] == "J" || handUser[0] == "Q" ||handUser[0] == "K") && handUser[1] == "A") {
                            log(output + "Congratulations @" + author + ", you won! You've gained " + args[1] + " positions!", log.visible);
                            blackJackUsers[game][6] = true;// cards now face-up
                            deleteBlackJackGame(author);
                            API.moderateMoveDJ(getId(author), getPosition(author) + 1 - blackJackUsers[game][1]);
                        } else if((handDealer[0] == 10 || handDealer[0] == "J" || handDealer[0] == "Q" || handDealer[0] == "K") && handDealer[1] == "A") {
                            log(output + "Hey everybody, @" + author + ", just got beaten at !blackjack by @EDMBot! You've lost " + args[1] + " positions, pitiful.", log.visible);
                            API.moderateMoveDJ(getId(author), getPosition(author) + 1 + blackJackUsers[game][1]);
                            blackJackUsers[game][6] = true;// cards now face-up
                            deleteBlackJackGame(author);
                        }
                    }, 2500);
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