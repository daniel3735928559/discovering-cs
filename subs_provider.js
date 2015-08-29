//var mongo = require('mongojs')
//var crypto = require('crypto');

var fs = require('fs');

SubsProvider = function(host, port) {
    this.MAX_FILE_SIZE = 33333;
    this.num_homeworks = 11;
    this.homework_sizes = [23,10,10,15,10,9,10,7,10,10,18]
};

SubsProvider.prototype.is_valid_number = function(n){
    return !isNaN(parseFloat(n)) && isFinite(n) && parseInt(Number(n)) == Number(n);
}

SubsProvider.prototype.gen_path = function(user_data, hw_data){
    var username = user_data.username;
    var hwid = hw_data.hwid;
    var pid = hw_data.pid;
    if(!this.is_valid_number(hwid) || !this.is_valid_number(pid)) return "";
    hwid = parseInt(hwid);
    pid = parseInt(pid);
    if(0 <= hwid && hwid < this.num_homeworks && 0 <= pid && pid < this.homework_sizes[hwid]){
	return "sub_data/" + username + "/" + hwid + "." + pid
    }
    return "";
}

SubsProvider.prototype.get = function(user_data, hw_data, callback) {
    var path = this.gen_path(user_data, hw_data);
    if(path == ""){
	console.log("Uh oh");
	callback("Bad params");
	return;
    }
    fs.readFile(path, "ASCII", function(error, data){
	console.log(error, " E ", data);
	if(error){
	    if(error.code == 'ENOENT'){
		fs.closeSync(fs.openSync(path, 'w'));
		callback(null, "");
	    }
	    else callback("An error occurred");
	}
	else {
	    callback(null, data.toString());
	}
    });
};

SubsProvider.prototype.save = function(user_data, hw_data, callback) {
    var path = this.gen_path(user_data, hw_data);
    if(path == ""){
	console.log("Uh oh");
	callback("Bad params");
	return;
    }
    var text = hw_data.text;
    if(text.length > this.MAX_FILE_SIZE){
	callback("is too large");
    }
    fs.writeFile(path, text, function(error){
	console.log(error, " E ");
	if(error)
	    callback("An error occurred");
	else
	    callback(null, "success");
    });
};

exports.SubsProvider = SubsProvider;
