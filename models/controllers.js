const mongoose = require('mongoose');
const moment = require('moment')
require('dotenv').config();

const User = require('./user');
const Exercise = require('./exercise');

// Connect Mongo DB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});


/////////////////////////////////////////
/* ROUTES - GET & POST requests */
////////////////////////////////////////

// PATH /api/users/ Requests
// GET: Show the contents of the User model
const getUsers = function(req, res) {
  User.find({}, function(err, data) {
    if (!err) {
      return res.json(data);
    }
  });
};

// POST: Store user into User model
const createUser = (req, res) => {
  // Get username input into form
  const username = req.body.username;
  console.log("username:", username);

  // Check to see if the username has already been entered
  User.findOne({ username: username }, (error, data) => {
    if (error) {
      res.send("Unknown userID");
      return console.log(error);
    }

    if (!data) { // If username is not stored yet, create and save a User object
      const newUser = new User({
        username: username
      });

      // Save the user
      newUser.save((error, data) => {
        if (error) return console.log(error);
        // Remove the key-value pair associated with the key __v
        const reducedData = {
          "username": data.username,
          "_id": data._id
        };
        res.json(reducedData);
        console.log(reducedData);
      });
    } else { // If username is already stored, send a message to the user
      res.send(`Username ${username} already exists.`);
      console.log(`Username ${username} already exists.`);
    }
  });
};

// POST: Store new exercise in the Exercise model 
const addExercise = (req, res) => {
  // Get data from form
  const userId = req.body._id || req.params._id;
  const inputDescription = req.body.description;
  const inputDuration = req.body.duration;
  const inputDate = req.body.date;

  // Print statement for debugging
  console.log(userId, inputDescription, inputDuration, inputDate);

  // Make sure the user has entered in an id, a description, and a duration
  // Set the date entered to now if the date is not entered
  if (!userId) {
    res.json("Path `userID` is required.");
    return;
  }
  if (!inputDescription) {
    res.json("Path `description` is required.");
    return;
  }
  if (!inputDuration) {
    res.json("Path `duration` is required.");
    return;
  }

  // Check if user ID is in the User model
  User.findById({ "_id": userId }, (error, data) => {
    if (error) {
      res.json("Invalid userID");
      return console.log(error);
    }
    if (!data) {
      res.json("Unknown userID");
      return;
    } else {
      console.log(data);
      const usernameMatch = data.username;

      // Create an Exercise object
      const newExercise = new Exercise({
        username: usernameMatch,
        description: inputDescription,
        duration: inputDuration
      });

      // Set the date of the Exercise object if the date was entered
      if (inputDate) {
        newExercise.date = inputDate;
      }

      // Save the exercise
      newExercise.save((error, data) => {
        if (error) return console.log(error);

        console.log(data);

        // Create JSON object to be sent to the response
        const exerciseObject = {
          "_id": userId,
          "username": data.username,
          "date": data.date.toDateString(),
          "duration": data.duration,
          "description": data.description
        };

        // Send JSON object to the response
        res.json(exerciseObject);

      });
    }
  });
};

// PATH /api/users/:_id/logs?[from][&to][&limit]
const userLog = (req, res) => {

  const id = req.body._id || req.params._id;
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = req.query.limit;

  console.log(id, fromDate, toDate, limit);

  // Validate the query parameters
  if (fromDate) {
    fromDate = new Date(fromDate);
    if (fromDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (toDate) {
    toDate = new Date(toDate);
    if (toDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (limit) {
    limit = new Number(limit);
    if (isNaN(limit)) {
      res.json("Invalid Limit Entered");
      return;
    }
  }

  // Get the user's information
  User.findOne({ "_id": id }, (error, data) => {
    if (error) {
      res.json("Invalid UserID");
      return console.log(error);
    }
    if (!data) {
      res.json("Invalid UserID");
    } else {

      // Initialize the object to be returned
      const usernameFound = data.username;
      var objToReturn = { "_id": id, "username": usernameFound };

      // Initialize filters for the count() and find() methods
      var findFilter = { "username": usernameFound };
      var dateFilter = {};

      // Add to and from keys to the object if available
      // Add date limits to the date filter to be used in the find() method on the Exercise model
      if (fromDate) {
        objToReturn["from"] = fromDate.toDateString();
        dateFilter["$gte"] = fromDate;
        if (toDate) {
          objToReturn["to"] = toDate.toDateString();
          dateFilter["$lt"] = toDate;
        } else {
          dateFilter["$lt"] = Date.now();
        }
      }

      if (toDate) {
        objToReturn["to"] = toDate.toDateString();
        dateFilter["$lt"] = toDate;
        dateFilter["$gte"] = new Date("1960-01-01");
      }

      // Add dateFilter to findFilter if either date is provided
      if (toDate || fromDate) {
        findFilter.date = dateFilter;
      }

      // console.log(findFilter);
      // console.log(dateFilter);

      // Add the count entered or find the count between dates
      Exercise.count(findFilter, (error, data) => {
        if (error) {
          res.json("Invalid Date Entered");
          return console.log(error);
        }
        // Add the count key 
        var count = data;
        if (limit && limit < count) {
          count = limit;
        }
        objToReturn["count"] = count;


        // Find the exercises and add a log key linked to an array of exercises
        Exercise.find(findFilter, (error, data) => {
          if (error) return console.log(error);

          // console.log(data);

          var logArray = [];
          var objectSubset = {};
          var count = 0;

          // Iterate through data array for description, duration, and date keys
          data.forEach(function(val) {
            count += 1;
            if (!limit || count <= limit) {
              objectSubset = {};
              objectSubset.description = val.description;
              objectSubset.duration = val.duration;
              objectSubset.date = val.date.toDateString();
              console.log(objectSubset);
              logArray.push(objectSubset);
            }
          });

          // Add the log array of objects to the object to return
          objToReturn["log"] = logArray;

          // Return the completed JSON object
          res.json(objToReturn);
          console.log(objToReturn);
        });

      });

    }
  });
};

// Display all of the exercises in the Mongo DB model titled Exercise
const getExercise = (req, res) => {
  Exercise.find({}, (error, data) => {
    if (error) return console.log(error);
    res.json(data);
  })
};

module.exports = {
    getUsers,
    createUser,
    addExercise,
    userLog,
    getExercise

}
