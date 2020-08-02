const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
// Connection URL
const url = 'mongodb://localhost:27017';
var dbclient: any


// Create a new MongoClient
connectdb();
async function connectdb() {
  dbclient = await MongoClient.connect(url, { useNewUrlParser: true }).then(console.log("Database Connected"))
    .catch((err: any) => { console.log(err); });
}
exports.login = async function (username: string, passwordHash: string) {
  console.log(username)
  if (!dbclient) { console.log("Database Not Connected"); return { err: true, reason: "Database Error Code 1" } }
  try {
    //Prepare the location of the query and the query itself
    let usercoll = dbclient.db("Poker").collection("Users")//get the collection of the users
    let query = { Username: new RegExp("^" + username, "i"), Password: passwordHash } // Get username regarless of case
    console.log(query)
    //execute query
    let res = await usercoll.findOne(query); //Execute Query
    if (res != null) {
      var authToken_Full = await createAuthToken(username);
      return { err: false, authToken: authToken_Full }
    } else {
      return { err: true, reason: "Inncorrect Password or Username" }
    }
  } catch (error) {
    console.log(error)
    return { err: true, reason: "Database Error Code 2" }
  }


}


exports.register = async function (name: string, username: string, passwordHash: string, startingChips: number) {
  console.log(username)
  if (!dbclient) { console.log("Database Not Connected"); return { err: true, reason: "Database Error Code 3" } }
  try {
    //Prepare the location of the query and the query itself
    let usercoll = dbclient.db("Poker").collection("Users")//get the collection of the users
    let query = { Username: new RegExp("^" + username, "i") } // Get username regarless of case
    console.log(query)
    let res = await usercoll.findOne(query); //Execute Query
    if (res == null) { // Check if username exists
      if (name.length < 3) return { err: true, reason: "Name too short" };
      if (username.length < 5) return { err: true, reason: "Username too short" };
      if (passwordHash.length < 5) return { err: true, reason: "Password too short" };
      usercoll.insert({Name:name, Username: username, Password: passwordHash, Chips: startingChips, Color: "blue" }) //insert Data to DB
      var authToken_Full = await createAuthToken(username); // get authToken
      return { err: false, authToken: authToken_Full }
    } else {
      return { err: true, reason: "Username Taken" }
    }
  } catch (error) {
    console.log(error)
    return { err: true, reason: "Database Error Code 4" }
  }
}

function makeid(length: any) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function createAuthToken(username: string) {
  let tokencoll = dbclient.db("Poker").collection("AuthTokens") // Target Collection
  var authToken_ID = makeid(32); // generate randome ID
  var authToken_Expiry = new Date()
  authToken_Expiry.setDate(authToken_Expiry.getDate() + 2) // add 2 days to current Date
  await tokencoll.insert({ Username: username, TokenID: authToken_ID, TokenExpiry: authToken_Expiry }) // Save to db authToken
  return { id: authToken_ID, expiry: authToken_Expiry }
}



exports.validateToken = async function (token: string) {
  if (!dbclient) { console.log("Database Not Connected"); return { err: true, reason: "Database Error Code 5" } }
  try {
    let tokencoll = dbclient.db("Poker").collection("AuthTokens")//get the collection of the authTokens
    let query = { TokenID: token, TokenExpiry: { $gt: new Date() } } // Get token provided with its expiry is greater than the date+time right now
    console.log(query)
    let res = await tokencoll.findOne(query); //Execute Query
    console.log(res)
    if (res != null) { // Check if Token exists
      return { err: false, username: res.Username }
    } else {
      return { err: true, reason: "Invalid Token" }
    }
  } catch (error) {
    console.log(error)
    return { err: true, reason: "Database Error Code 6" }
  }

}

exports.getUserData = async function (username: string, cb: any) {

  console.log(username)
  if (!dbclient) { console.log("Database Not Connected"); return; }
  try {
    //Prepare the location of the query and the query itself
    let usercoll = dbclient.db("Poker").collection("Users")//get the collection of the users
    let query = { Username: new RegExp("^" + username, "i") } // Get username regarless of case
    console.log(query)
    //execute query
    let res = await usercoll.findOne(query); //Execute Query
    if (res != null) {

      cb ({username:username,chips:res.Chips,color:res.Color}) // Run callback with userData

    } else {
      return;
    }
  } catch (error) {
    console.log(error)
    return;
  }



}

exports.changeUserChips = async function(username:string,chipChange:number){
  console.log(username)
  if (!dbclient) { console.log("Database Not Connected"); return; }
  try {
    //Prepare the location of the query and the query itself
    let usercoll = dbclient.db("Poker").collection("Users")//get the collection of the users
    let query = { Username: new RegExp("^" + username, "i") } // Get username regarless of case
    console.log(query)
    let res = await usercoll.findOne(query)
    await usercoll.findOneAndUpdate(query,{$inc:{Chips:chipChange}}); //Find that users chips and update them to the new value.
   
  } catch (error) {
    console.log(error)
    return;
  }
}

exports.getScoreboard = async function(cb:any){
  if (!dbclient) { console.log("Database Not Connected"); return; }
  try {
    //Prepare the location of the query and the query itself
    let usercoll = dbclient.db("Poker").collection("Users")//get the collection of the users
    let res = await usercoll.find().project({Username:1, Chips:1, _id:0}).sort({Chips:-1}).limit(5).toArray()
    //Get all the users, only return the username and chips so we dont expose any other data,
    // sort all the results in decending order by the number or chips
    //then only store the top 5 and output that finally to an array
    cb(res);
  } catch (error) {
    console.log(error)
    return;
  }
}

