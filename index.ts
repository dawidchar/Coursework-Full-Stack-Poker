import http from "http"; //http commands
import express from "express"; //webserver
import cors from "cors"; // express (webserver) dependeancies
import { Server } from "colyseus"; //Game Server (Connection handler using SocektIO)
import { monitor } from "@colyseus/monitor";//Gamer Server Monitor, for viewing current stats on the game
import { PokerRoom } from "./server/rooms/PokerRoom"; // Poker Room is where all the logic is, the Game server creates this room
import { MenuRoom } from "./server/rooms/Main Menu";
import { LogonRoom } from "./server/rooms/Logon";


const port = Number(process.env.PORT || 80); //This will be the port which to connect to the web and gamer server through
const app = express() // creates an express (web server) object

app.use(cors()); // Use dependency on webserver
app.use(express.json()) // Using JSON


app.get('/',function(req, res) {
  res.sendFile(__dirname + '/public/loginregister.html');
}); // This means that if there are any requests for the root directory to send the public/index.html file
 // This is because the this server is run from the root of the file system, which also includes the folder for the server hence the backend
 // Which we do not want users to have access to
 app.get('/poker',function(req, res) {
  res.sendFile(__dirname + '/public/poker.html');
});

app.get('/main',function(req, res) {
  res.sendFile(__dirname + '/public/mainmenu.html');
});

app.use('/public',express.static(__dirname + '/public')); // However if a player requesets the public directory, provide them with their request without a problem

const server = http.createServer(app); // Create a http server using the express web server
const gameServer = new Server({
  server,
}); // Create a Game server using colyseus

gameServer.define('PokerRoom', PokerRoom, {maxClients:6}); // Players looking to play poker will ask to connect to this room, this identifies how to access it
gameServer.define('MainMenu', MenuRoom);
gameServer.define('Logon', LogonRoom);


app.use("/colyseus", monitor(gameServer)); // Add a monitor for this room so that it can be seen from the Colyseus monitor

gameServer.listen(port); // Have the game server Listen to the port specificed above 

console.log(`Listening on ws://localhost:${ port }`)
console.log("Test");
