//var app = angular.module('app', []);


app.controller("PySimController", ['$scope','$timeout',function($scope, $timeout){
    $scope.p = parser;
    console.log("asd");
    //alert($scope.p.parse("2*2", $scope));
    $scope.cm_setup = function(){
	$scope.editor = CodeMirror.fromTextArea(document.getElementById("pysim"+$scope.simid+"_program_area"), {
	    lineNumbers: true,
	    indentUnit: 3,
	    readOnly: false, 
	    gutters: ["breakpoints", "CodeMirror-linenumbers"]
	});
	$scope.editor.setValue($scope.program);
	if($scope.simid == "big"){
	    $scope.editor.setSize(null, ($scope.program.split("\n").length + 2)*($scope.editor.defaultTextHeight()) + 10);
	}
	else{
	    $scope.editor.setSize(null, "100%");
	}
	$scope.editor.setOption("extraKeys", {
	    'Tab': function(cm) {
		cm.execCommand('indentMore');
	    },
	    'Shift-Tab': function(cm) {
		cm.execCommand('indentLess');
	    }
	});
    }
    //$scope.program = "x = 2\ny= -3\nx = 67\nprint(8)\nif(2 == 2): \n   x = 3\nz= 0\nif(2 == 2): \n   x = 9\n   if(4 > 2): \n      y = 4\nx = 4";
    $scope.reset = function(){
	$scope.line = 0;
	$scope.status = "Program not running";
	$scope.top_level_block = new $scope.block(0, null);
	$scope.current_block = $scope.top_level_block;
	$scope.line = 0;
	$scope.steps = {"count":1};
	$scope.variables = {};
	$scope.outputs = [];
	$scope.updated = [];
	$scope.running = false;
	if($scope.editor) $scope.editor.setOption("readOnly", false);
    }
    $scope.submit = function(){
	alert("Not yet implemented");
    }
    $scope.get_variable = function(x){
	console.log("Getting",x);
	if(x in $scope.variables){
	    return $scope.variables[x];
	}
	$scope.status = "Error: variable " + x + " referenced on " + $scope.get_line_num() + " does not exist!";
	$scope.die();
	return 0;
    }
    $scope.die = function(){
	$scope.running = false;
	$scope.editor.setOption("readOnly", false);
    }
    $scope.parse = function(inst){
	if(/^[ \t]*$/.test(inst))
	    return null;
	var matches = inst.match(/( *)([^ ].*)/);
	if(matches[1].length % 3 != 0){
	    return new $scope.instruction(inst, null, null, 0, "Indentation error: Indentation must be a multiple of 3 spaces");
	}
	var indent_level = matches[1].length/3;
	var line = matches[2];
	console.log(indent_level, "|||", line);
	for(var t in $scope.line_types){
	    var line_matches = line.match($scope.line_types[t].regex);
	    if(line_matches){
		return new $scope.instruction(inst, t, line_matches, $scope.line_types[t].execute, indent_level, null);
	    }
	}
	$scope.raise_error("Bad line: "+inst);
	return new $scope.instruction(inst, null, null, indent_level, "Line not recognised");
    }
    $scope.parse_expression = function(expr){
	// Parse the expression and return its value
	//return parseInt(expr, 10);
	console.log("PARSING",expr);
	return $scope.p.parse(expr, $scope);
    }
    $scope.context = [];
    
    $scope.is_updated = function(x){
	for(var i = 0; i < $scope.updated.length; i++){
	    if($scope.updated[i] == x) return true;
	}
	return false;
    }
    $scope.set_variable = function(var_name, val){
	console.log("Setting",var_name, val);
	$scope.variables[var_name] = val;
	$scope.updated.push(var_name);
    }
    $scope.output = function(stuff){
	$scope.outputs.push(stuff);
    }
    $scope.line_types = {
	"assignment":{"regex":/^([a-zA-Z_][a-zA-Z_0-9]*) *= *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)$/,"execute":function(data){
	    $scope.set_variable(data[1], $scope.parse_expression(data[2]));
	}},
	"while":{"regex":/^while\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *(==|!=|>|<|>=|<=) *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\): */,"execute":function(data){
	    var lhs = $scope.parse_expression(data[1]);
	    var rhs = $scope.parse_expression(data[3]);
	    var comp = data[2];
	    console.log("while",lhs,comp,rhs);
	    if(comp == '==') return lhs == rhs;
	    else if(comp == '!=') return lhs != rhs;
	    else if(comp == '<') return lhs < rhs;
	    else if(comp == '>') return lhs > rhs;
	    else if(comp == '<=') return lhs <= rhs;
	    else if(comp == '>=') return lhs >= rhs;
	}},
	"if":{"regex":/if\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *(==|!=|>|<|>=|<=) *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\): */,"execute":function(data){
	    console.log(data);
	    var lhs = $scope.parse_expression(data[1]);
	    var rhs = $scope.parse_expression(data[3]);
	    var comp = data[2];
	    console.log(lhs, comp, rhs);
	    if(comp == '==') return lhs == rhs;
	    else if(comp == '!=') return lhs != rhs;
	    else if(comp == '<') return lhs < rhs;
	    else if(comp == '>') return lhs > rhs;
	    else if(comp == '<=') return lhs <= rhs;
	    else if(comp == '>=') return lhs >= rhs;
	}},
	"else":{"regex":/else: */,"execute":function(data){}},
	"print":{"regex":/print\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\) */,"execute":function(data){
	    $scope.output($scope.parse_expression(data[1]));
	}},
	"draw":{"regex":/draw\(([a-zA-Z0-9\.+\-*\/%\(\) ]+), ([a-zA-Z0-9\.+\-*\/%\(\) ]+), ([a-zA-Z0-9\.+\-*\/%\(\) ]+)\) */,"execute":function(data){
	    $scope.output($scope.parse_expression(data[1]));
	}}
    }
    $scope.syntax = {
	"expression":{"verify":/ */,"parse":function(){return true;}},
	"test":{"regex":/ */},
    };
    $scope.instruction = function(text, type, data, exec, indent_level, error){
	this.text = text;
	this.type = type;
	this.data = data;
	this.exec = exec;
	this.indent_level = indent_level;
	this.branch_taken = false;
	this.line_num = 0;
	this.block = null;
	this.error = error;
	var self = this;
	this.run = function(){
	    return self.exec(self.data);
	}
    }
    $scope.block = function(indent_level, parent_line, parent_block){
	this.indent_level = indent_level;
	this.lines = []
	this.parent_line = parent_line;
	this.parent_block = parent_block;
	this.line = 0;
	var self = this;
	this.dad = null
	this.step = function(){
	    var inst = self.lines[self.line];
	    console.log(inst.type,inst.text);
	    $scope.updated = [];
	    if(inst.type == 'assignment' || inst.type == 'print'){
		inst.run();
		self.advance();
	    }
	    else if(inst.type == 'if'){
		if(inst.run()){
		    inst.branch_taken = true;
		    $scope.current_block = inst.block;
		}
		else{
		    inst.branch_taken = false;
		    self.advance();
		}
	    }
	    else if(inst.type == 'while'){
		if(inst.run()) $scope.current_block = inst.block;
		else self.advance();
	    }
	    else if(inst.type == 'else'){
		if(self.line == 0 || self.lines[self.line - 1].type != 'if'){
		    $scope.status = "Syntax error: else on line " + inst.line_num + " needs an if";
		}
		else if(self.lines[self.line - 1].branch_taken){
		    console.log("if was taken");
		    self.advance();
		}
		else{
		    console.log("if not taken--do else");
		    $scope.current_block = inst.block;
		}
	    }
	    $scope.update_status();
	}
	this.advance = function(){
	    console.log("ADVANCE");
	    if(self.parent_line) console.log(self.parent_line.text);
	    else console.log("no parent");
	    self.line++;
	    console.log(self.line, self.lines.length, self.lines[0]);
	    if(self.line >= self.lines.length){
		console.log("EOB");
		self.line = 0;
		if(!self.parent_line){
		    $scope.die();
		    return;
		}
		else if(self.parent_line.type == 'if' || self.parent_line.type == 'else'){
		    console.log("parent if");
		    $scope.current_block = self.parent_block;
		    $scope.current_block.advance();
		}
		else if(self.parent_line.type == 'while'){
		    if(self.parent_line.run()){
			console.log("repeating");
		    }
		    else{
			$scope.current_block = self.parent_block;
			$scope.current_block.advance();
		    }
		}
	    }
	}
    }
    $scope.get_line_num = function(){
	return $scope.current_block.lines[$scope.current_block.line].line_num;
    }
    $scope.update_status = function(){
	var l = $scope.get_line_num();
	$scope.editor.clearGutter("breakpoints");
	$scope.editor.setGutterMarker(l-1, "breakpoints", $scope.make_marker());
	$scope.status = $scope.running ? "Running" : "Not running";
    }
    $scope.step = function(){
	console.log("STEPPING");
	//$scope.print_block($scope.current_block);
	for(var i = 0; i < $scope.steps.count && $scope.running; i++){
	    this.current_block.step();
	}
    }
    $scope.run = function(){
	$scope.reset();
	$scope.editor.setOption("readOnly", true);
	$scope.program = $scope.editor.getValue();
	var lines = $scope.program.split("\n");
	var current_level = 0;
	var prev_inst = null;
	var current_block = $scope.top_level_block;
	for(var l = 0; l < lines.length; l++){
	    var inst = $scope.parse(lines[l]);
	    if(inst == null){ // Blank line
		continue;
	    }
	    if(inst.error){
		$scope.status = inst.error + " at line " + (l+1) + ": " + inst.text;
		return;
	    }
	    inst.line_num = l+1;
	    console.log(inst.text, inst.indent_level, current_level)
	    if(inst.indent_level == current_level+1){
		if(prev_inst == null){
		    $scope.status = "Indentation errro at line "+(l+1);
		    return;
		}
		prev_inst.block = new $scope.block(current_level+1, prev_inst, current_block);
		current_block = prev_inst.block;
	    }
	    else if(inst.indent_level < current_level){
		for(var i = 0; i < current_level - inst.indent_level; i++){
		    current_block = current_block.parent_block;
		}
	    }
	    else if(inst.indent_level != current_level){
		$scope.status = "Indentation error at line "+(l+1);
		return;
	    }
	    current_level = inst.indent_level;
	    current_block.lines.push(inst);
	    prev_inst = inst;
	}
	$scope.running = true;
	$scope.editor.clearGutter("breakpoints");
	$scope.editor.setGutterMarker(0, "breakpoints", $scope.make_marker());
	$scope.raise_error(JSON.stringify(lines));
	$scope.print_block($scope.top_level_block);
	$scope.update_status();
    }
    $scope.print_block = function(b,l){
	if(!l) l = 0;
	for(var i = 0; i < b.lines.length; i++){
	    var inst = b.lines[i];
	    console.log(l,b.line,inst.text);
	    if(inst.block != null){
		$scope.print_block(inst.block,l+1);
	    }
	}
    }
    $scope.make_marker = function() {
	var marker = document.createElement("div");
	marker.style.color = "#822";
	marker.innerHTML = ">";
	return marker;
    }
    $scope.raise_error = function(s){
	console.log(s);
    }
    $scope.set_original = function(){
	$scope.reset();
	$scope.program = $scope.original;
	$scope.editor.setValue($scope.program);
    }
    $scope.reset();
    $scope.original = $scope.program;
    //Hack--somehow the ng-attr-id
    //gets set after this line is run,
    //and we need to run cm_setup
    //after the ng-attr-id is set
    $timeout($scope.cm_setup, 0);
}]);

