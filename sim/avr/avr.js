var app = app || angular.module('app',['ngCookies']);

app.controller("AVRController", ['$scope', function($scope){
    $scope.qcontrol = {};
    $scope.$on('qready',function(event,data){
	console.log("REA");
	$scope.qcontrol.set_data(["/sim/quest/avrquest.xml"],"0");
    });
}]);

