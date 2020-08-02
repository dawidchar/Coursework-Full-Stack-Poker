let Rank = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
let Suit = ["C", "D", "H", "S"]
import { Card } from "./card.js";

export class Deck {


    constructor() {
        /** 
         * @type {Card[]} 
        */
        this._Deck = [];
        this.initDeck();
        // @ts-ignore
        this._Deck = this.shuffleDeck(this._Deck);
      //  this.logDeck();
    }



    initDeck() {
        for (var i = 0; i < Rank.length; i++) {
            for (var j = 0; j < Suit.length; j++) {
                // @ts-ignore
                this._Deck.push(new Card(Suit[j], Rank[i]));

            }
        }
    }
    /**
    * @param {string | any[]} array
    */
    shuffleDeck(array){
        var x = array.length, t, i;

        // While there remain elements to shuffle…
        while (x) {

            // Pick a remaining element…
            i = Math.floor(Math.random() * x--);

            // And swap it with the current element.
            t = array[x];
          
            // @ts-ignore
            array[x] = array[i];
       
            // @ts-ignore
            array[i] = t;
        }

        return array;
    }

    logDeck() {
      
        for (var i = 0; i < this._Deck.length; i++) {
           
            console.log(this._Deck[i].suit + this._Deck[i].rank);
        }
    }
    /**
    * @return {Card}
    */
    getCard(){
        var outCard;
        outCard = this._Deck.pop();
      // @ts-ignore
      return outCard;
    }

}