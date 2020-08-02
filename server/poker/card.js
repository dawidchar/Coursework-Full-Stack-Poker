import { Schema, type } from "@colyseus/schema";
/**
 * @this {Card}
 */
export class Card extends Schema{
    /**
     * @type {string}
     */
    @type("string") suit

    /** @type {string} */
    @type("string") rank

      /** @type {number} */
    @type("number") value

    /**
     * @param {string} suit
     * @param {string} rank
     */

    constructor(suit, rank){
        super();
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue(rank)
      //  console.log(this.suit + this.rank);
    }
    /**
    * @param {string} rank
    */
     getValue = function (rank) {
        switch (rank) {
            case '2':
                return 2;

            case '3':
                return 3;

            case '4':
                return 4;

            case '5':
                return 5;

            case '6':
                return 6;

            case '7':
                return 7;

            case '8':
                return 8;

            case '9':
                return 9;

            case '10':
                return 10;

            case 'J':
                return 11;

            case 'Q':
                return 12;

            case 'K':
                return 13;

            case 'A':
                return 14;

            default:
                return 0;

        }
    }
}

