var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var filesystem = require('fs')
var SubsProvider = require('./subs_provider').SubsProvider;
var subs_provider = new SubsProvider();

var args = process.argv.slice(2);

var accessLogStream = filesystem.createWriteStream(__dirname + '/logs/access.log', {flags: 'a'})

var rating_file = __dirname + '/ratings/ratings.log';

var app = express();


//app.use(BodyParser.json());
morgan.token('remote-addr',function(req,res){ return get_ip(req); });
morgan.token('remote-user',function(req,res){ return req.headers['proxy-user']; });
app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static(__dirname + '/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));


app.get('/', function(req, res){
    console.log(get_ip(req));
    res.redirect('/text/box.xml');
});


app.get('/text/', function(req, res){
    res.redirect('/text/box.xml');
});

app.post('/homework/rate', function(req, res){
    console.log("RATE",req.body);
    var date = new Date();
    var s = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + ":" + date.getHours() + ":" + date.getMinutes() + "; ";
    if(req.body.r) s += req.body.r + ";";
    if(req.body.comments) s += " " + req.body.comments.length + "," + req.body.comments;
    s += "\n";
    filesystem.appendFile(rating_file, s, function(err) { console.log("RATE ERR", err); });
    res.redirect('/homework/thankyou.html');
});

app.post('/homework/get', function(req, res){
    console.log("AAAA",req.body);
    subs_provider.get(get_user_data(req), get_homework_data(req), function(error, result){
	res.send({"error":error,"data":result});
    });
});

app.get('/homework', function(req, res){
    console.log(JSON.stringify(req.headers));
    res.redirect('/homework/homework.html');
});

app.post('/homework/saveall', function(req, res){
    console.log("AAAAXXX",get_user_data(req),req.body);
    var tried = 0;
    var saved = 0;
    var total = req.body.total;
    console.log(req.body);
    for(var idx in req.body){
	if(idx == 'total') continue;
	console.log(req.body[idx]);
	subs_provider.save(get_user_data(req), req.body[idx], function(error, result){
	    tried++;
	    if(!error) saved++
	    console.log(saved,tried,total);
	    if(tried == total){
		console.log("DONE");
		if(saved < tried) error = "OHNO";
		console.log(error,result);
		res.send({"error":error,"success":result});
	    }
	});
    }
});

app.post('/homework/save', function(req, res){
    console.log("AAAA",req.body);
    subs_provider.save(get_user_data(req), get_homework_data(req), function(error, result){
	res.send({"error":error,"success":result});
    });
});

app.post('/homework/submit', function(req, res){
    console.log("AAAA",req.body);
    subs_provider.del_comment(get_user_data(req), get_homework_data(req), function(error, result){
	res.send(error + ", " + result);
    });
});

var get_ip = function(req){
    return req.header('x-forwarded-for') || req.connection.remoteAddress;
}

var get_homework_data = function(req){
    return {'hwid':req.body.hwid,
	    'pid':req.body.pid,
	    'text':req.body.text};
}

var get_user_data = function(req){
    return {'ip':get_ip(req),
	    'username':req.headers['proxy-user']};
	    //'username':'test_user'};
}

server = http.createServer(app).listen(61453);

if(args.length > 0){
    server.on('connection', function (sock) {
	if(sock.remoteAddress != args[0]){
	console.log("Denied: " + sock.remoteAddress);
	    sock.end("Access denied");
	}
    });
    console.log("Server running on:" + args[0]);
}
else{
    console.log("Server running!");
}
