import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
var dbClient = require("./../databaseHandler")


export class LogonRoom extends Room {




  onCreate(options: any) {

  }

  onJoin(client: Client, options: any) {
    console.log("Player Joined For Login")
    this.validateToken(options.accessToken,(err: any, data?: any) => {
      if(!err){
        this.send(client,{tokenSuccess:data});
      }else{
        this.send(client,{tokenFail:data})
      }
    })
  }


  onMessage(client: Client, message: any) {
    if (message.login) {
      console.log("Message Login")
      this.userLogin(message.login, (err: any, data?: any) => {
        if(!err){
          this.send(client,{loginSuccess:data});
        }else{
          this.send(client,{loginFail:data})
        }
      })
    } else if (message.register) {
      console.log("Message Register")
      this.userRegister(message.register, (err: any, data?: any) => {
        if(!err){
          this.send(client,{registerSuccess:data});
        }else{
          this.send(client,{registerFail:data})
        }
      })
    }
  }

  async userLogin(data: any, cb: any) {
    var loginResult: any = await dbClient.login(data.username, data.password)

    if (!loginResult.err) {
      console.log("Login Working")
      cb(false, { authToken: loginResult.authToken })
    } else {
      cb(true,loginResult.reason)
    }
  }

  async userRegister(data: any, cb: any) {
    var registerResult: any = await dbClient.register(data.name,data.username, data.password,750)

    if (!registerResult.err) {
      console.log("Register Working")
      cb(false, { authToken: registerResult.authToken })
    } else {
      cb(true, registerResult.reason)
    }
  }

  async validateToken(data:any, cb:any){
    var tokenResult: any = await dbClient.validateToken(data)

    if (!tokenResult.err) {
      console.log("Token Working")
      cb(false, { username: tokenResult.username })
    } else {
      cb(true, tokenResult.reason)
    }
  }

  onLeave(client: Client, consented: boolean) {


  }

  onDispose() {
  }

}
