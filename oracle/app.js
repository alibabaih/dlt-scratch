var express = require('express')
const bodyParser = require('body-parser')
var app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('Hi! This is oracle.')
});

app.get('/weather', function(req, res) {
   res.send({condition: true});
});


app.listen(4000, function() {
     console.log(`listening on port 4000`);
});
