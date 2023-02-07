const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const Controller = require('./models/controller');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static('public'));

// Print to the console information about each request made
app.use((req, res, next) => {
  console.log("method: " + req.method + "  |  path: " + req.path + "  |  IP - " + req.ip);
  next();
});


/////////////////////////////////////////
/* ROUTES - GET & POST requests */
////////////////////////////////////////

// GET: Display the index page for
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


// GET: Show the contents of the User model
app.get('/api/users', Controller.getUsers) 


// POST: Store user into User model
app.post('/api/users', Controller.createUser)


// POST: Store new exercise in the Exercise model 
app.post('/api/users/:_id/exercises', Controller.addExercise)


// PATH /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', Controller.userLog)


// Display all of the exercises in the Mongo DB model titled Exercise
app.get('/api/exercises', Controller.getExercise)


// Listen on the proper port to connect to the server 
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
})
