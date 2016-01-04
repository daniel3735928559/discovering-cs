var mongo = require('mongojs')
var crypto = require('crypto');

CommentProvider = function(host, port) {
    this.db = mongo.connect("commentdb", ["comments","users","tokens","tickertape"]);
    this.expiration_delay = 1000*60*60*24;
    this.reap();
};

CommentProvider.prototype.reap = function(){
    var now = (new Date()).getTime();
    console.log(now);
    var self = this;
    this.db.tokens.find(function(error, results) {
	if(error) console.log(error);
	else {
	    for(var t in results){
		console.log(results[t].expiry_time);
		if(results[t].expiry_time < now){
		    self.db.tokens.remove(results[t],1);
		}
	    }
	}
    });
    
    this.token_reaper = setTimeout(this.reap, this.expiration_delay);
}
   
CommentProvider.prototype.get_all = function(callback) {
    this.db.comments.find(function(error, results) {
	if(error) callback(error)
	else {
	    if(error) callback(error.toString())
	    else callback(null, results)
	}
    });
};

CommentProvider.prototype.verify_user = function(user_data, callback) {
    var now = (new Date()).getTime();
    var self = this;
    this.db.tokens.findOne({"index":user_data.index,"username":user_data.username}, function(error, result) {
	if(error) callback(1)
	else if(!result) callback(2);
	else if(result['expiry_time'] < now){
	    console.log("removing",JSON.stringify(result));
	    self.db.tokens.remove(result,1);
	    callback(3);
	}
	else if(result['username'] != user_data.username) callback(4);
	else if(result['ip'] != user_data.ip) callback(5);
	else callback(0)
    });
}

CommentProvider.prototype.login = function(username, password, ip, callback) {
    console.log(username,password);
    console.log("hello");
    var self = this;
    self.db.users.findOne({"username":username}, function(error, results){
	if(error){
	    console.log("error ",error);
	    callback(error, null)
	    return;
	}
	if(results != null && 'password' in results && 'salt' in results && results['password'] == crypto.createHash('sha256').update(results.salt + password,'ascii').digest('hex')){
	    console.log("SUCCESS!");
	    var new_token = gen_token(username);
	    var index = gen_index(username);
	    self.db.tokens.save({"username":username,"expiry_time":(new Date()).getTime()+self.expiration_delay,"token":new_token,"index":index,"ip":ip});
	    callback(null, {"success":1,"token":new_token,"index":index});
	}
	else{
	    console.log("FAIL!");
	    callback(null, {"success":0});
	}
    });
};

CommentProvider.prototype.logout = function(user_data, callback) {
    var self = this;
    self.verify_user(user_data, function(authorised) {
    	if(authorised != 0) callback("Unauthorised: " + authorised.toString())
    	else {
	    self.db.tokens.remove({"index":user_data.index,"username":user_data.username},1);
	    callback(null, {"success":1});
	}
    });
};

var gen_index = function(username) {
    return username+(new Buffer(crypto.randomBytes(10)).toString('base64'));
}

var gen_token = function(username) {
    return new Buffer(crypto.randomBytes(64)).toString('base64');
}

CommentProvider.prototype.add_comment = function(user_data, par_id, text, callback) {
    var self = this;
    self.verify_user(user_data, function(authorised) {
    	if(authorised != 0) callback("Unauthorised: " + authorised.toString())
    	else {
	    var comment_obj = {"timestamp":(new Date()).getTime(), "par_id":par_id,"author":user_data.username,"text":text};
	    self.db.tickertape.save(comment_obj);
	    self.db.comments.save(comment_obj);
    	    callback(null, comment_obj);
    	}
    });
};

CommentProvider.prototype.del_comment = function(user_data, cid, callback) {
    console.log(user_data.token, cid);
    var query_obj = {"_id":this.db.ObjectId(cid)};
    console.log(JSON.stringify(query_obj));
    var self = this;
    self.verify_user(user_data, function(authorised) {
    	if(authorised != 0) callback("Unauthorised: " + authorised.toString())
    	else {
	    var un = user_data.username;
	    console.log("un",un);
	    self.db.comments.findOne(query_obj, function(error, result){
		if(result) console.log(result['author'], JSON.stringify(query_obj));
		if(!result) callback(error);
		else if(result['author'] != un) callback("Not your comment");
		else{
		    self.db.comments.remove(query_obj, 1);
		    callback(null, query_obj);
		}
	    });
    	}
    });
};

// CommentProvider.prototype.findById = function(id, callback) {
//     this.getCollection(function(error, collection) {
// 	if( error ) callback(error)
// 	else {
//             collection.findOne({_id: collection.db.bson_serializer.ObjectID.createFromHexString(id)}, function(error, result) {
// 		if( error ) callback(error)
// 		else callback(null, result)
//             });
// 	}
//     });
// };

// CommentProvider.prototype.save = function(comments, callback) {
//     this.getCollection(function(error, collection) {
// 	if( error ) callback(error)
// 	else {
//             if( typeof(comments.length)=="undefined")
// 		comments = [comments];
	    
//             for(var i = 0; i < comments.length; i++) {
// 		comment = comments[i];
// 		comment.timestamp = new Date();
//             }
	    
//             collection.insert(comment, function() {
// 		callback(null, articles);
//             });
// 	}
//     });
// };

exports.CommentProvider = CommentProvider;
