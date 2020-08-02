import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./../poker/Player";
import { Table } from "./../poker/Table";
import pokerConfig from "./../poker/pokerConfig.json";
import { PokerAction, RoundAction, RoundMode, GameState } from "./../poker/publicEnums";
var dbClient = require("./../databaseHandler")

export class PokerState extends Schema { //The following Schema provides syncronised updates/states to all clients, by assingined a new table, it now can track it as we used the decorators for that
  @type(Table)
  table: Table = new Table
}

// This is the PokerRoom that is requested when a player tries to join
//We also pass in to the room the schema which we are using and we can then address this state with this.state
export class PokerRoom extends Room<PokerState> {
  colors = ["gray", "pink", "purple", "navy", "red", "green"] // Colors each player based on their index and the colour of that index 
  validUsers = new Map<String, String>()
  onCreate(options: any) {
    this.setState(new PokerState());// We set the current state and hecne being the syncronisasation of the schema and hence the Table 
    this.state.table.setHandler(this) // To give access to the the room functions to the state (Such as sending client messages) I created a varible and function where I
    //Pass the refrence to his instance to the state, so the children on this class have full access to this class (The Parent class )

  }

  onAuth(client: Client, options: any): Promise<any> {
    return new Promise((resolve, reject) => { //promsise to accept or reject authentication
      this.validateToken(client, options.accessToken, (err: string, userData: any) => { // Check Token is valid
        if (!err) {//Check if there was an error/invalid token
          this.validUsers.set(client.sessionId, userData.username) // Assign connection ID to the username of player
          resolve(userData); // Accept Token and User
        } else {
          reject(err); // Invalid Token or error => Deny User
        }
      });
    });
  }

  async validateToken(client: Client, data: any, cb: any) {
    var tokenResult: any = await dbClient.validateToken(data) // Check Token is valid
    if (!tokenResult.err) { // If no Error or invalid
      console.log("Token Working")
      cb(false, { username: tokenResult.username }) // Valid token, return to caller
    } else {
      cb(true, tokenResult.reason) // Invalid Token or error, retunr to caller
    }
  }

  onJoin(client: Client, options: any) { //Do this when a player joins
    dbClient.getUserData(this.validUsers.get(client.sessionId), (userdata?: any) => {
       if (userdata != undefined) {
        console.log(`${client.sessionId} joined.`);
        const player = new Player(); // Create a new instance of a player
        player.sessionID = client.sessionId; //A Session ID is automatically assinged when a player joins and is unqiue, we save this in a variable
        player.internalClient = client; // We also save the instance of the webClient to access this client later, this lets us get the client of a player to use that SocketIO client to send messages to this client
        this.assignIndex(player, client) // We workout a free spot/seat and assign that seat to this player
        player.username = userdata.username;
        player.color = userdata.color;
        player.chips = userdata.chips
        this.state.table.players[client.sessionId] = player; // We finally add this player to a array of players
        this.state.table.playerCount++; // We increase the count of the players
        this.printoutSeats() // we print out the full seat allocation, mainly for testing
        this.send(client, { initRoom: this.state.table }) // We send the current state of the room to the player, so it can update its UI and keep it syncronised
        //this.send(client,{"cards":[{suit:"H",rank:"A"},{suit:"S",rank:"10"}]})

        if (this.state.table.playerCount > 1 && this.state.table.gameState == GameState.Lobby) { // This will be on a timer once at least 2 players join but currently starts the game if a game hasen't already been started 
          // and there are atleast 3 player 
          console.log("Starting")
          setTimeout(() => { this.state.table.playGame() }, 250); // After 250 milliseconds start the game/round
        }
        console.log(`\x1b[36mPlayer Created ${player.username} \x1b[0m`); // Using color formating we console log
      }else{
        console.log("Failed To find User Data","SessionID:",client.sessionId,"Username:",this.validUsers.get(client.sessionId))
      }
    }

    )
 
  }

  assignIndex(player: any, client: any) { // This is the function that assings the index to the player specifed
    let avaialbeSeatIndex = this.getAvailabeSeatIndex() // Finds a Avaliable seat
    this.state.table.seatsIndex[avaialbeSeatIndex] = client.sessionId; // Updates the variavle that tracks all the seats and the players assinged to that seat
    player.inGameIndex = avaialbeSeatIndex; // Tell the player the seat that has been assinged to them
  
  }

  getAvailabeSeatIndex(): number { // Finds any avaialve seat by looping through each seat and checking if it is avaialbe, as sometimes seats 0 and 2 are takes but 1 is not, so it can not be based on number of players
    console.log(this.state.table.seatsIndex)
    for (let i: number = 0; i < 6; i++) {
      if (this.state.table.seatsIndex[i] == undefined) {
        console.log(i)

        return i
      }
    }
    return -1;
  }

  printoutSeats() { //Goes through each seat and prints out its information
    for (let i: number = 0; i < 6; i++) {
      if ((this.state.table.seatsIndex[i] != undefined) && (this.state.table.seatsIndex[i] != "")) {
        let player = this.state.table.players[this.state.table.seatsIndex[i]]
        console.log(player.color + " " + player.inGameIndex)
      }
    }
  }

  onMessage(client: Client, message: any) { //Print out the message the server reices 
    console.log(message, "--From", client.sessionId);
    if (message.pokerAction) { // If the message is for poker action carry on otherwise it is ignored 
      console.log(this.state.table.currentPlayer.sessionID);
      console.log(client.sessionId);
      console.log(client.sessionId == this.state.table.currentPlayer.sessionID);
    }
    //The following if statement ensures the poker action for the current player is actiually sent my the current player 
    //by comparing the sessionID of the current player and the SessionID of the client that sent the message
    //as well as if the current player is not empty
    if (message.pokerAction != undefined && this.state.table.currentPlayer.sessionID != undefined && client.sessionId.toString() == this.state.table.currentPlayer.sessionID.toString()) {
      console.log("INSIDE")
      switch (message.pokerAction) {
        //Based on the poklerAction sent, set the current player action to the correct action, this change will automatically be noticed and will preform the correct action.
        case PokerAction.Call:
          this.state.table.currentPlayer.action = PokerAction.Call;
          break;
        case PokerAction.Check:
          this.state.table.currentPlayer.action = PokerAction.Check;
          break;
        case PokerAction.Raise:
          this.state.table.raiseAmount = parseInt(message.raiseAmount);
          this.state.table.currentPlayer.action = PokerAction.Raise;
          break;
        case PokerAction.Fold:
          this.state.table.currentPlayer.action = PokerAction.Fold;
          break;
        default:
          //If there was an error, just autodecide for the player
          this.state.table.currentPlayer.action = this.state.table.autoDecide();
      }

    }
  }

  onLeave(client: Client, consented: boolean) {
    //Once a Player leaves, ensuere it is delted from the players list, its seat is freed and player count is decreased 
    this.state.table.seatsIndex.splice(this.state.table.players[client.sessionId].inGameIndex, 1)
    this.state.table.GamePlayers.splice(this.state.table.GamePlayers.indexOf(client.sessionId), 1)
    delete this.state.table.players[client.sessionId];
    this.state.table.playerCount--;

  }

  onDispose() {
  }

}
