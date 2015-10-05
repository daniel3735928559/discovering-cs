var app = angular.module('app',['ngCookies']);

app.controller("HomeworkController", ['$scope','$http','$cookies', '$window', '$timeout', '$document', '$sce', function($scope, $http, $cookies, $window, $timeout, $document, $sce){
    $scope.verify_submission = false;
    $scope.qcontrol = {};
    console.log("HI");
    $scope.homework_id = 0;
    $scope.hwid = null;
    $scope.hw_status = "Loading saved homework data...";
    $scope.homeworks = [{"name":"Homework 3 (ended)","file":"/hw/hw3.xml"}, {"name":"Homework 2 (ended)","file":"/hw/hw2.xml"}]
    for(var i = 0; i < $scope.homeworks.length; i++){
	$scope.homeworks[i].index = i;
    }
    $scope.switch_hw = function(){
	console.log("SMETHING",$scope.homework_id);
	var data = $scope.qcontrol.get_program_data();
	$scope.submission_problems = data.problems;
	$scope.submission_programs = data.programs;
	$scope.submit_homework_for_real(function(ok){
	    if(ok)
		$scope.qcontrol.set_quest($scope.homework_id,$scope.homeworks[$scope.homework_id].file);
	    else
		alert("Could not save homework before switching--not switching");
	});
    }
    $scope.get_saved_homeworks = function(){
	console.log("HWID",$scope.hwid);
	get_data = {"hwid":$scope.hwid};
	$http.post("/homework/get",get_data).then(function(response){
	    console.log("Success",response.data.data);
	    $scope.hw_status = "Loaded saved data";
	    $scope.$broadcast('set_programs',response.data.data);
	}, function(response){
	    console.log("Error",response);
	    $scope.status("Failed to load saved data");
	})
    }
    $scope.submit_homework = function(){
	console.log("hi");
	$scope.verify_submission = true;
	var data = $scope.qcontrol.get_program_data();
	$scope.submission_problems = data.problems;
	$scope.submission_programs = data.programs;
    }
    $scope.exit_verify = function(){
	console.log("ASDA");
	$scope.verify_submission = false;
    }
    $scope.$on('set_hwid',function(event,data){
	$scope.hwid = data;
	console.log("GETTING ASDHASDJHBASJDHB",data);
	$scope.get_saved_homeworks();
    });
    $scope.submit_homework_for_real = function(callback){
	console.log("Aaaaas yooooooou wiiiiiiiiiiiiiiiiiiiiiiiiiish...");
	var sub_data = {};
	var err_msg = "ERROR: Your homework has not been saved.  Please verify in another tab that your connection to the server is functional and that your NetID session has not expired.";
	var success_msg = "Most recent save was successful!"
	sub_data['total'] = $scope.submission_programs.length;
	for(var i = 0; i < $scope.submission_programs.length; i++){
	    sub_data[i] = {"hwid":$scope.hwid,"pid":i,"text":$scope.submission_programs[i]};
	}
	$http.post("/homework/saveall",sub_data).then(function(response){
	    console.log("Response",response);
	    if(response.data && response.data['success']){
		$scope.hw_status = success_msg;
		alert(response.data['success'] ? response.data['success'] : response.data['error']);
		callback(true);
	    }
	    else if(response.data && response.data['error']){
		$scope.hw_status = response.data['error'];
		alert(response.data['error']);
		callback(false);
	    }
	    else{
		$scope.hw_status = err_msg;
		alert(err_msg);
		callback(false);
	    }
	    $scope.verify_submission = false;
	}, function(response){
	    console.log("Error",response);
	    $scope.hw_status = err_msg;
	    alert(err_msg);
	    $scope.verify_submission = false;
	    callback(false);
	})
	// for(var i = 0; i < $scope.submission_programs.length; i++){
	//     var sub_data = JSON.stringify({"hwid":$scope.homework_id,"pid":i,"text":$scope.submission_programs[i]});
	//     console.log("Saving...",sub_data);
	//     $http.post("/homework/saveall",sub_data).then(function(response){
	// 	console.log("Succes",response);
	//     }, function(response){
	// 	console.log("Error",response);
	//     })
	// }
    }
    $scope.autosave_homework = function(){
	$scope.submit_homework_for_real();
	
    }
}]);

