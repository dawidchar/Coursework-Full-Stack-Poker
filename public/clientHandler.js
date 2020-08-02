// @ts-nocheck


//Connection
var host = window.document.location.host.replace(/:.*/, ''); // gets the IP of the webserver to use to connect 
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':' + location.port : '')); // Connect to the host and the current port through Websockets and hence through colyseus
var publicRoom; // Public use of all the client <-> server functions
var currentState; // Current state and all variables of the poker room/ game/ round
var currentPlayer; // Current player detaidls
var myPlayerIndex; // The index of this player/ Your Player


        client.joinOrCreate("PokerRoom", { accessToken: getCookie("authTokenID") }).then(room => { // Tell the server you want to join a Poker Room
            console.log("Access Granted");
            publicRoom = room; // Save the room instance to the public one

            room.onStateChange.once(function (state) { // Once the room updates we set certain callbacks, which means code we want to run if certain event happen, such as a player joins

                room.state.table.players.onAdd = (change) => { // If a player joins add it to the UI and calculate its relative postion, based on the seat Index of this player, such that you as the player are always
                    // in the bottom middle seat
                    console.log("Player Added", change);
                    app.$data.players[calculateRelativePosition(change.inGameIndex)] = { color: change.color, username: change.username, bank: change.chips, onTable: change.onTable, hasCards: change.hasCards };
                    app.$forceUpdate(); // Tells the UI to update its elements 
                };
                room.state.table.players.onRemove = (change) => { // when a player leaves, remove it from UI

                    console.log("Player Removed", change);
                    delete app.$data.players[calculateRelativePosition(change.inGameIndex)]
                    app.$forceUpdate();
                };
                room.state.table.players.onChange = (change) => { // For Testing
                    console.log("----Players Change", change);

                };
                room.state.table.TableCards.onAdd = (change) => { // Everytime a card is added, add that card to the UI 
                    console.log("Table Cards", change)

                    app.$set(app.tableCards, app.$data.tableCards.length, { s: change.suit, r: change.rank })

                    app.$forceUpdate();
                }

                room.state.table.currentPlayer.onChange = (change) => { // For Testing 

                    console.log("%c Current Player Changed", "color:gray", change);

                };


            });



            room.onStateChange(function (state) { // Everytime the state so any variable we specifed to track serverside changes we get an update and we save it so we can refrence it later

                currentState = state.table;


                document.getElementById('raise-input').max = document.querySelector('#player-0 > div > div.playerInfoWrapper > div.playerBank').innerText; //Update Player's Bank
                //Update Player's On Table Chips
                console.log("BET", currentState.roundPlayerBet, "PlayerBET", parseInt(document.querySelector("#player-0 > div > div.playerInfoWrapper > div.playerPot").innerText))

                //Update whether to show the Check or Call button
                if (parseInt(document.querySelector("#player-0 > div > div.playerInfoWrapper > div.playerPot").innerText) >= currentState.roundPlayerBet) {
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.check").style = "display:block";
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.call").style = "display:none";
                } else {
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.check").style = "display:none";
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.call").style = "display:block";
                    // If Showing call button determin how much the player has to call and show it to the user
                    if (currentState.roundPlayerBet > parseInt(document.querySelector("#player-0 > div > div.playerInfoWrapper > div.playerBank").innerText)) {
                        document.querySelector("body > div.vue-container > div.controls > a.actionButton.call").innerText = "Call All In"

                    } else {
                        document.querySelector("body > div.vue-container > div.controls > a.actionButton.call").innerText = "Call £" +
                            (currentState.roundPlayerBet - parseInt(document.querySelector("#player-0 > div > div.playerInfoWrapper > div.playerPot").innerText));
                    }
                }
                //Update the pot and current Bet
                document.querySelector("body > div.vue-container > div.table > div.table-pot > h2").innerHTML = "Pot: £" +
                    currentState.pot + "<span style='font-size: 10pt; vertical-align: middle;' >" + "  (Bet:£" + currentState.roundPlayerBet + ")</span>"




            });


            room.state.table.onChange = (change) => {

            };




            room.onMessage((message) => { // Messages from server typically holds infromation of commands
                if (message.update_currentPlayer) { // If we switch the current player, we add a little thinking icon by adding a playing class to the player throug their ID
                    console.log("New Current Player  %c" + message.update_currentPlayer, "color:lime")

                    for (i = 0; i < 6; i++) { // Delete the playing Icon from any player that may have it
                        var el = document.getElementById("player-" + i)
                        if ((el != null) && (el.classList.contains("playing"))) {
                            el.classList.remove("playing");
                        }
                    }
                    var elPlaying = document.getElementById("player-" + calculateRelativePosition(currentState.players[message.update_currentPlayer].inGameIndex)) // Find the current player based on their relevant position 
                    console.log(currentState.players)
                    console.log("player-" + calculateRelativePosition(currentState.players[message.update_currentPlayer].inGameIndex), currentState.players[message.update_currentPlayer].inGameIndex, message.update_currentPlayer)
                    console.log("elPlaying", elPlaying)
                    if (elPlaying != null) {
                        elPlaying.classList.add("playing"); // Add a playing icon to the current player
                    }
                    app.$forceUpdate();
                } else if (message.cards) { // This means you received your cards and we add it to the UI so you can see it, this is not syncronsied as that would mean 
                    //every other player would be able to see your cards
                    console.log("Your Cards", message.cards)
                    app.$data.players[0].hasCards = true;
                    var el = document.getElementById("player-0")
                    for (i = 0; i < 2; i++) {
                        app.$set(app.playerCards, i, { s: message.cards[i].suit, r: message.cards[i].rank }) // set the data of the VUE element to store your card 
                        if ((el != null) && (el.classList.contains("folded"))) {
                            el.classList.remove("folded");
                        }
                    }
                    for (i = 1; i < 6; i++) { // For every player also add blank cards for UI sake
                        var el = document.getElementById("player-" + i)
                        if (app.$data.players[i]) {
                            app.$data.players[i].hasCards = true

                            if ((el != null) && (el.classList.contains("folded"))) {
                                el.classList.remove("folded");
                            }
                        }
                    }
                    app.$forceUpdate();

                } else if (message.initRoom) { // Init room is a initial room state and is used to display any players that were already in the room when you joined
                    let initRoom = message.initRoom
                    myPlayerIndex = initRoom.players[room.sessionId].inGameIndex;

                    console.log("Init Room", initRoom)
                    for (let i = 0; i < 6; i++) { // Go through each potential player in already in the game

                        if (initRoom.seatsIndex[i] != undefined || initRoom.seatsIndex[i] != null) { // We go through every potential seat and check if there is a player that suposed to be there if so, we add it to the UI
                            console.log(initRoom.players[initRoom.seatsIndex[i]].sessionID)
                            console.log(initRoom.players[initRoom.seatsIndex[i]].sessionID == room.sessionId)
                            if (initRoom.players[initRoom.seatsIndex[i]].sessionID == room.sessionId) { // If the current player is you.
                                app.$data.players[0].color = initRoom.players[initRoom.seatsIndex[i]].color //set your colour
                                app.$data.players[0].bank = initRoom.players[initRoom.seatsIndex[i]].chips; //set your chips
                                app.$data.players[0].username = initRoom.players[initRoom.seatsIndex[i]].username + " (you)" //add the (You) text to your username
                            } else {
                                //Add another player
                                let playerToAdd = initRoom.players[initRoom.seatsIndex[i]]
                                app.$data.players[calculateRelativePosition(playerToAdd.inGameIndex)] = { color: playerToAdd.color, username: playerToAdd.username, bank: playerToAdd.chips, onTable: playerToAdd.onTable, hasCards: playerToAdd.hasCards };
                            }
                            app.$forceUpdate();
                        }
                    }
                    document.getElementById('raise-input').min = initRoom.smallBlind
                    document.getElementById('raise-input').step = initRoom.smallBlind
                    document.getElementById('raise-input').value = initRoom.smallBlind
                    console.log(app.players)
                } else if (message.update_currentPlayer_action) {
                    console.log("Update Action Current Player %c" + message.update_currentPlayer_action, "color:lime")
                } else if (message.show_check) {
                    console.log("Showing Check Button") // Force show check button
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.check").style = "display:block";
                    document.querySelector("body > div.vue-container > div.controls > a.actionButton.call").style = "display:none";
                } else if (message.update_players) { // Update Players UI
                    var updatePlayers = message.update_players
                    for (let sesionKey in updatePlayers) {
                        selectedPlayer = updatePlayers[sesionKey]
                        console.log(selectedPlayer.sessionID)
                        console.log(selectedPlayer.sessionID == room.sessionId)
                        if (selectedPlayer.sessionID == room.sessionId) { // If player in for loop is this player
                            app.$data.players[0].bank = selectedPlayer.chips; //set chips
                            app.$data.players[0].onTable = selectedPlayer.playerBet; //set player bet

                            var el = document.querySelector("body > div.vue-container > div.table > div.players > div.your-cards") // get this players card to update
                            if (selectedPlayer.folded) { // if player folded
                                el.classList.add("folded") // add folded UI
                            } else {
                                if ((el != null) && (el.classList.contains("folded"))) {
                                    el.classList.remove("folded"); //remove folded UI
                                }
                            }


                        } else {

                            app.$data.players[calculateRelativePosition(selectedPlayer.inGameIndex)].bank = selectedPlayer.chips;
                            app.$data.players[calculateRelativePosition(selectedPlayer.inGameIndex)].onTable = selectedPlayer.playerBet;
                            app.$data.players[calculateRelativePosition(selectedPlayer.inGameIndex)].hasCards = (!selectedPlayer.folded)
                        }
                    }
                    app.$forceUpdate();
                } else if (message.info_text) {
                    document.getElementById("info-text").innerText = message.info_text;
                } else if (message.clear) {
                    app.$data.tableCards = []
                    app.$data.playerCards = []
                } else if (typeof message == "string") {
                    console.log("%c" + message, "color:red")
                } else {
                    console.log(message)
                }
            });


        }).catch(e =>{
            console.log("Access Denied")
            window.location.replace(window.location.origin) 
        })
  


Number.prototype.NegativeMod = function (n) { // Mod in javascript does work like intented for negative numbers, for example -1 MOD 6 is JS gives 1 while We need it to equal 5 for working
    //out relative posistion so the below formula enalbes that
    return ((this % n) + n) % n;
}

function calculateRelativePosition(playerIndex) {
    return (playerIndex - myPlayerIndex).NegativeMod(6) // We use the negative MOD to get the player position relative to your index/seat num such that you are always in the same spot
}




//Button functions, send your action to the server.
function button_SendAction_Check() {
    publicRoom.send({ pokerAction: "CHECK" })
}

function button_SendAction_Call() {
    publicRoom.send({ pokerAction: "CALL" })
}

function button_SendAction_Raise() {
    if ((document.getElementById('raise-input').value == "") || (document.getElementById('raise-input').value == undefined)) {
        document.getElementById('raise-input').value = document.getElementById('raise-input').min
    }
    publicRoom.send({ pokerAction: "RAISE", raiseAmount: document.getElementById('raise-input').value })
}

function button_SendAction_Fold() {
    publicRoom.send({ pokerAction: "FOLD" })
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}