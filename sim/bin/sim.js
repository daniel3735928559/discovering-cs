var binsim_app = angular.module('binsim_app', []);

binsim_app.controller("BinSimController", ['$scope','$timeout',function($scope, $timeout){
    $scope.hex_dict = {"0000":"0",
		       "0001":"1",
		       "0010":"2",
		       "0011":"3",
		       "0100":"4",
		       "0101":"5",
		       "0110":"6",
		       "0111":"7",
		       "1000":"8",
		       "1001":"9",
		       "1010":"a",
		       "1011":"b",
		       "1100":"c",
		       "1101":"d",
		       "1110":"e",
		       "1111":"f",}
    $scope.reset = function(){
	$scope.byte1 = "";
	$scope.twoscomplement_bits = "8";
	$scope.point_bits = "4";
	$scope.exp_bits = "5";
	$scope.interpretations = {};
    }
    $scope.parse_unsigned = function(s){
	var x = 0;
	var p = 1;
	for(var i = s.length-1; i >=0; i--){
	    if(s[i] == "1") x += p;
	    else if(s[i] != "0") return $scope.throw_error("Only 0s and 1s are allowed in a binary representation");
	    p *= 2;
	}
	return x;
    }
    $scope.parse_twos_complement = function(s, b){
	var x = 0;
	var p = 1;
	if(b != s.length) return "Error: Incorrect number of bits in representation"
	for(var i = s.length-1; i >=0; i--){
	    if(i == 0) p = -p;
	    if(s[i] == "1") x += p;
	    else if(s[i] != "0") return $scope.throw_error("Only 0s and 1s are allowed in a binary representation");
	    p *= 2;
	}
	return x;
    }
    $scope.parse_fixed_point = function(s, b){
	var x = 0;
	var p = 0.5;
	if(b > s.length) return "Error: Point must be located within representation"
	for(var i = b; i < s.length; i++){
	    if(s[i] == "1") x += p;
	    else if(s[i] != "0") return "Error: Only 0s and 1s are allowed in a binary representation";
	    p /= 2;
	}
	p = 1;
	for(var i = b-1; i >= 0; i--){
	    if(s[i] == "1") x += p;
	    else if(s[i] != "0") return "Error: Only 0s and 1s are allowed in a binary representation";
	    p *= 2;
	}
	return x;
    }
    $scope.parse_floating_point = function(s, b){
	var base = 0;
	var exp = 0;
	var p = 1;
	if(b > s.length) return "Error: Not enough bits in representation for exponent"
	for(var i = b; i >= 1; i--){
	    if(i == 1) p = -p;
	    if(s[i] == "1") exp += p;
	    else if(s[i] != "0") return "Error: Only 0s and 1s are allowed in a binary representation";
	    p *= 2;
	}
	p = 1;
	for(var i = s.length-1; i > b; i--){
	    if(s[i] == "1") base += p;
	    else if(s[i] != "0") return "Error: Only 0s and 1s are allowed in a binary representation";
	    p *= 2;
	}
	var x =  base;
	for(var i = exp; i < 0; i++) x /= 2;
	for(var i = 0; i < exp; i++) x *= 2;
	if(s[0] == "1") x = -x
	else if(s[i] != "0") return "Error: Only 0s and 1s are allowed in a binary representation";
	return x;
    }
    $scope.parse_hexadecimal = function(s){
	while(s.length % 4 != 0) s = "0"+s;
	var ans = "0x";
	for(var i = 0; i < s.length/4; i++){
	    ans += $scope.hex_dict[s.substring(4*i, 4*i+4)];
	}
	return ans;
    }
    $scope.update = function(s){
	$scope.interpretations["unsigned_integer"] = $scope.parse_unsigned(s);
	$scope.interpretations["twos_complement"] = $scope.parse_twos_complement(s, parseInt($scope.twoscomplement_bits));
	$scope.interpretations["fixed_point"] = $scope.parse_fixed_point(s, parseInt($scope.point_bits));
	$scope.interpretations["floating_point"] = $scope.parse_floating_point(s, parseInt($scope.exp_bits));
	$scope.interpretations["hexadecimal"] = $scope.parse_hexadecimal(s);
    }
    $scope.throw_error = function(s){
	alert(s);
    }
    $scope.reset();
}]);

