import { Schema, type} from "@colyseus/schema";
import { Card } from "./card.js";
import { Room, Client } from "colyseus";
import { PokerAction } from "./publicEnums";
import {Hand } from "./Hand"
var dbClient = require("./../databaseHandler")
let _counter = new WeakMap();


export class Player extends Schema {
    cardLocked:boolean = false; // Once the cards are written to the player, they cannot be changed, this variable keeps track of that
    internalClient!:Client// The internal Sockets client for the TCP connection with the server
    cards:Card[] = [] // Array that stores the cards 

    @type("number")
    inGameIndex=0;
    
    @type("string")
    username!: string;
    
    @type("string")
    sessionID!:string;
  
    @type("number")
    chips:number = 500;

    @type("number")
    playerBet:number = 0;

    @type("string")
    action:PokerAction = PokerAction.Null;

    @type("boolean")
    requireDecision = true;

    @type("boolean")
    folded:boolean = true;

    @type("boolean")
    hasCards!:boolean

    @type("boolean")
    allIn!:boolean

    @type("string")
    color:string = "white"

    @type(Hand) playerHand!:Hand;

    maxPayout:number = Infinity;


    getPriv():any{
return _counter.get(this);
    }

    createHandRanking(tCards:Card[]){
        this.playerHand = new Hand;
        this.playerHand.setCards(this.cards,tCards);
    }

    setCard(card1:any|Card, card2:any|Card){ // Sets the cards of the player 
        console.log("New Cards");
        //console.log(card1);
         this.cards[0]=card1;
         this.cards[1]=card2;
         this.cardLocked = true;
       //  console.log(this.cards);
    }

    takeChips(payable:number,addToPlayerPot?:boolean):number{ // Function to take Chips from the player 
        this.chips -= payable;
        if (addToPlayerPot){this.playerBet+=payable};
        dbClient.changeUserChips(this.username,-payable)
        return payable;
    }

    giveChips(amount:number):number{
        this.chips+=amount;
        dbClient.changeUserChips(this.username,amount)
        return amount;
    }


}


