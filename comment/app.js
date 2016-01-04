/*

Each p element will include a comment div which will use the angular
template comment.html.  This is bound by socket.io connection to this
app to the data of existing comments (with some kind of intelligent
updating to sync server and client models)

*/

var express = require('express');
var https = require('https');
//var BodyParser = require('body-parser');
var CommentProvider = require('./comment_provider').CommentProvider;
var comment_provider = new CommentProvider();

var fs = require('fs');
var key = fs.readFileSync('./key.pem');
var cert = fs.readFileSync('./cert.pem')
var https_options = {
    key: key,
    cert: cert
};

var app = express();

//app.use(BodyParser.json());
app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res){
    res.send("Hello");
});

app.post('/addcomment', function(req, res){
    console.log("AAAA",req.body);
    comment_provider.add_comment(get_user_data(req), req.body.par_id, req.body.text, function(error, result){
	res.send(error + ", " + result);
	//res.send(JSON.stringify(results));
    });
});

app.post('/delcomment', function(req, res){
    console.log("AAAA",req.body);
    comment_provider.del_comment(get_user_data(req), req.body.cid, function(error, result){
	res.send(error + ", " + result);
	//res.send(JSON.stringify(results));
    });
});

app.post('/comments', function(req, res){
    comment_provider.get_all(function(error, results){
	if(error) res.send(error);
	else res.send(JSON.stringify(results));
    });
});

app.post('/login', function(req, res){
    console.log(JSON.stringify(req.body));
    comment_provider.login(req.body.username, req.body.password, get_ip(req), function(error, results){
	if(error) res.send(error);
	else res.send(JSON.stringify(results));
    });
});

app.post('/verify', function(req, res){
    console.log(JSON.stringify(req.body));
    comment_provider.verify_user(get_user_data(req), function(authorised){
	if(authorised != 0) res.send(JSON.stringify({"success":0}));
	else res.send(JSON.stringify({"success":1}));
    });
});

app.post('/logout', function(req, res){
    console.log(JSON.stringify(req.body));
    comment_provider.logout(get_user_data(req), function(error, results){
	if(error) res.send(error);
	else res.send(JSON.stringify(results));
    });
});

var get_ip = function(req){
    return req.header('x-forwarded-for') || req.connection.remoteAddress;
}

var get_user_data = function(req){
    return {'ip':get_ip(req),
	    'username':req.body.username,
	    'token':req.body.token,
	    'index':req.body.index}
}

server = https.createServer(https_options, app).listen(3797);
//app.listen(3797);
console.log("Server running at http://127.0.0.1:3797/");
