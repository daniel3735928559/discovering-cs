if(!app) var app = angular.module('app');

app.controller("QuestController", ['$scope','$http','$window', '$timeout', '$document', '$sce', function($scope, $http, $window, $timeout, $document, $sce){
    $scope.pycontrol = {};
    $scope.avrcontrol = {};
    $scope.show_tutorial = true;
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
    $scope.set_problem = function(x){
	if($scope.userdata.current_problem == x) return;
	if($scope.quest.problems[$scope.userdata.current_problem].type == "python"){
	    console.log("PPP",$scope.pycontrol.get_program(),$scope.quest.programs[$scope.userdata.current_problem]);
	    $scope.quest.programs[$scope.userdata.current_problem] = $scope.pycontrol.get_program();
	    $scope.userdata.current_problem = x;
	    $scope.pycontrol.set_program($scope.quest.programs[$scope.userdata.current_problem]);
	}
	else if($scope.quest.problems[$scope.userdata.current_problem].type == "avr"){
	    console.log("PPP",$scope.avrcontrol.get_program(),$scope.quest.programs[$scope.userdata.current_problem]);
	    $scope.quest.programs[$scope.userdata.current_problem] = $scope.avrcontrol.get_program();
	    $scope.userdata.current_problem = x;
	    $scope.avrcontrol.set_program($scope.quest.programs[$scope.userdata.current_problem]);
	}
    }
    $scope.toggle_tutorial = function(){
	console.log("STSTS",$scope.show_tutorial);
	$scope.show_tutorial = !($scope.show_tutorial);
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
		$scope.$emit('set_hwid',$scope.quest.id);
		console.log("sending it down");
		$scope.update_sim();
	    }).
	    error(function(data, status, headers, config) {
		console.log(status);
	    });
    }
    $scope.update_sim = function(){
	console.log($scope.pycontrol);
	if($scope.pycontrol.set_program && $scope.quest && $scope.quest.problems[$scope.userdata.current_problem].type == "python")
	    $scope.pycontrol.set_program($scope.quest.programs[$scope.userdata.current_problem]);
	if($scope.avrcontrol.set_program && $scope.quest && $scope.quest.problems[$scope.userdata.current_problem].type == "avr")
	    $scope.avrcontrol.set_program($scope.quest.programs[$scope.userdata.current_problem]);
    }
    //$scope.wait_for($scope.getstuff);
    $scope.$on('set_programs',function(event, data){
	console.log("CHANGE",data,data[$scope.userdata.current_problem]);
	$scope.quest.programs = data;
	$scope.userdata.programs = data;
	$scope.update_sim();
    });
    $scope.$on('spy_linked',function(event, data){
	console.log("LALALALAA",data);
	$scope.update_sim();
    });
    $scope.$on('jsavr_linked',function(event, data){
	console.log("LALALALAA",data);
	$scope.update_sim();
    });
    $scope.$on('change_quest',function(event, data){
	console.log("CHANGE",data);
	$scope.update_sim();
    });
    $scope.$on('get_program_data',function(event, data){
	$scope.$emit('program_data',{'problems':$scope.quest.problems,'programs':$scope.quest.programs});
    });
//    $timeout($scope.getstuff, $scope.wf_timeout);
    console.log($scope.problems);
}])
    .directive('exploration',function(){
	return {
	    restrict: 'E',
	    scope:{
		control: '='
	    },
	    templateUrl: function(element,attrs){
		return attrs.template;
	    },
	    controller: 'QuestController',
	    link: function(scope,element,attrs){
		scope.quest_name = attrs.questName;
		console.log("LINKY",scope,element,attrs);
		scope.getstuff(scope.quest_name);
	    }
	}
    });

