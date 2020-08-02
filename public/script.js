// @ts-nocheck
// In the html we refer to a card HTML element which does not actually exist, so we idenfity how it should be constructed, It gets its variables (card.s & card.r) {the suit and rank}
// From the for loop that is run before hand which actually calls one of the variables found below. 
Vue.component('card', {
  template: `<div class="card" :class="['figures-' + card.s, 'values-' + card.r]">
		<h1>{{card.r}}</h1>
		<div class="figures" :class="card.s"></div>
  </div>`,
  props: ['card']
});

// Create a new Vue Element
let app = new Vue({
  // Affect the following elements with class of vue-container
  el: '.vue-container',
  //Data avaiable to the Vue Element
  data: {
    //Current Player
    player_playing: 0,
    //All Current Players more are added dynamically
    players: [
      { username: 'YOU', bank: 0, onTable: 0, hasCards: true},
      
    ],
    //Your Cards send later to you from the server
    playerCards:[

    ],
    //The cards that are visible on the table, sent from the server
    tableCards:[
    ],
  },

  //Varialbles/Data That can be computed, used in for loops
  computed: {
    //returns the cards on the table back to the Frontend to Render
    table_cards() {
      return convertCards(this.tableCards);
    },
    //returns your cards back to the FrontEnd
    your_cards() {
      console.log("Running Your Cards")
      if(this.players[0].hasCards){
        return convertCards(this.playerCards);
      }else{
        return false;
      }
    },
  }
});

//This changes the format of the cards from a simple array to a JSON file format so that Vue can understand it
function convertCards(inputValue){
  let output =[];
  for (let i = 0; i<inputValue.length;i++) {
    output.push({s:inputValue[i].s,r:inputValue[i].r})
  };
  return output;
};

