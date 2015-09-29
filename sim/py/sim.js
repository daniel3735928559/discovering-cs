var app = app || angular.module('app', []);

function make_a_clone(obj) {
    if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
	return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj) {
	if(Object.prototype.hasOwnProperty.call(obj, key)) {
	    obj['isActiveClone'] = null;
	    temp[key] = clone(obj[key]);
	    delete obj['isActiveClone'];
	}
    }

    return temp;
}

function Deque()
{
    this.state=new Array();
    this.is_empty = function(){ return this.state.length == 0; }
    this.pop=function(){ return this.state.pop(); }
    this.push=function(item){ this.state.push(item); }
    this.pop_front=function(){ return this.state.shift(); }
    this.push_front=function(item){ this.state.unshift(item); }
}

app.controller("PySimController", ['$scope','$timeout',function($scope, $timeout){
    $scope.p = parser;
    $scope.call_stack = [];
    $scope.called_a_function = false;
    $scope.map_loaded = false;
    $scope.in_progress_asts = new Deque();
    $scope.syntax_elements = {
	"add":function(args){
	    if($scope.is_valid_array(args[0]) && $scope.is_valid_array(args[1]))
		return args[0].concat(args[1]);
	    else if(($scope.is_valid_number(args[0]) || $scope.is_valid_string(args[0])) && ($scope.is_valid_number(args[1]) || $scope.is_valid_string(args[1])))
		return args[0] + args[1];
	},
	"sub":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] - args[1]
	    return {'error':'Invalid arguments to -'};
	},
	"mul":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] * args[1]
	    return {'error':'Invalid arguments to *'};
	},
	"div":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]) && args[1] != 0)
		return args[0] / args[1]
	    return {'error':'Invalid arguments to /'};
	},
	"mod":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]) && args[1] != 0)
		return args[0] % args[1]
	    return {'error':'Invalid arguments to %'};
	},
	"neg":function(args){
	    if($scope.is_valid_number(args[0]))
		return -args[0]
	    return {'error':'Invalid arguments to negation -'};
	},
	"len":function(args){
	    if($scope.is_valid_array(args[0]))
		return args[0].length;
	    return {'error':'Invalid arguments to len()'};
	},
	"gt":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] > args[1]
	    return {'error':'Invalid arguments to >'};
	},
	"lt":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] < args[1]
	    return {'error':'Invalid arguments to <'};
	},
	"geq":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] >= args[1]
	    return {'error':'Invalid arguments to >='};
	},
	"leq":function(args){
	    if($scope.is_valid_number(args[0]) && $scope.is_valid_number(args[1]))
		return args[0] <= args[1]
	    return {'error':'Invalid arguments to <='};
	},
	"eq":function(args){
	    return args[0] == args[1];
	},
	"neq":function(args){
	    return args[0] != args[1];
	},
	"bool_and":function(args){
	    return args[0] && args[1];
	},
	"bool_or":function(args){
	    return args[0] || args[1];
	},
	"arr_val":function(args){
	    return $scope.get_array_value(args[0],args[1]);
	},
	"array":function(args){
	    var val = [];
	    console.log("building array",args);
	    for(var i = 0; i < args.length; i++){
		console.log("pushing",args[i]);
		val.push(args[i]);
	    }
	    console.log("built array",val);
	    return val;
	}
    };
    $scope.builtins = {
	"print":{
	    "name":"print",
	    "arg_names":["str"],
	    "run":function(args){$scope.output(args[0]);}
	},
	"len":{
	    "name":"len",
	    "arg_names":["array"],
	    "run":function(args){
		if($scope.is_valid_array(args[0]))
		    return args[0].length;
		else{
		    $scope.raise_error("Argument to len is not an array!")
		    $scope.die();
		}
	    }
	}
    }
    $scope.imports = {
	"file":[
	    {
		"name":"list",
		"arg_names":[],
		"run":function(args){
		    var ans = []
		    for(var v in $scope.files){
			ans.push(v);
		    }
		    return ans;
		}
	    },
	    {
		"name":"readline",
		"arg_names":["filename","line_num"],
		"run":function(args){
		    if(args[0] in $scope.files){
			if($scope.is_valid_number(args[1]) && args[1] < $scope.files[args[0]].length)
			    return $scope.files[args[0]][args[1]];
			return -2
		    }
		    return -1;
		}
	    },
	    {
		"name":"length",
		"arg_names":["filename"],
		"run":function(args){
		    if(args[0] in $scope.files){
			return $scope.files[args[0]].length;
		    }
		    return -1;
		}
	    },
	    {
		"name":"write",
		"arg_names":["filename", "text"],
		"run":function(args){
		    if(args[0] in $scope.files){
			$scope.files[args[0]] = args[1].split("\n");
			return 1;
		    }
		    return -1;
		}
	    },
	    {
		"name":"append",
		"arg_names":["filename", "text"],
		"run":function(args){
		    if(args[0] in $scope.files){
			$scope.files[args[0]] += args[1].split("\n");
			return 1;
		    }
		    return 0;
		}
	    },
	    {
		"name":"create",
		"arg_names":["filename"],
		"run":function(args){
		    if(args[0] in $scope.files){
			return -1;
		    }
		    $scope.files[args[0]] = [];
		    return 1;
		}
	    },
	    {
		"name":"delete",
		"arg_names":["filename"],
		"run":function(args){
		    if(args[0] in $scope.files){
			delete $scope.files[args[0]];
			return 1;
		    }
		    return -1;
		}
	    },
	],
	"input":[
	    {
		"name":"get_num",
		"arg_names":["prompt"],
		"run":function(args){
		    return $scope.to_number(prompt(args[0]));
		}
	    },
	    {
		"name":"get_string",
		"arg_names":["prompt"],
		"run":function(args){
		    return prompt(args[0]);
		}
	    }
	],
	"math":[
	    {
		"name":"abs",
		"arg_names":["x"],
		"run":function(args){
		    return args[0] < 0 ? -args[0] : args[0];
		}
	    },
	    {
		"name":"sqrt",
		"arg_names":["x"],
		"run":function(args){
		    return Math.sqrt(args[0]);
		}
	    },
	    {
		"name":"distance",
		"arg_names":["x1","y1","x2","y2"],
		"run":function(args){
		    x1 = args[0];
		    y1 = args[1];
		    x2 = args[2];
		    y2 = args[3];
		    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
		}
	    },
	    {
		"name":"range",
		"arg_names":["start","end"],
		"run":function(args){
		    if(args[0] >= args[1])
			return []
		    var ans = [];
		    for(var i = args[0]; i < args[1]; i++){
			ans.push(i)
		    }
		    return ans;
		}
	    },
	    {
		"name":"solve_quadratic",
		"arg_names":["a","b","c"],
		"run":function(args){
		    a = args[0];
		    b = args[1];
		    c = args[2];
		    console.log("ABC",a,b,c);
		    if(a == 0){
			if(b == 0) return [];
			return [-c/b];
		    }
		    if(b*b-4*a*c < 0) return [];
		    if(b*b-4*a*c == 0) return [-b/(2*a)];
		    return [(-b+Math.sqrt(b*b-4*a*c))/(2*a),(-b-Math.sqrt(b*b-4*a*c))/(2*a)];
		}
	    }
	],
	"string":[
	    {
		"name":"simplify",
		"arg_names":["text"],
		"run":function(args){
		    return args[0].toLowerCase().replace(/[\t\n]/g," ").replace(/[^a-z ]/g,"").replace(/ +/g," "); 
		}
	    },
	    {
		"name":"split",
		"arg_names":["text","char"],
		"run":function(args){
		    return args[0].split(args[1]);
		}
	    }
	],
	"lb":[
	    {
		"name":"set_color",
		"arg_names":["x","y","color"],
		"run":function(args){
		    $scope.lightboard_on = true;
		    $scope.$apply();
		    var b = $scope.get_button(args[0], args[1]);
		    if(b) b.style['background-color'] = args[2];
		    else return -1;
		    return 1;
		}
	    },
	    {
		"name":"set_text",
		"arg_names":["x","y","text"],
		"run":function(args){
		    $scope.lightboard_on = true;
		    $scope.$apply();
		    console.log("SETTING",(args[2].toString())[0]);
		    var b = $scope.get_button(args[0], args[1]);
		    if(b) b.content = (args[2].toString())[0]
		    else return -1;
		    return 1
		}
	    },
	    {
		"name":"get_click",
		"arg_names":[],
		"run":function(args){
		    $scope.lightboard_on = true;
		    $scope.$apply();
		    $scope.await_click(function(x, y){
			$scope.return_from_function([x,y,$scope.get_button(x, y).content,$scope.get_button(x, y).style['background-color']])
			$scope.awaiting_input = false;
		    });
		},
		"wait":true
	    }

	    
	],
	"googlemaps":[
	    {
		"name":"init",
		"arg_names":[],
		"run":function(args){
		    if($scope.map_loaded) return;
		    $scope.map_loaded = true;
		    var script_tag = document.createElement('script');
		    script_tag.setAttribute("type","text/javascript");
		    window.gMapsCallback = function(){
			console.log("done");
		    }
		    script_tag.setAttribute("src","http://maps.google.com/maps/api/js?sensor=false&callback=gMapsCallback");
		    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
		}
	    },
	    {
		"name":"directions",
		"arg_names":["start","end"],
		"run":function(args){
		    var directionsService = new google.maps.DirectionsService();
		    console.log("DIRDIR",args[0]," to ", args[1]);
		    var directionsRequest = {
			origin: args[0],
			destination: args[1],
			travelMode: google.maps.DirectionsTravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.IMPERIAL
		    };
		    $scope.awaiting_input = true;
		    directionsService.route(directionsRequest, function (response, status) {
			$scope.awaiting_input = false;
			if (status == google.maps.DirectionsStatus.OK) {
			    console.log("GOTMAP",response)
			    var arr = [];
			    for(var i = 0; i < response.routes[0].legs.length; i++){
				for(var j = 0; j < response.routes[0].legs[i].steps.length; j++){
				    var instruction = response.routes[0].legs[i].steps[j].instructions
				    console.log("IIII",instruction);
				    instruction = instruction.replace(/<b>/g,"[");
				    instruction = instruction.replace(/<\/b>/g,"]");
				    instruction = instruction.replace(/<[^>]*>/g,"\n");
				    arr.push(instruction);
				}
			    }
			    console.log("STEPS",arr);
			    $scope.return_from_function(arr);
			}
			else{
			    $scope.return_from_function("Error: "+status);
			    console.log("MAPERR",status,response);
			}
			
		    });
		},
		"wait":true
	    }
	] 
    }
    $scope.files = {"ode.txt":
		    ["'Twas on a lofty vase's side,",
		     "Where China's gayest art had dyed",
		     "    The azure flowers, that blow;",
		     // "",
		     // "Demurest of the tabby kind,",
		     // "The pensive Selima reclined,",
		     // "    Gazed on the lake below.",
		     // "",
		     // "Her conscious tail her joy declared;",
		     // "The fair round face, the snowy beard,",
		     // "    The velvet of her paws,",
		     // "Her coat, that with the tortoise vies,",
		     // "Her ears of jet, and emerald eyes,",
		     // "    She saw; and purred applause.",
		     // "",
		     // "Still had she gazed; but 'midst the tide",
		     // "Two angel forms were seen to glide,",
		     // "    The genii of the stream:",
		     // "Their scaly armour's Tyrian hue",
		     // "Through richest purple to the view",
		     // "    Betrayed a golden gleam.",
		     // "",
		     // "The hapless nymph with wonder saw:",
		     // "A whisker first and then a claw,",
		     // "    With many an ardent wish,",
		     // "She stretched in vain to reach the prize.",
		     // "What female heart can gold despise?",
		     // "    What cat's averse to fish?",
		     // "",
		     // "Presumptuous maid! with looks intent",
		     // "Again she stretched, again she bent,",
		     // "    Nor knew the gulf between.",
		     // "(Malignant Fate sat by, and smiled)",
		     // "The slippery verge her feet beguiled,",
		     // "    She tumbled headlong in.",
		     // "",
		     // "Eight times emerging from the flood",
		     // "She mewed to every watery god,",
		     // "    Some speedy aid to send.",
		     // "No dolphin came, no Nereid stirred:",
		     // "Nor cruel Tom, nor Susan heard.",
		     // "    A favourite has no friend!",
		     // "",
		     "From hence, ye beauties, undeceived,",
		     "Know, one false step is ne'er retrieved,",
		     "    And be with caution bold.",
		     "Not all that tempts your wandering eyes",
		     "And heedless hearts, is lawful prize;",
		     "    Nor all that glisters gold. "],
		    "elegy.txt":[
			"The curfew tolls the knell of parting day,",
			"The lowing herd wind slowly o'er the lea",
			"The ploughman homeward plods his weary way,",
			"And leaves the world to darkness and to me.",
			"",
			"Now fades the glimm'ring landscape on the sight,",
			"And all the air a solemn stillness holds,",
			"Save where the beetle wheels his droning flight,",
			"And drowsy tinklings lull the distant folds;",
			"",
			"Save that from yonder ivy-mantled tow'r",
			"The moping owl does to the moon complain",
			"Of such, as wand'ring near her secret bow'r,",
			"Molest her ancient solitary reign."
		    ]};
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
	    $scope.$on('set_the_program',function(event, data){
		console.log("Set",data);
		$scope.program = data;
		$scope.editor.setValue($scope.program);
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
	    },
            'Enter': function(cm) {
                if($scope.running) $scope.step();
		else return CodeMirror.Pass
                $scope.$apply();
            },
            'Ctrl-Enter': function(cm) {
                if(!($scope.running)) $scope.run();
		else $scope.step();
                $scope.$apply();
            }
	});
    }
    $scope.toggle_lightboard = function(){
	$scope.lightboard_on = !$scope.lightboard_on;
    }
    $scope.is_valid_array = function(o) {
	return o instanceof Array || Array.isArray(o);
    }
    $scope.is_valid_string = function(o) {
	return typeof o == "string" || (typeof o == "object" && o.constructor === String);
    }
    $scope.is_valid_number = function(n){
	return !isNaN(parseFloat(n)) && isFinite(n);
    }
    $scope.initialize = function(){
	$scope.ref_display = true;
	$scope.click_callback = null;
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
	console.log("resetting");
	$scope.buttons = [];
	for(var i = 0; i < $scope.grid_cols * $scope.grid_rows; i++){
	    $scope.buttons.push({'style':{'background-color':'gray','height':'15px','width':'15px','display':'inline-block','text-align':'center','padding':'2px','border':'1px solid black','margin':'1px','cursor':'pointer','font-size':'12px','vertical-align':'top'},'content':' '});
	}
	$scope.call_stack = [];
	$scope.called_a_function = false;
	$scope.in_progress_asts = new Deque();
	$scope.line = 0;
	$scope.error_happened = false;
	$scope.status = "Program not running";
	$scope.top_level_block = new $scope.block(0, null);
	$scope.current_block = $scope.top_level_block;
	$scope.line = 0;
	$scope.remaining_steps = 0;
	$scope.steps = {"count":1};
	$scope.variables = {};
	$scope.functions = {};
	console.log("BUILTINS",$scope.builtins);
	$scope.add_builtin_function("",$scope.builtins['print']);
	$scope.add_builtin_function("",$scope.builtins['len']);
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
    $scope.add_builtin_function = function(module, fn){
	var name = module == "" ? fn.name : module + "." + fn.name;
	var f = new $scope.pyfunction(name,fn.arg_names);
	f.builtin = true;
	f.run = fn.run;
	f.wait = fn.wait;
	$scope.functions[name] = f;
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
    $scope.get_array_value = function(x,i){
	console.log("Getting",x);
	console.log("ASDASD",$scope.get_line_num());
	if(x in $scope.variables){
	    var arr = $scope.variables[x];
	    if(!($scope.is_valid_array(arr) || $scope.is_valid_string(arr))){
		$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " is not an array!");
		return;
	    }
	    return arr[i];
	}
	$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " does not exist!");
    }
    $scope.set_array_value = function(x,idx,val){
	console.log("Getting array ",x,"from",JSON.stringify($scope.variables),$scope.variables[x]);
	console.log("ASDASD",$scope.get_line_num());
	if(x in $scope.variables){
	    var arr = $scope.variables[x];
	    if(!($scope.is_valid_array(arr))){
		$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " is not an array!");
		return;
	    }
	    else if(idx >= arr.length){
		$scope.raise_error("Error: index " + idx + " in array " + x + " is past the end of the array!");
		return;
	    }
	    else arr[idx] = val;
	    return;
	}
	$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " does not exist!");
    }
    $scope.remove_array_index = function(x,idx){
	console.log("Getting array ",x,"from",JSON.stringify($scope.variables),$scope.variables[x]);
	console.log("ASDASD",$scope.get_line_num());
	if(x in $scope.variables){
	    var arr = $scope.variables[x];
	    if(!($scope.is_valid_array(arr))){
		$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " is not an array!");
		return;
	    }
	    else if(idx >= arr.length){
		$scope.raise_error("Error: index " + idx + " in array " + x + " is past the end of the array!");
		return;
	    }
	    else arr = arr.splice(idx,1);
	    return;
	}
	$scope.raise_error("Error: variable " + x + " referenced on line " + $scope.get_line_num() + " does not exist!");
    }
    $scope.get_function = function(x){
	console.log("Getting",x);
	console.log("ASDASD",$scope.get_line_num());
	if(x in $scope.functions){
	    return $scope.functions[x];
	}
	$scope.raise_error("Error: function " + x + " referenced on line " + $scope.get_line_num() + " does not exist!");
	$scope.die();
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
	if(/^[ \t]*$|^[ \t]*#/.test(inst))
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
    $scope.find_calls = function(ast){
	var calls = new Deque();
	var to_search = new Deque();
	to_search.push({"path":[],"node":ast});
	console.log("TS",JSON.stringify(to_search.state));
	while(!(to_search.is_empty())){
	    var current = to_search.pop_front();
	    if(current.node[0] == 'call'){
		calls.push(current.path.concat([0]));
	    }
	    if (current.node[0] != 'val' && current.node[0] != 'name'){
		for(var i = 1; i < current.node.length; i++){
		    to_search.push({"path":current.path.concat([i]),"node":current.node[i]});
		}
	    }
	}
	console.log("FOUND CALLS",JSON.stringify(calls.state));
	return calls;
    }
    $scope.get_call = function(call_path,ast){
	console.log("CP",JSON.stringify(call_path));
	var c = ast;
	for(var i = 0; i < call_path.length-1; i++){
	    console.log("CC",JSON.stringify(c));
	    c = c[call_path[i]];
	}
	console.log("FC",c);
	return c;
    }
    $scope.replace_call = function(call_path,ast,val){
	console.log("CP",JSON.stringify(call_path));
	var c = ast;
	for(var i = 0; i < call_path.length-1; i++){
	    console.log("CC",JSON.stringify(c));
	    c = c[call_path[i]];
	}
	c[0] = 'val';
	c[1] = val;
	console.log("FC",c);
	return c;
    }
    $scope.return_from_function = function(ret_val){
	var prev_state = $scope.call_stack.pop();
	console.log("RETURNING TO",prev_state.line,prev_state.block.parent_line,JSON.stringify(prev_state.call_path),JSON.stringify(prev_state.scope));
	$scope.current_block = prev_state.block;
	$scope.current_block.line = prev_state.line;
	$scope.variables = prev_state.scope;
	//replace the call in this ast that we just returned from with its return valuew
	$scope.replace_call(prev_state.call_path,prev_state.ast,ret_val);
	console.log(prev_state.ast);
	$scope.called_a_function = false;
	$scope.in_progress_asts.push(prev_state.ast);
	$scope.update_status();
    }
    $scope.walk_ast = function(ast){
	var calls = $scope.find_calls(ast);
	console.log("CALLS",calls.state);
	if(!(calls.is_empty())){

	    // Get the function object that we're calling

	    var call_path = calls.pop();
	    var function_call = $scope.get_call(call_path,ast);
	    var to_call = $scope.get_function(function_call[1][1]);
	    var call_waiting = true;
	    if(!to_call) return;
	    while(to_call.builtin){
		var arg_arr = $scope.walk_ast(function_call[2]);
		if(arg_arr.length != to_call.arg_names.length){
		    console.log(to_call);
		    $scope.raise_error("Function expected " + to_call.arg_names.length + " arguments and got " + arg_arr.length);
		    $scope.die();
		    return "";
		}
		var ret_val = to_call.run(arg_arr);
		if(to_call.wait){
		    var state = {
			"ast":ast,
			"call_path":call_path,
			"scope":JSON.parse(JSON.stringify($scope.variables)),
			"line":$scope.current_block.line,
			"block":$scope.current_block,
			"fn":"Line " + $scope.get_line_num() + ": " + to_call.name + "("+arg_arr.join(",")+")"
		    };
		    $scope.call_stack.push(state);
		    $scope.called_a_function = true;
		    return "";
		}
		$scope.replace_call(call_path,ast,ret_val);

		if(calls.is_empty()){
		    call_waiting = false;
		    break;
		}
		
		call_path = calls.pop();
		function_call = $scope.get_call(call_path,ast);
		to_call = $scope.get_function(function_call[1][1]);
	    }
	    if(call_waiting){
		// We have a non-builtin function to call
		
		$scope.called_a_function = true;
		
		// Set variables according to function arguments
		
		var arg_arr = $scope.walk_ast(function_call[2]);
		if(arg_arr.length != to_call.arg_names.length){
		    $scope.raise_error("Function expected " + to_call.arg_names.length + " arguments and got " + arg_arr.length);
		    $scope.die();
		    return "";
		}
	    
		// Push state onto the call stack
		var state = {
		    "ast":ast,
		    "call_path":call_path,
		    "scope":JSON.parse(JSON.stringify($scope.variables)),
		    "line":$scope.current_block.line,
		    "block":$scope.current_block,
		    "fn":"Line " + $scope.get_line_num() + ": " + to_call.name + "("+arg_arr.join(",")+")"
		};
		console.log("FNFNFN",state.fn);
		console.log(JSON.stringify(state.scope));
		$scope.call_stack.push(state);
		
		// Create new state for inside function
		
		for(var i = 0; i < to_call.arg_names.length; i++){
		    $scope.set_variable(to_call.arg_names[i],arg_arr[i]);
		}
	    
	    
		// Move to function's block
		
		
		$scope.current_block = to_call.block;
		$scope.current_block.line = 0;
		$scope.update_status();
		return "";
	    }
	}
	if(ast[0] == 'val'){
	    console.log("val",ast[1]);
	    return ast[1];
	}
	if(ast[0] == 'name'){
	    console.log("val",ast[1]);
	    return ast[1];
	}
	var args = [];
	for(var i = 1; i < ast.length; i++){
	    console.log("walking",ast[i]);
	    args.push($scope.walk_ast(ast[i]));
	}
	console.log("args",args);
	console.log("processing",ast[0]);
	return $scope.syntax_elements[ast[0]](args);
    }
    $scope.parse_expression = function(expr){
	// Parse the expression and return its value
	//return parseInt(expr, 10);
	console.log("PARSING",expr);
	var ast = $scope.in_progress_asts.pop();
	console.log("Looking for previous AST: ",ast);
	if(!expr || expr == "") return "";
	if(!ast){
	    try{
		var ast = $scope.p.parse(expr, $scope);
		console.log("and the AST is...",JSON.stringify(ast));
	    } catch(e) {
		console.log("invalid",e);
		$scope.raise_error("Expression has no valid value: " + expr);
		return;
	    }
	}
	var answer = $scope.walk_ast(ast);
	console.log("ANSWER",answer);
	if(!answer){
	    console.log("no answer");
	    if(answer == false)
		return answer;
	    if($scope.current_block.lines[$scope.current_block.line].type == "fncall")
		return "Zamboni";
	    return answer;
	}
	if(answer.error){
	    $scope.raise_error("Error: "+answer.error);
	    return;
	}
	if(!($scope.is_valid_number(answer) || $scope.is_valid_string(answer) || $scope.is_valid_array(answer) || answer == true || answer == false)){
	    console.log("invlid");
	    $scope.raise_error("Expression has no valid value: " + expr);
	    return;
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
    $scope.set_function = function(fn_name, val){
	console.log("Setting fn",fn_name, val);
	$scope.functions[fn_name] = val;
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
	"assignment":{"regex":/^([a-zA-Z_][a-zA-Z_0-9]*) *= *((?:[a-zA-Z0-9_\+\-\.\*\/%()[\], ]+|"(?:[^"\\]|\\.)*")*) *$/,"execute":function(data){
	    var val = $scope.parse_expression(data[2]);
	    if(!($scope.called_a_function))
		$scope.set_variable(data[1], val);
	}},
	"arr_assignment":{"regex":/^([a-zA-Z_][a-zA-Z_0-9]*)\[((?:[a-zA-Z0-9_\+\-\.\*\/%()[\],[\], ]+|"(?:[^"\\]|\\.)*")*)\] *= *((?:[a-zA-Z0-9_\+\-\.\*\/%()[\],[\], ]+|"(?:[^"\\]|\\.)*")*) *$/,"execute":function(data){
	    $scope.set_array_value(data[1], $scope.parse_expression(data[2]), $scope.parse_expression(data[3]));
	}},
	"if":{"regex":/^if\(((?:[a-zA-Z0-9_\+\-\.\*\/%()[\],=!>< ]+|"(?:[^"\\]|\\.)*")*)\): *$/,"execute":function(data){
	    console.log(data);
	    var test = $scope.parse_expression(data[1]);
	    console.log(test);
	    return test;
	}},
	"while":{"regex":/^while\(((?:[a-zA-Z0-9_\+\-\.\*\/%()[\],=!>< ]+|"(?:[^"\\]|\\.)*")*)\): *$/,"execute":function(data){
	    console.log(data);
	    var test = $scope.parse_expression(data[1]);
	    console.log(test);
	    return test;
	}},
	"fncall":{"regex":/^(?!return *)([a-zA-Z_][a-zA-Z_0-9\.]*)\(((?:[a-zA-Z0-9_\+\-\.\*\/%()[\], ]*|"(?:[^"\\]|\\.)*")*)\) *$/,"execute":function(data){
	    console.log("D0",data[0]);
	    $scope.parse_expression(data[0]);
	}},
	"def":{"regex":/^def ([a-zA-Z_][a-zA-Z_0-9]*)\(((?:[a-zA-Z_][a-zA-Z_0-9]*(?:, *)?)*)\): *$/,"execute":function(data){
	}},
	"return":{"regex":/^return *([a-zA-Z0-9_\+\-\.\*\/%()[\]," ]*)$/,"execute":function(data){
	    console.log("D1",JSON.stringify(data[1]));
	    return $scope.parse_expression(data[1]);
	}},
	"else":{"regex":/^else: *$/,"execute":function(data){}},
	"del":{"regex":/^del *([a-zA-Z_][a-zA-Z_0-9]*)\[([a-zA-Z0-9_\+\-\.\*\/%()[\]," ]*)\]$/,"execute":function(data){
	    var idx = $scope.parse_expression(data[2]);
	    if(!($scope.called_a_function))
		$scope.remove_array_index(data[1],idx);
	}},
	"import":{"regex":/^import *([a-zA-Z_][a-zA-Z_0-9]*)$/,"execute":function(data){
	    if(data[1] in $scope.imports){
		var fns = $scope.imports[data[1]]
		for(var i = 0; i < fns.length; i++){
		    $scope.add_builtin_function(data[1],fns[i]);
		}
	    }
	    else{
		$scope.raise_error("No such module to import: " + data[1]);
		$scope.die();
	    }
	}}
    }
    $scope.syntax = {
	"expression":{"verify":/ */,"parse":function(){return true;}},
	"test":{"regex":/ */},
    };
    $scope.pyfunction = function(name, arg_names, block){
	this.name = name;
	this.arg_names = arg_names;
	this.block = block;
	this.builtin = false;
    }
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
		var val = inst.run();
		if($scope.called_a_function){
		    $scope.called_a_function = false;
		    console.log("if postponed");
		    return;
		}
		if(val){
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
		var val = inst.run();
		if($scope.called_a_function){
		    $scope.called_a_function = false;
		    console.log("while postponed");
		    return;
		}
		if(val) $scope.current_block = inst.block;
		else self.advance();
		$scope.update_status();
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
	    else if(inst.type == 'return'){
		if($scope.call_stack.length == 0){
		    $scope.raise_error("Syntax error: cannot return from outside a function");
		    $scope.die();
		}
		var ret_val = inst.run();
		if($scope.called_a_function){
		    $scope.called_a_function = false;
		    return;
		}
		console.log(ret_val);
		$scope.return_from_function(ret_val);
		// do something
	    }
	    else if(inst.type == 'def'){
		console.log("DEF",inst.data);
		var arg_names = [];
		var arg_matches = inst.data[2].match(/[a-zA-Z_][a-zA-Z_0-9]*/g) || [];
		console.log("ARM",arg_matches);
		for(var i = 0; i < arg_matches.length; i++)
		    arg_names.push(arg_matches[i]);
		$scope.set_function(inst.data[1], new $scope.pyfunction(inst.data[1],arg_names,inst.block));
		self.advance();
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
	    if($scope.called_a_function){
		console.log("CAFF");
		$scope.called_a_function = false;
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
		    $scope.current_block = self.parent_block;
		    var val = self.parent_line.run();
		    if($scope.called_a_function){
			$scope.called_a_function = false;
			console.log("repeat postponed");
			return;
		    }
		    if(val){
			console.log("repeating");
			$scope.current_block = $scope.current_block.lines[$scope.current_block.line].block;
		    }
		    else{
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
    $scope.run_all = function(){
	console.log("GOING");
	$scope.steps.count = 10000;
	$scope.step();
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
	    if(inst.indent_level > 0 && inst.type == "def"){
		$scope.status = "Error at line "+(l+1)+": def may not be used inside a block";
		$scope.set_error_line(l);
		return;
	    }
	    if(inst.indent_level == current_level+1){
		if(prev_inst == null || (prev_inst.type != 'if' && prev_inst.type != 'else' && prev_inst.type != 'while' && prev_inst.type != 'def')){
		    $scope.status = "Error at line "+(l+1)+": indented lines may only follow if, else, while, or def";
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
	$scope.status = $scope.error_message;
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

