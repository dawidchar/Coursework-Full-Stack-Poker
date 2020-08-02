import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, filter, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player";
import { Deck } from "./deck.js";
import './publicEnums';
import { PokerAction, RoundAction, RoundMode, GameState } from "./publicEnums";
import { Card } from "./card.js";
import { PokerRoom } from "../rooms/PokerRoom";
import { Hand } from "./Hand"


export class Table extends Schema {
    @type("string") gameState: GameState = GameState.Lobby;
    nextgameState: GameState = GameState.Lobby;
    @type("string") roundAction: RoundAction = RoundAction.Lobby;
    @type("number") smallBlind!: number;
    @type("number") bigBlind!: number;
    @type("number") dealer = 0;
    @type("number") pot = 0;
    @type("number") roundPlayerBet = 0;
    @type("number") raiseAmount = 0;
    @type(Player) currentPlayer: Player = new Player;
    //@type("number") currentPlayerindex = 0;
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("number") playerCount = 0;
    @type(["string"]) GamePlayers = new ArraySchema();
    @type([Card]) TableCards = new ArraySchema();
    roomHandler!: PokerRoom
    tableConfig = require("./../poker/pokerConfig.json")
    @type(["string"]) seatsIndex = new ArraySchema
    deck: Deck
    winnersArray: string[][] = [];
    potHistory: number[] = [];
    private timeoutTimeHit = false;

    constructor(configFile?: string) {
        super(); // Required for the schema
        if (configFile) { // If alternate configfile has been provided use it otherwise use the default one
            this.tableConfig = require(configFile) //Load config file
            console.log("New Settings Loaded")
        }
        this.smallBlind = this.tableConfig.Poker.smallBlind
        this.bigBlind = this.tableConfig.Poker.bigBlind
        console.log("Created Table");
        this.deck = new Deck(); // Create a New Deck
    }

    setHandler(inputRoomHandler: PokerRoom) { // Called right after this class is created by the parent to enalbe
        //this child class to have access to the properties and functions of the parent class which is used for sending messages
        console.log("RoomHandler Created")
        this.roomHandler = inputRoomHandler; // Save Room handler as a local variable
        this.roomHandler.setMetadata(this.tableConfig.Poker) // Get metta data and save it
        console.log("Set Metadata", this.roomHandler.metadata)
    }

    private gamseStartTimer: any;
    private gameStartCounter: any = 10;


    clearGame() {
        this.GamePlayers = new ArraySchema();
        this.winnersArray = [];
        this.TableCards = new ArraySchema();
        this.pot = 0;
        this.potHistory = [];
        this.roundPlayerBet = 0;
        this.raiseAmount = 0;
        this.clearPlayersBets();
    }
    startGame() {
        if (this.playerCount > 1) {
            if (this.gameStartCounter < 0) {

                this.nextgameState = GameState.PreGame;
                clearTimeout(this.gameStartCounter);
                delete this.gamseStartTimer
                this.gameStartCounter = 5;
                this.playGame();
            } else {
                this.roomHandler.broadcast({ info_text: ("New Game Starting In " + this.gameStartCounter) });
                this.gameStartCounter--;
                this.gamseStartTimer = setTimeout(() => {
                    this.startGame()
                }, 1000);
            }
        } else {
            this.roomHandler.broadcast({ info_text: ("Not Enough Players") });
            clearTimeout(this.gameStartCounter);
            delete this.gamseStartTimer
            this.gameStartCounter = 5;
        }

    }


    playGame() {
        // console.log("About to Start")
        this.roomHandler.broadcast(`~~~~~~~~~~~~~~~~~ ${this.nextgameState} ~~~~~~~~~~~~~~~~~`);
        console.log(`~~~~~~~~~~~~~~~~~ ${this.nextgameState} ~~~~~~~~~~~~~~~~~`);
        this.roomHandler.broadcast({ info_text: this.nextgameState });
        switch (this.nextgameState) { // Choose the next game/round state and perform round specific actions
            case (GameState.Lobby): { // Sets the mode from lobby to pregrame
                console.log(this.gamseStartTimer)
                if (this.playerCount > 1) { // For testing, check there are atleast 3 players
                    this.gameState = GameState.Lobby;
                    if (this.gamseStartTimer == undefined) { this.startGame(); }

                } else {
                    clearTimeout(this.gameStartCounter);
                    delete this.gamseStartTimer
                    this.gameStartCounter = 5;
                }
                break;
            }
            case (GameState.PreGame):
                this.gameState = GameState.PreGame
                this.nextgameState = GameState.PreFlop // Set next State
                this.newRound(); // Give out cards and send them to the correct players and take blinds
                this.playGame(); // Go to next state by calling this function again 
                this.potHistory[0] = this.pot;

                break;
            case (GameState.PreFlop):
                this.gameState = GameState.PreFlop
                this.nextgameState = GameState.Flop

                this.runRound(); // Go through each player and get them to either buy-in, fold or raise
                this.potHistory[1] = this.pot;
                break;
            case (GameState.Flop):
                //Get the table cards for the Flop and save them to the following variables 
                //They will automatically be sent to the players/clients as they variable are syncronsied through the
                // colyseus Schema
                this.TableCards.push(this.deck.getCard());
                this.TableCards.push(this.deck.getCard());
                this.TableCards.push(this.deck.getCard());
                //
                this.gameState = GameState.Flop
                this.nextgameState = GameState.Turn

                this.runRound(); // Play the round
                this.potHistory[2] = this.pot;
                break;
            case (GameState.Turn):
                //Turn Cards
                ////Another Card 
                this.TableCards.push(this.deck.getCard());
                //
                this.gameState = GameState.Turn;
                this.nextgameState = GameState.River;
                this.runRound();
                this.potHistory[3] = this.pot;
                break;
            case (GameState.River):
                //River Cards
                ////Final Card 
                this.TableCards.push(this.deck.getCard());
                //
                this.gameState = GameState.River;
                this.nextgameState = GameState.Showdown;
                this.runRound();
                this.potHistory[4] = this.pot;
                break;
            case (GameState.Showdown):
                this.gameState = GameState.Showdown;
                this.findWinner() // Find Winnner
                this.nextgameState = GameState.Payout;
                this.playGame(); // Takes us to the Payout
                break;
            case (GameState.Payout):
                {
                    this.payoutWinners(); // Pay the winners
                    setTimeout(() => {
                        this.roomHandler.broadcast({ clear: "NewRound" })
                        this.gameState = GameState.Lobby;
                        this.clearGame() // Clear all the varibles.
                        for (let id in this.players) { // For each player, reset their folded variable and their action. 
                            const player: Player = this.players[id];
                            player.folded = true;
                            delete player.playerHand;
                        }
                        this.roomHandler.broadcast({ update_players: this.players });
                        this.gameStartCounter = 10; //Start the new game in 10 seconds
                        this.startGame(); //Start a new Game
                    }, 10000); // Wait 10 seconds before we clear the screen ready for the next game
                }

        }
    }

    findWinner() {
        for (let id in this.players) {
            if (this.GamePlayers.includes(id)) {
                this.players[id].createHandRanking(this.TableCards);


                var el: string[] = [id, this.players[id].playerHand.PokerRankValue]
                this.winnersArray.push(el);

                console.log("------------------------------------------");
            }

        };
        this.SortWinners()
    }

    SortWinners() {
        //  console.log(this.winnersArray)
        for (var i = 1; i < this.winnersArray.length; i++) {
            var selectedPlayer = this.winnersArray[i]
            var j = i - 1
            while (j >= 0 && this.winnersArray[j][1] > selectedPlayer[1]) {
                this.winnersArray[j + 1] = this.winnersArray[j]
                j--;
            }
            this.winnersArray[j + 1] = selectedPlayer

        }
        console.log(this.winnersArray)

    }

    payoutWinners() {
        var WinningHand = ""
        if (this.players[this.winnersArray[this.winnersArray.length - 1][0]].playerHand != undefined) { //Checks the correct winning message to send
            WinningHand = "(" + this.players[this.winnersArray[this.winnersArray.length - 1][0]].playerHand.PokerRank + ") Cards: "
                + this.players[this.winnersArray[this.winnersArray.length - 1][0]].playerHand.formatedPlayerCards
        }
        this.roomHandler.broadcast({ winner: this.winnersArray[this.winnersArray.length - 1][0] })
      
        this.roomHandler.broadcast(
            {
                info_text: (
                    this.players[this.winnersArray[this.winnersArray.length - 1][0]].username +
                    " Won! " + WinningHand)
            }
        );

        if (this.winnersArray.length == 1) { // If only one player is left give him the pot
            this.pot -= this.players[this.winnersArray[0][0]].giveChips(this.pot);
        } else {
            var amountTakenFromPot = 0;
            for (var i = this.winnersArray.length - 1; i > 0; i--) {//loop through every winner
                if (this.pot <= 0) { break; }; // Leave the loop if the pot is empty
                var currentWinner: Player = this.players[this.winnersArray[i][0]]
                var payoutAmount
                if (this.pot > (currentWinner.maxPayout - amountTakenFromPot)) { // If they went all in and their max payout is smaller than
                    //the amount in the pot, only give them the amount they are allowed to take, minus any amount that has already been taken
                    payoutAmount = this.pot - (currentWinner.maxPayout - amountTakenFromPot)
                } else {
                    payoutAmount = this.pot // If player has no maxPayout or it is bigger than the pot size pay the pot to the player
                }
                amountTakenFromPot += payoutAmount; // For tracking if pot is shared
                console.log("Paying £", payoutAmount, "To:", currentWinner.sessionID)
                this.pot -= currentWinner.giveChips(payoutAmount) // Take away from the pot the amount the player is given
                // The give Chips function returns the amount that was used to give the player

            }
        }
        this.roomHandler.broadcast({ update_players: this.players });
        this.winnersArray = [];
    }

    LastplayerWin(playerID: string) {
        console.log("Player Won!", playerID)
        this.nextgameState = GameState.Payout;
        this.winnersArray.push([playerID, ""])
        this.playGame();
    }


    newRound() {
        console.log("New Round");
        this.roundAction = RoundAction.NewRound; // For logging purposees
        this.pot = 0; // Clear the Pot
        this.deck = new Deck(); // Create a new Shuffled Deck
        console.log("Old Dealer: " + this.dealer);
        this.dealer = this.loopTable(this.dealer, 1, true);
        console.log("New Dealer: " + this.dealer);
        for (let id in this.players) { // Go through each player
            const player: Player = this.players[id]; // Refrence the currently selected player and save the refrence to the instance
            // to a temporary variable to easily refer the the currently selected player
            this.GamePlayers.push(player.sessionID); // Push the session IDs to the following Game players array
            //Game Players tracks the players currently playing, so if a player joins mid-game, they are not included in the current
            // Game and are removed when they fold
            // We save the player sessionID as the this.players is not an array but a Map where the key is the sessionID

            player.setCard(this.deck.getCard(), this.deck.getCard()); // Client-Side save 2 cards that we take out of the deck
            console.log("Cards For player Sorted")
            this.roomHandler.send(player.internalClient, { "cards": player.cards }) // Send the cards to the player
        }

        this.roundAction = RoundAction.CardsDealt;
        this.resetPlayers(true); // Reset all properties of all players

    }
    runRound() {
        this.clearPlayersBets()
        if (this.gameState == GameState.PreFlop) {
            this.roundPlayerBet = this.bigBlind; // Set inital Buyin
            this.runBlinds();
        } else {
            this.roundPlayerBet = 0; // Internal counter for how much each player should put into the pot to carry on
        }
        console.log("Run Round")
        this.roundAction = RoundAction.NewRound;
        this.resetPlayers();//Reset the players previous action
        this.roomHandler.broadcast({ update_players: this.players });
        this.runRoundPlayers(); // Play the real round logic
    }

    clearPlayersBets() {
        for (let id in this.players) { // For each player, reset their folded variable and their action. 
            const player: Player = this.players[id];
            player.playerBet = 0;
        }
    }

    resetPlayers(fullreset?: boolean) {
        for (let id in this.players) { // For each player, reset their folded variable and their action. 
            const player: Player = this.players[id];
            if (fullreset) { player.folded = false; player.allIn = false; }  // If full reset, then clear their folded status too
            player.action = PokerAction.Null;
        }
        this.requireDecisionFromPlayers(true); // Mark that we are awaiting a decision from players, the true means all players
        // including the current player
    }

    roundFinished = false;
    runRoundPlayers() {
        if (this.GamePlayers.length <= 1) {
            this.LastplayerWin(this.GamePlayers.pop())
        } else {
            console.log("Run Round Players")
            var nextPlayerIndex = this.loopTable(this.currentPlayer.inGameIndex, 1); // Get the next player, by calling loop table
            //which calculates the next player clockwise
            console.log("Next Player:", nextPlayerIndex, "     Current Player Index: ", this.currentPlayer.inGameIndex)
            this.currentPlayer = this.players[this.seatsIndex[nextPlayerIndex]] // After obtaining the index of the next player
            //we get the ID of the player in that seat and pass that SessionID which is the key to the players map 
            //and assing the current player to that player
            this.currentPlayer.action = PokerAction.Await
            console.log(`************************ ${this.currentPlayer.sessionID} ************************`);
            this.roomHandler.broadcast({ update_currentPlayer: this.currentPlayer.sessionID }); // Broadcast this new current player
            // this.updatePlayer(); // Bad Name, simply console log the new current player
            //  this.currentPlayer.chips += 1; // TESTING============================================================================

            if (this.currentPlayer.allIn) {
                this.currentPlayer.requireDecision = false;
                this.cbCheckNextPlayer()
            } else {
                if (this.currentPlayer.chips == 0) {
                    console.log("Error - Not enough Funds");
                    this.currentPlayer.action = PokerAction.Fold;
                    this.executeCurrentPlayerAction();
                } else {
                    setTimeout(() => { this.awaitResponseAction() }, 100);  //Just ensure everything gets syncronised and all messages sent
                    //to clients and then call the await response function which waits for the user to decied an action otherwise it 
                    //automatically picks and action 
                }

            }

        }
    }



    test() {
        var roundFinished

        for (let sessionKey in this.GamePlayers) {
            if (this.players[sessionKey].requireDecision) {
                roundFinished = false;
                break;
            } else {
                roundFinished = true;
            }
        }


    }



    cbCheckNextPlayer() { // Checks if there are still players that need to perform an action
        console.log("CB Run Round Players")
        this.roundFinished = true; // will be changed if a player still needs to decide on an action
        this.roomHandler.broadcast({ update_players: this.players });
        for (let sesionKey in this.players) { // Go through each player
            if (this.GamePlayers.includes(sesionKey)) { // Ensure that player is currently playing as their session ID
                // should be in the gameplayesr array
                if (this.players[sesionKey].requireDecision && !this.players[sesionKey].allIn) { // If the player still needs to make a decison 
                    //Switch round finished to false and exit the loop
                    console.log("Check if require Decision from ", this.players[sesionKey].sessionID, this.players[sesionKey].requireDecision);
                    this.roundFinished = false;
                    break;
                }
            }
        }
        if (!this.roundFinished) { // If the above variable was changed because there is still a player that needs to
            //decide on a decision/action play the Round/Players again (It will choose the next player along)
            console.log("Round Not Finished"); ////////////////////// Add a check that the next player in the table still needs to make a decision//////////////////////////
            this.runRoundPlayers();
        } else { // Otherwise if all players made a decision, go back to the main switch case structure to go the next stage

            this.calculateAllInMaxPayout()
            console.log("End Round Catchup Timer");
            // However wait half a second, to ensure everything is syncronsied 
            setTimeout(() => { console.log("#Round Finished#"); this.playGame(); }, 500)

        }
    }

    calculateAllInMaxPayout() {
        for (let id in this.players) { // For each player, reset their folded variable and their action. 
            const player: Player = this.players[id];
            if ((player.allIn) && (player.playerBet != 0)) {
                player.maxPayout += player.playerBet * this.GamePlayers.length;
            }  // If full reset, then clear their folded status too
        }
    }

    executeCurrentPlayerAction(skipAwait?: boolean) { //Perform the action of a player

        if (!skipAwait) {
            setTimeout(() => { this.executeCurrentPlayerAction(true) }, 100) // this ensures that before a player performs the action
            //It has requested to do, the server wait 100milliseconds to ensure everything is syncronsied
            return;
        }
        //Validte all the variables and call the correct function based on the action requested to perfrom
        if (this.currentPlayer.action != PokerAction.Null && this.currentPlayer.action != PokerAction.Await) {

            switch (this.currentPlayer.action) {
                case PokerAction.Call:
                    this.runPokerActionCall();
                    break;
                case PokerAction.Check:
                    this.runPokerActionCheck();
                    break;
                case PokerAction.Raise:
                    this.runPokerActionRaise();
                    break;
                case PokerAction.Fold:
                    this.runPokerActionFold();
                    break;
            }
        }
        else { // However if the action requested is missing data, simply perfom an auto-decide

            this.currentPlayer.action = this.autoDecide();
            this.executeCurrentPlayerAction();
        }
        this.roomHandler.broadcast({
            update_currentPlayer_action: this.currentPlayer.action,
        });
        setTimeout(() => { this.cbCheckNextPlayer() }, 100); // After everything check if the round show have finisehd
    }

    runPokerActionCheck() {
        console.log("Check") // Check does nothing, we simply go to the next player
    }

    runPokerActionCall() { // If a player calls, it matches the perplayerPot and hence matches the amount each other player
        //needs to put into the pot to carry on
        console.log("Call")
        var toPay = this.roundPlayerBet - this.currentPlayer.playerBet; // Check how much more the player has to pay to match the 
        //per Player Pot
        if (this.checkBalance(toPay)) { // Check they have enough money
            this.pot += this.currentPlayer.takeChips(toPay, true); // Take the chips from the players and add it to the pot
            console.log(` successful, ${toPay} has been added to the pot.`);
        } else {
            this.currentPlayer.allIn = true;
            this.currentPlayer.maxPayout = this.potHistory[this.potHistory.length - 1]
            this.pot += this.currentPlayer.takeChips(this.currentPlayer.chips, true);

        }
    }

    runPokerActionRaise() { // If a player raises 
        var paymentAmount = this.raiseAmount + (this.roundPlayerBet - this.currentPlayer.playerBet)
        console.log("Raise", this.raiseAmount, "Total:", paymentAmount)
        if (this.checkBalance(paymentAmount)) { // Check the balance if there are sufficeitn funds, this will also be done client-side
            // However the server verifies this to ensure integrity even if players try to alter numbers
            this.pot += this.currentPlayer.takeChips(paymentAmount, true); // take the chips and add them to the pot
            this.roundPlayerBet += this.raiseAmount; // Raise the amount required in the PerPlayer Pot
            this.roomHandler.broadcast({ info_text: ("Current Bet Raised by: " + this.raiseAmount) })
            console.log(`successful, ${this.raiseAmount} raised.`);
            this.raiseAmount = -1; // Reset the raise amount varaible
        } else { // If a player raises more than is actually avaialbe to them, means client side verification was bypaseed so just fold
            this.currentPlayer.allIn = true;
            this.currentPlayer.maxPayout = this.potHistory[this.potHistory.length - 1]
            this.roundPlayerBet += this.currentPlayer.chips;
            this.pot += this.currentPlayer.takeChips(this.currentPlayer.chips, true);

        }
        this.requireDecisionFromPlayers(false); // Require a decision if all other players want to match the raise, raise even more
        //Or fold, the false means we do not need to have another decision from the current player so set require decision from every
        //player except the current player
    }

    requireDecisionFromPlayers(AllPlayers: boolean) { // Reset the require decision from every player 
        //If all players is true, require decision from the current player while false means all players exepct the current player
        console.log("Require Decision From players again");
        for (let id in this.players) {
            const player: Player = this.players[id];
            if (player.sessionID != this.currentPlayer.sessionID || AllPlayers) {
                player.requireDecision = true;
            }
        }

    }

    runPokerActionFold() { // Fold deletes the player from currently playing players and sets all of its properties to folded 

        console.log("Player Folded");
        this.currentPlayer.folded = true;
        this.currentPlayer.requireDecision = false;
        this.GamePlayers.splice(this.GamePlayers.indexOf(this.currentPlayer.sessionID), 1)

    }
    checkBalance(payable: number): boolean { // Check If the player has enough funds and return a boolean
        //This just saves a bit of space in the if statements above
        if (this.currentPlayer.chips > payable) {
            return true
        } else {
            return false
        }
    }


    private timeoutInstance: any; // Public instance of a Timer that can be cancled 
    awaitResponseAction() {
        this.timeoutTimeHit = false; // If the timeoutperiod has been reached
        this.roundAction = RoundAction.AwaitDecision;
        const timeoutHandle = () => { // We create a call back function, this only runs if the timeout period reaches it
            //threshold amount
            console.log("TIMEOUT!!")
            if (!this.validateCurrentPlayer()) { return null }; // Check player is still in the game otherwise ignore
            this.roundAction = RoundAction.Timeout;
            this.timeoutTimeHit = true;
            this.currentPlayer.action = this.autoDecide(); // Automaticlly make a decision for the player as they did not make a 
            //decision in time

        }
        console.log("NEW awaitResponse Timer")
        this.timeoutInstance = setTimeout(timeoutHandle, 600000); // Create a new instance of a timer and save it to a public 
        //variable so it can be stopped, after the timer reaches the specified time, it calls the callback function spefiecied above
        //which only runs after the time of the timer has ellapsed
        //This now does not affect the flow of the program and the timer runs in the background
        this.awaitResponseActionCheck();// Every set period of time check if a player make a decion
    }


    validateCurrentPlayer() { // Checks if the current player is still in the game otherwise, we continue with the game and 
        //ignore this player as well as stop any timers 
        if (!this.players[this.currentPlayer.sessionID]) {
            console.log("Current Player Left, Going Forward")
            clearTimeout(this.timeoutInstance);
            this.dealer = this.loopTable(this.dealer, 1);
            setTimeout(() => { this.cbCheckNextPlayer() }, 100);
            return false
        }
        return true

    }


    awaitResponseActionCheck = () => { // This is a call back function that calls it self and checks if a player make a decision
        //this only stops if a player makes a deicision or the timeout period is reached

        if (!this.validateCurrentPlayer()) { console.log("Failed Player Validation"); return null }; // Check player is still in the game

        if (this.currentPlayer.action == PokerAction.Await && this.timeoutTimeHit == false) { // If player still has not made a decision
            // and the timer has not run out of time, call this function back to check again after a specified period of time

            setTimeout(this.awaitResponseActionCheck, 250);
            return;
        } else { // This means that either a decision was made or the timer run out
            if (this.gameState != GameState.Payout) {
                clearTimeout(this.timeoutInstance); //Clears the timer so if it has not finished it will not finish and run its function that perfroms and auto decide
                console.log("Decision MADE By player ", this.currentPlayer.sessionID, "   ", this.currentPlayer.action); // for testing/logging
                this.roomHandler.broadcast("Decision MADE By player " + this.currentPlayer.sessionID + "   " + this.currentPlayer.action); // for testing/logging
                this.currentPlayer.requireDecision = false; // Player made a decision so we no longer need one from this player

                this.executeCurrentPlayerAction(); // Perform the action that either the player chose or the auto-deciedr chose



            }
        }
    }

    // updatePlayer() {
    //     console.log(this.players[this.currentPlayer.sessionID].chips)
    //     this.players[this.currentPlayer.sessionID].chips = this.currentPlayer.chips;
    // }// Just for testing

    autoDecide() {
        //Fix to if playerpot is == to required player pot unless all in 
        console.log("## Peforming Auto Decide ##")
        console.log("Player Pot", this.currentPlayer.playerBet)
        console.log("Server Player Pot", this.roundPlayerBet)
        if (this.currentPlayer.playerBet >= this.roundPlayerBet) {
            return PokerAction.Check;
        }
        else {
            return PokerAction.Fold;
        }

    }

    runBlinds() {
        this.takeBlinds(this.players[this.GamePlayers[this.loopTable(this.dealer, 6)]], this.bigBlind);
        this.takeBlinds(this.players[this.GamePlayers[this.loopTable(this.dealer, 1)]], this.smallBlind);
    }
    takeBlinds(player: Player, blindAmaount: number) {
        if (this.checkBalance(blindAmaount)) { // Check they have enough money
            this.pot += player.takeChips(blindAmaount, true); // Take the chips from the players and add it to the pot
            console.log(`Blind successful, ${blindAmaount} has been added to the pot. From ${player.sessionID}`);
        } else {
            player.allIn = true;
            player.maxPayout = this.potHistory[this.potHistory.length - 1]
            this.pot += player.takeChips(player.chips, true);

        }
    }


    loopTable(startPosition: number, positions: number, ignoreGamePlayerCheck?: boolean) { // Go through each player from a starting point and find the next
        //avaialbe player 
        let seatnum: number;
        let result: number = 0;
        console.log(this.seatsIndex[0])

        for (let i: number = 0; i < 5; i++) { // Loops only the maxium amount of time, as otherwise if for some reason,
            // There is no next player this does not enter an infinite loop 
            seatnum = startPosition + positions + i;
            result = ((seatnum % 6) + 6) % 6
            console.log("Result#; ", result)
            console.log("player Exits? ", this.players[this.seatsIndex[result]] != undefined)
            if ((this.players[this.seatsIndex[result]]) && (this.GamePlayers.includes(this.seatsIndex[result]) || ignoreGamePlayerCheck)) { //Check a player with this index exits
                break;
            }
        }

        return result;

    }



}