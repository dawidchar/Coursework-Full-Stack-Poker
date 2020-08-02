import { Schema, type, ArraySchema} from "@colyseus/schema";
import { Card } from "./card.js";
import {CalculateRank} from "./CalculateRank.js";


export class Hand extends Schema {
    @type([Card]) PlayerCards = new ArraySchema();
    tableCards!:Card[];
    @type("string") formatedPlayerCards!:string
    @type("string") PokerRank:string = "NULL";
    @type("number") PokerRankValue:number = 0;

    setCards(pCards:Card[],tCards:Card[]){
        this.PlayerCards[0] = pCards[0]; // We can directly copy over the array as the schemaArray
        // Is not the same as the typical JS array, so we know there are 2 elements, so we just
        //simply copy it over
        this.PlayerCards[1] = pCards[1];
        this.tableCards = tCards
        CalculateRank(this.PlayerCards.concat(this.tableCards),this) //Join the player cards with the community cards
    }
}


