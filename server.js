const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
  });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/exercisetracker', {
    useNewUrlParser: true
})
console.log('Database Connected');


const userSchema = mongoose.Schema({
    username: { type: String, required: true },
    exercises: [
        {
            description: { type: String},
            duration: { type: Number},
            date: { type: String }
        }
    ]
});
const User = mongoose.model('User', userSchema);

const defaultDate = () => new Date().toISOString().slice(0, 10);

let InputError = {"error": "Your input is not correct"}

function create_new_user(req, res, next){
    let username = req.body.username
    if(username){
      //creating user document
      const newUser = new User({
        username: username
      })
      //saving the user document
      newUser.save((err,data)=>{
        if(err) console.log(err);
        if(data){
          res.json({'username':data.username, '_id':data._id})
        }
      })
    }else{
      res.json(InputError)
    }
  
  }

function get_users (req, res, next) {
    User.find({}, (err, data) =>{
        if(err) console.log(err);
        if(data){
          res.json(data)
        }
    })
}
function add_exercise (req, res, next) {
    const userId = req.params._id || req.body._id; // userId come from URL or body
    const exObj = {
        description: req.body.description || "default description",
        duration: +req.body.duration || 1,
        date: req.body.date || defaultDate()
    };
    User.findByIdAndUpdate({_id: userId},
    { $push: { exercises: exObj } },
    { new: true },
    function(err, updatedUser) {
        if (err) {
            return res.json({error: "Error updating user"})
        }
        let returnObj = {
            username: updatedUser.username,
            description: exObj.description,
            duration: exObj.duration,
            date: exObj.date,
            _id: updatedUser.id
        };
        res.json(returnObj);
    }
);


}

 /* Retrieve a User's Log */
 function get_userlog (req, res, next) {
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit
  
    let id = req.params._id
    
    //if from exists then change it's format
    if(from){
      from = new Date(from)
    }
    if(to){
      to = new Date(to)
    }
    //if user exists
    User.findById({_id: id}, (err, user)=>{
      if(err) console.log(err)
      if(!user) res.json({'error': "this userId doesn't exists."})
      else{
        //find user Exercises
        
        User.find({ownerId: id, date: {"$gte": from || new Date('1450-1-1'), "$lt": to || new Date('2300-1-1')}}, (err, log)=>{
          if(err) console.log(err)
          if(log){
            let formatedLog = log.map((v) => {
                let dateString;
                if (v.date) {
                  dateString = v.date.toDateString();
                }
                return {
                  description: v.description,
                  duration: v.duration,
                  date: dateString
                };
              });
            res.json({"_id": user._id, "username":user.username, "count": log.length, "log":formatedLog})
          }
        }).limit(limit || 10)
      }
    })
}

function view_userlog (req, res, next) {
  console.log(req.body)
  User.findById(req.body._id , (error, result) => {
    if(!error){
      let responseObj = result
      
      if(req.body.from || req.body.to){
        
        let fromDate = new Date(0)
        let toDate = new Date()
        
        if(req.body.from){
          fromDate = new Date(req.body.from)
        }
        
        if(req.body.to){
          toDate = new Date(req.body.to)
        }
        
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()
        
        responseObj.log = responseObj.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()
          
          return sessionDate >= fromDate && sessionDate <= toDate
          
        })
      }
      
      if(req.body.limit){
        responseObj.log = responseObj.log.slice(0, req.body.limit)
      }
      responseObj = responseObj.toJSON()
      responseObj['count'] = result.log.length
      res.json(responseObj)
    }
  }) 
}

app.post("/api/users", create_new_user);

app.get("/api/users", get_users);

app.post("/api/users/:_id/exercises", add_exercise);

app.get("/api/users/:_id/logs", get_userlog);

// app.get("/api/users/:_id/logs", view_userlog);

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })