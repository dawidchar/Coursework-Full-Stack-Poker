import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
var dbClient = require("./../databaseHandler")

export class MenuRoom extends Room {
  validUsers = new Map<String, String>()
  onAuth(client: Client, options: any): Promise<any> {
    return new Promise((resolve, reject) => { //promsise to accept or reject authentication
      this.validateToken(options.accessToken, (err: string, userData: any) => { // Check Token is valid
        if (!err) {//Check if there was an error/invalid token
          this.validUsers.set(client.sessionId, userData.username) // Assign connection ID to the username of player
          resolve(userData); // Accept Token and User
        } else {
          reject(err); // Invalid Token or error => Deny User
        }
      });
    });
  }

  async validateToken(data: any, cb: any) {
    var tokenResult: any = await dbClient.validateToken(data) // Check Token is valid

    if (!tokenResult.err) { // If no Error or invalid
      console.log("Token Working")
      cb(false, { username: tokenResult.username }) // Valid token, return to caller
    } else {
      cb(true, tokenResult.reason) // Invalid Token or error, retunr to caller
    }
  }

  async autosendScoreboard() {
    setTimeout(()=>{this.autosendScoreboard()},20000)
    dbClient.getScoreboard((data: any) => {
      this.broadcast({ scoreboardUpdate: data })
    })

  }

  onCreate(options: any) {
    this.autosendScoreboard();
  }

  onJoin(client: Client, options: any) {
    console.log("Player Joined")
    dbClient.getUserData(this.validUsers.get(client.sessionId), (userdata?: any) => {
      if (userdata != undefined) {
        this.send(client, { userdata: userdata })
      }
    })
    dbClient.getScoreboard((data: any) => {
      this.broadcast({ scoreboardUpdate: data })
    })
    
  }


  onMessage(client: Client, message: any) {

  }

  onLeave(client: Client, consented: boolean) {


  }

  onDispose() {
  }

}
