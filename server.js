'use strict';

var express = require('express');
var MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;
var mongoose = require('mongoose');
var shortId = require('shortid');
var bodyParser = require('body-parser');
var validUrl = require('valid-url');
require('dotenv').config();
var cors = require('cors');
var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})


app.use('/public', express.static(process.cwd() + '/public'));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//Create Schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: Number
})
const URL = mongoose.model("URL", urlSchema);

let responseObject = {};

//Call a POST request
app.post('/api/shorturl', bodyParser.urlencoded({ extended: false }), (req, res) => {


  let inputURL = req.body['url'];

  //Check if the URL is valid before anything
  let urlRegex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi);

  if (!inputURL.match(urlRegex)) {
    res.json({ error: 'Invalid URL' })
    return
  }



  responseObject["original_url"] = inputURL;

  //Set short url value of input
  var inputShort = 1;

  /*On the URL model, we use findOne with an empty object to sort our 
  short URLs in descending order. We then add 1 to the highest short
  value, and set this as our new short value for the new URL. 
  */


//Find the URL in our model. If it already exists, increase its short_url value. If not, a new instanace is created for that URL. 
  URL
    .findOne({})
    .sort({ short_url: "desc" })
    .exec((error, result) => {
      if (!error && result != undefined) {
        inputShort = result.short_url + 1;
      }
      if (!error) {
        URL.findOneAndUpdate(
          { original_url: inputURL },
          { original_url: inputURL, short_url: inputShort },
          { new: true, upsert: true },
          (error, savedURL) => {
            if (!error) {
              responseObject["short_url"] = savedURL.short_url;
              res.json(responseObject);
            }
          }
        );
      }
    })






})

//If a short_url value is entered, the user is redirected to the allocated website for the short_url value.
app.get('/api/shorturl/:urlValue?', (req, res) => {
  var input = req.params.urlValue;
  URL.findOne({ short_url: input }, (err, savedValue) => {
    if (!err && savedValue != undefined) {
      res.redirect(savedValue.original_url)
    } else {
      res.json({ error: "URL has not been initialized" })
    }
  })
})



app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
})
