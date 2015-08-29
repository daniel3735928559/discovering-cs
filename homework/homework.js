var app = angular.module('app',['ngCookies']);

app.controller("HomeworkController", ['$scope','$http','$cookies', '$window', '$timeout', '$document', '$sce', function($scope, $http, $cookies, $window, $timeout, $document, $sce){
    $scope.verify_submission = false;
    console.log("HI");
    $scope.homework_id = 0;
    $scope.homeworks = [{"name":"Homework 1","file":"/hw/hw1.xml"},{"name":"Homework 2","file":"/hw/hw2.xml"},{"name":"Homework 3","file":"/hw/hw3.xml"}]
    for(var i = 0; i < $scope.homeworks.length; i++){
	$scope.homeworks[i].index = i;
    }
    $scope.switch_hw = function(){
	console.log("SMETHING",$scope.homework_id);
	$scope.$broadcast('change_quest',$scope.homeworks[$scope.homework_id].file);
    }
    $scope.get_homework_manifest = function(){
	
    }
    $scope.submit_homework = function(){
	console.log("hi");
	$scope.verify_submission = true;
	$scope.$broadcast('get_program_data',"stuff");
    }
    $scope.exit_verify = function(){
	console.log("ASDA");
	$scope.verify_submission = false;
    }
    $scope.$on('program_data',function(event,data){
	console.log("GOT",data);
	$scope.submission_programs = data;
    });
    $scope.submit_homework_for_real = function(){
	console.log("Aaaaas yooooooou wiiiiiiiiiiiiiiiiiiiiiiiiiish...");
	var sub_data = {};
	sub_data['total'] = $scope.submission_programs.length;
	for(var i = 0; i < $scope.submission_programs.length; i++){
	    sub_data[i] = {"hwid":$scope.homework_id,"pid":i,"text":$scope.submission_programs[i]};
	}
	$http.post("/homework/saveall",sub_data).then(function(response){
	    console.log("Success",response);
	    alert(response.data['success']);
	    $scope.verify_submission = false;
	}, function(response){
	    console.log("Error",response);
	    alert(response.data['error']);
	    $scope.verify_submission = false;
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

