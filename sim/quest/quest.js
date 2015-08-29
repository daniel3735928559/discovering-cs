if(!app) var app = angular.module('app',['ngCookies']);

app.controller("QuestController", ['$scope','$http','$cookies', '$window', '$timeout', '$document', '$sce', function($scope, $http, $cookies, $window, $timeout, $document, $sce){
    $cookies.put('cookie','pbj');
    console.log($scope.quest_manifest);
    $scope.wf_timeout = 0;
    console.log("AAAAAA",$scope.a);
    $scope.quests = []
    $scope.quest_id = 0;
    $scope.quest = null;
    $scope.problems = []
    $scope.userdata = {};
    $scope.userdata.programs = [];
    $scope.p = {"type":"python"};
    $scope.userdata.current_problem = 0;
    $document.bind('keypress', function(e) {
	console.log("kp",e.which);
	if(e.which == 83){
            $scope.$broadcast('step_key', e);
	}
	else if(e.which == 69){
            $scope.$broadcast('end_key', e);
	}
    });
    $scope.set_problem = function(x){
	if($scope.userdata.current_problem == x) return;
	$scope.$broadcast('change_problem',[$scope.userdata.current_problem, x]);
	$scope.userdata.current_problem = x;
    }
    $scope.get_html = function(){
	//console.log($scope.problems[$scope.userdata.current_problem].text);
	return $sce.trustAsHtml($scope.quest.problems[$scope.userdata.current_problem].text);
    }

    $scope.wait_for = function(f){
	console.log("QN",$scope.quest_name);
	if($scope.quest_name != undefined){
	    f($scope.quest_name);
	    $scope.wf_timeout = 0;
	    $scope.$apply();
	}
	else{
	    $scope.wf_timeout = 2*$scope.wf_timeout+1;
	    $timeout($scope.wf_timeout,function(){$scope.wait_for(f)});
	}
    }
    
    $scope.getstuff = function(qn){
	console.log("Getting",qn);
	$http.get(qn).
	    success(function(data, status, headers, config) {
		console.log(data);
		var qxml = (new window.DOMParser()).parseFromString(data, "text/xml");
		var new_quest = {};
		new_quest.name = qxml.documentElement.getAttribute("name");
		new_quest.id = qxml.documentElement.getAttribute("id");
		new_quest.problems = [];
		new_quest.programs = [];
		var l = qxml.getElementsByTagName("q");
		for(var i = 0; i < l.length; i++){
		    var p = {};
		    p.type = l[i].getAttribute("type");
		    p.id = l[i].getAttribute("id");
		    console.log(l[i].getElementsByTagName("text")[0]);
		    p.text = l[i].getElementsByTagName("text")[0].innerHTML;
		    new_quest.problems.push(p);
		    new_quest.programs.push(l[i].getElementsByTagName("program")[0].innerHTML.replace(/&gt;/g,">").replace(/&lt;/g,"<"));
		}
		$scope.quests.push(new_quest);
		console.log("QS",$scope.quests);
		$scope.quest = $scope.quests[0];
	    }).
	    error(function(data, status, headers, config) {
		console.log(status);
	    });
    }
    $scope.wait_for($scope.getstuff);
    $scope.$on('change_quest',function(event, data){
	console.log("CHANGE",data);
    });
    $scope.$on('get_program_data',function(event, data){
	console.log("GETDATA",data);
	$scope.$broadcast('save_program',$scope.userdata.current_problem);
    });
    $scope.$on('program_saved',function(event,data){
	$scope.$emit('program_data',$scope.quest.programs);
    });
//    $timeout($scope.getstuff, $scope.wf_timeout);
    console.log($scope.problems);
}]);

