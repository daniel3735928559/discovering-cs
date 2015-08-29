//var app = angular.module('app', []);


app.controller("PySimController", ['$scope','$timeout',function($scope, $timeout){
    $scope.p = parser;
    $scope.lightboard_on = false;
    $scope.grid_rows = 10;
    $scope.grid_cols = 10;
    $scope.buttons = [];
    $scope.show_ref = false;
    console.log("asd");
    //alert($scope.p.parse("2*2", $scope));
    $scope.cm_setup = function(){
	$scope.error_line = 0;
	var sim_textarea = document.getElementById("pysim"+$scope.simid+"_program_area");
	console.log($scope.simid,sim_textarea);
	if(sim_textarea == null) return;
	$scope.editor = CodeMirror.fromTextArea(sim_textarea, {
	    lineNumbers: true,
	    styleActiveLine: true,
	    indentUnit: 3,
	    readOnly: false, 
	    gutters: ["breakpoints", "CodeMirror-linenumbers"]
	});
	$scope.editor.setOption("theme", "default");
	$scope.editor.setValue($scope.program);
	if($scope.simid == "big"){
	    //$scope.editor.setValue($scope.userdata.programs[$scope.userdata.current_problem]);
	    $scope.$on('step_key',function(event, data){
		if($scope.running)
		    $scope.step();
		$scope.$apply();
	    });
	    $scope.$on('end_key',function(event, data){
		if($scope.running)
		    $scope.reset();
		$scope.$apply();
	    });
	    $scope.$on('save_program',function(event, data){
		var cur = data;
		console.log("SAVING", event, data, $scope.quest.programs[cur]);
		$scope.program = $scope.editor.getValue();
		$scope.quest.programs[cur] = $scope.program;
		$scope.$emit('program_saved');
	    });
	    $scope.$on('change_problem',function(event, data){
		var prev = data[0];
		var cur = data[1];
		console.log("ello", event, data, $scope.userdata.programs[prev]);
		$scope.program = $scope.editor.getValue();
		$scope.quest.programs[prev] = $scope.program;
		$scope.program = $scope.quest.programs[cur];
		$scope.reset();
		$scope.editor.setValue($scope.program);
		console.log("ello", event, data, $scope.userdata.programs[prev]);
	    });
	    $scope.editor.setSize(null, "70%");
	}
	else{
	    $scope.editor.setSize(null, ($scope.program.split("\n").length + 2)*($scope.editor.defaultTextHeight()) + 10);
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
    $scope.toggle_lightboard = function(){
	$scope.lightboard_on = !$scope.lightboard_on;
    }
    $scope.is_valid_string = function(o) {
	return typeof o == "string" || (typeof o == "object" && o.constructor === String);
    }
    $scope.is_valid_number = function(n){
	return !isNaN(parseFloat(n)) && isFinite(n);
    }
    $scope.initialize = function(){
	if($scope.simid == "big"){
	    $scope.ref_display = true;
	    console.log("big");
	    $scope.click_callback = null;
	    $scope.line_types['set_color'] = {"regex":/^set_color\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *, *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *, *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *\) *$/,"execute":function(data){
		console.log(data);
		$scope.lightboard_on = true;
		var b = $scope.get_button($scope.parse_expression(data[1]), $scope.parse_expression(data[2]));
		if(b) b.style['background-color'] = $scope.parse_expression(data[3]);
		else $scope.status = "Invalid lightboard coordinates";
	    }};
	    $scope.line_types['set_text'] = {"regex":/^set_text\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *, *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *, *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *\) *$/,"execute":function(data){
		console.log(data);
		$scope.lightboard_on = true;
		var b = $scope.get_button($scope.parse_expression(data[1]), $scope.parse_expression(data[2]));
		if(b) b.content = ($scope.parse_expression(data[3]).toString())[0];
		else $scope.status ="Invalid lightboard coordinates";
	    }};
	    $scope.line_types['input_click'] = {"regex":/^input_click\( *([a-zA-Z_][a-zA-Z_0-9]*) *, *([a-zA-Z_][a-zA-Z_0-9]*) *, *([a-zA-Z_][a-zA-Z_0-9]*) *, *([a-zA-Z_][a-zA-Z_0-9]*) *\) *$/,"execute":function(data){
		console.log(data);
		$scope.lightboard_on = true;
		$scope.await_click(function(x, y){
		    $scope.variables[data[1]] = x;
		    $scope.variables[data[2]] = y;
		    $scope.variables[data[3]] = $scope.get_button(x, y).content;
		    $scope.variables[data[4]] = $scope.get_button(x, y).style['background-color'];
		    $scope.awaiting_input = false;
		});
	    }};
	}
	$scope.cm_setup();
	console.log($scope.line_types);
    }
    $scope.to_number = function(s){
	if(!$scope.is_valid_number(s)) {
	    $scope.status = "Error: Invalid number used on line " + $scope.get_line_num() + " ";
	    $scope.die();
	}
	else return +s;
    }
    $scope.to_string = function(s){
	return s;
    }
    $scope.to_integer = function(s){
	if(isNaN(s)) {
	    $scope.status = "Error: Invalid number used on line " + $scope.get_line_num() + " ";
	    $scope.die();
	}
	else if(parseInt(s) != to_number(s)){
	    $scope.status = "Error: Expected integer on line " + $scope.get_line_num() + " ";
	    $scope.die();
	}
	else return parseInt(s);
    }
    $scope.get_button = function(x, y){
	console.log("get",x,y);
	if(0 <= x && x < $scope.grid_cols && 0 <= y && y < $scope.grid_cols)
	    return $scope.buttons[x + y * $scope.grid_cols];
	return null;
    }
    $scope.await_click = function(f){
	$scope.click_callback = f;
	$scope.awaiting_input = true;
	$scope.status = "Click a button";
    }
    $scope.button_click = function(idx){
	$scope.awaiting_input = false;
	var x = idx % ($scope.grid_cols);
	var y = Math.floor(idx / $scope.grid_cols);
	if($scope.click_callback != null){
	    $scope.status = "Running";
	    $scope.click_callback(x, y);
	    $scope.click_callback = null;
	    var temp = $scope.steps.count;
	    console.log("REM",$scope.remaining_steps);
	    $scope.steps.count = $scope.remaining_steps;
	    $scope.step()
	    $scope.steps.count = temp;
	}
    }
    //$scope.program = "x = 2\ny= -3\nx = 67\nprint(8)\nif(2 == 2): \n   x = 3\nz= 0\nif(2 == 2): \n   x = 9\n   if(4 > 2): \n      y = 4\nx = 4";
    $scope.reset = function(){
	$scope.buttons = [];
	if($scope.simid == "big"){
	    for(var i = 0; i < $scope.grid_cols * $scope.grid_rows; i++){
		$scope.buttons.push({'style':{'background-color':'gray','height':'15px','width':'15px','display':'inline-block','text-align':'center','padding':'2px','border':'1px solid black','margin':'1px','cursor':'pointer','font-size':'12px','vertical-align':'top'},'content':' '});
	    }
	}
	$scope.line = 0;
	$scope.error_happened = false;
	$scope.status = "Program not running";
	$scope.top_level_block = new $scope.block(0, null);
	$scope.current_block = $scope.top_level_block;
	$scope.line = 0;
	$scope.remaining_steps = 0;
	$scope.steps = {"count":1};
	$scope.variables = {};
	$scope.outputs = [];
	$scope.updated = [];
	$scope.awaiting_input = false;
	$scope.running = false;
	if($scope.editor){
	    $scope.editor.setOption("readOnly", false);
	    $scope.editor.setOption("theme", "default");
	    $scope.editor.removeLineClass($scope.error_line, "background", "active_line");
	}
    }
    $scope.set_error_line = function(l){
	$scope.error_line = l;
	$scope.editor.addLineClass(l, "background", "active_line");
    }
    $scope.submit = function(){
	alert("Not yet implemented");
    }
    $scope.get_variable = function(x){
	console.log("Getting",x);
	console.log("ASDASD",$scope.get_line_num());
	if(x in $scope.variables){
	    return $scope.variables[x];
	}
	$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " does not exist!");
    }
    $scope.die = function(){
	$scope.running = false;
	$scope.editor.setOption("readOnly", false);
	$scope.editor.setOption("theme", "default");
    }
    $scope.analyse_line = function(line){
	var a = "We could not determine what type of line you intended.  ";
	if(line.search("print") > 0){
	    a = "It looks like you wanted a print line.  These are of the form print([expression]).  ";
	}
	else if(line.search("input_num") >= 0){
	    a = "It looks like you wanted an input_num line.  These are of the form input_num([variable name]).  ";
	}
	else if(line.search("input_num") >= 0){
	    a = "It looks like you wanted an input_string line.  These are of the form input_string([variable name]).  ";
	}
	else if(line.search("if") >= 0){
	    a = "It looks like you wanted an \"if\" line.  These must look like if([test]): and are followed by indented lines.  ";
	}
	else if(line.search("while") >= 0){
	    a = "It looks like you wanted a while line.  These must look like while([test]): and are followed by indented lines.  ";
	}
	else if(line.search("else") >= 0){
	    a = "It looks like you wanted an else line.  These contain just the text else: and nothing other than that.  ";
	}
	else if(line.search("=") >= 0){
	    a = "It looks like you wanted an assignment line.  These look like [variable name] = [expression].  ";
	}
	a += "For more information, see the reference by clicking the \"ref\" button."
	return a;
    }
    $scope.parse = function(inst){
	if(/^[ \t]*$/.test(inst))
	    return null;
	var matches = inst.match(/( *)([^ ].*)/);
	if(matches[1].length % 3 != 0){
	    return new $scope.instruction(inst, null, null, null, 0, "Indentation must be a multiple of 3 spaces");
	}
	var indent_level = matches[1].length/3;
	var line = matches[2];
	console.log(indent_level, "|||", line);
	for(var t in $scope.line_types){
	    var line_matches = line.match($scope.line_types[t].regex);
	    if(line_matches){
		console.log("FOUND",t,line_matches);
		return new $scope.instruction(inst, t, line_matches, $scope.line_types[t].execute, indent_level, null);
	    }
	}
	var analysis = $scope.analyse_line(inst);
	$scope.raise_error("Bad line: "+inst + "\nAnalysis: " + analysis);
	return new $scope.instruction(inst, null, null, null, indent_level, "Line is not one of the valid types.  " + analysis);
    }
    $scope.parse_expression = function(expr){
	// Parse the expression and return its value
	//return parseInt(expr, 10);
	console.log("PARSING",expr);
	try{
	    var answer =  $scope.p.parse(expr, $scope);
	} catch(e) {
	    $scope.raise_error("Expression has no valid value: " + expr);
	}
	if(!($scope.is_valid_number(answer) || $scope.is_valid_string(answer))){
	    $scope.raise_error("Expression has no valid value: " + expr);
	}
	if($scope.is_valid_string(answer)){
	    answer = $scope.handle_string_escapes(answer);
	}
	else console.log("ANS",answer);
	return answer;
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
    $scope.handle_string_escapes = function(s){
	s = s.replace(/(([^\\]|)(\\\\)*)\\n/g,"$1\n");
	s = s.replace(/(([^\\]|)(\\\\)*)\\"/g,"$1\"");
	s = s.replace(/\\\\/g,"\\");
	return s;
    }
    $scope.output = function(stuff){
	$scope.outputs.push(stuff);
    }
    $scope.line_types = {
	"assignment":{"regex":/^([a-zA-Z_][a-zA-Z_0-9]*) *= *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)$/,"execute":function(data){
	    $scope.set_variable(data[1], $scope.parse_expression(data[2]));
	}},
	"while":{"regex":/^while\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *(==|!=|>|<|>=|<=) *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\): *$/,"execute":function(data){
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
	"if":{"regex":/^if\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*) *(==|!=|>|<|>=|<=) *((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\): *$/,"execute":function(data){
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
	"print":{"regex":/^print\(((?:[a-zA-Z0-9_\+\-\.\*\/%() ]+|"(?:[^"\\]|\\.)*")*)\) *$/,"execute":function(data){
	    $scope.output($scope.parse_expression(data[1]));
	}},
	"input_num":{"regex":/^input_num\( *([a-zA-Z_][a-zA-Z_0-9]*) *\) *$/,"execute":function(data){
	    console.log("data",data);
	    $scope.variables[data[1]] = $scope.to_number(prompt("Enter a number: "));
	}},
	"input_string":{"regex":/^input_string\( *([a-zA-Z_][a-zA-Z_0-9]*) *\) *$/,"execute":function(data){
	    console.log("data",data);
	    $scope.variables[data[1]] = prompt("Enter a string: ");
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
	    if(inst.type == 'if'){
		if(inst.run()){
		    inst.branch_taken = true;
		    $scope.current_block = inst.block;
		    $scope.update_status();
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
		    $scope.update_status();
		}
	    }
	    else {
		inst.run();
		self.advance();
	    }
	}
	this.advance = function(){
	    console.log("ADVANCE");
	    if($scope.error_happened){
		console.log("uh oh");
		$scope.reset();
		$scope.status = $scope.error_message;
		return;
	    }
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
	    $scope.update_status();
	}
    }
    $scope.get_line_num = function(){
	return $scope.current_block.lines[$scope.current_block.line].line_num;
    }
    $scope.update_status = function(){
	var l = $scope.get_line_num();
	console.log("LINUM",l);
	$scope.editor.clearGutter("breakpoints");
	$scope.editor.setGutterMarker(l-1, "breakpoints", $scope.make_marker());
	//$scope.status = $scope.running ? "Running" : "Not running";
    }
	$scope.step = function(){
	    
	console.log("STEPPING");
	if($scope.awaiting_input) return;
	//$scope.print_block($scope.current_block);
	for(var i = 0; i < $scope.steps.count && $scope.running; i++){
	    this.current_block.step();
	    if($scope.awaiting_input){
		$scope.remaining_steps = $scope.steps.count - i;
		break;
	    }
	}
    }
    $scope.run = function(){
	$scope.reset();
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
		console.log("Got bad line");
		$scope.status = "Error at line " + (l+1) + ": " + inst.error;
		$scope.set_error_line(l);
		return;
	    }
	    inst.line_num = l+1;
	    console.log(inst.text, inst.indent_level, current_level)
	    if(inst.indent_level == current_level+1){
		if(prev_inst == null || (prev_inst.type != 'if' && prev_inst.type != 'else' && prev_inst.type != 'while')){
		    $scope.status = "Error at line "+(l+1)+": indented lines may only follow if, else, or while";
		    $scope.set_error_line(l);
		    return;
		}
		else{
		    prev_inst.block = new $scope.block(current_level+1, prev_inst, current_block);
		    current_block = prev_inst.block;
		}
	    }
	    else if(inst.indent_level < current_level){
		for(var i = 0; i < current_level - inst.indent_level; i++){
		    current_block = current_block.parent_block;
		}
	    }
	    else if(inst.indent_level != current_level){
		$scope.status = "Error at line "+(l+1) + ": Indentation level may only increase one step at a time";
		$scope.set_error_line(l);
		return;
	    }
	    if(inst.indent_level != current_level+1 && prev_inst != null && (prev_inst.type == 'if' || prev_inst.type == 'while')){
		$scope.status = "Error at line "+(l+1)+": \""+prev_inst.type+"\" line must be followed by at least one line indented exactly one step further than the \""+prev_inst.type+"\" line";
		$scope.set_error_line(l);
		return;
	    }
	    current_level = inst.indent_level;
	    current_block.lines.push(inst);
	    prev_inst = inst;
	}
	$scope.running = true;
	$scope.status = "Running";
	$scope.editor.setOption("readOnly", true);
	$scope.editor.setOption("theme", "paraiso-light");
	$scope.editor.clearGutter("breakpoints");
	$scope.editor.setGutterMarker(0, "breakpoints", $scope.make_marker());
	//$scope.raise_error(JSON.stringify(lines));
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
	$scope.error_happened = true;
	$scope.error_message = s;
	console.log("ERRORERRORERROR",s);
    }
    $scope.set_original = function(){
	$scope.reset();
	$scope.program = $scope.original;
	$scope.editor.setValue($scope.program);
    }
    $scope.ref = function(){
	$scope.show_ref = !$scope.show_ref;
    }
    $scope.reset();
    $scope.original = $scope.program;
    //Hack--somehow the ng-attr-id
    //gets set after this line is run,
    //and we need to run cm_setup
    //after the ng-attr-id is set
    $timeout($scope.initialize, 0);
}]);

