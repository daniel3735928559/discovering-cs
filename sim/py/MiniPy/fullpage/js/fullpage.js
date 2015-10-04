// [MiniPy] /site/js/app.js

var cm = CodeMirror(document.querySelector('.mp-editor'), {
	mode: 'python',
	theme: 'neat',

	lineNumbers: true,
	indentUnit: 4,
	smartIndent: false,
	tabSize: 4,
	indentWithTabs: true,
	electricChars: false,
});

var defaultPythonGlobals = {
	len: {
		args: {
			0: ['array', 'string'],
		},
		fn: function(value) {
			return value.length;
		},
	},

	str: {
		args: {
			0: ['boolean', 'number', 'string'],
		},
		fn: function(value) {
			if (typeof value === 'boolean') {
				// handle special conversion of booleans to strings
				// Python expects capitalization of first character
				if (value === true) {
					return 'True';
				} else {
					return 'False';
				}
			} else {
				return value.toString();
			}
		},
	},

	input_num: function() {
		var possibleNumber = parseFloat(prompt('Enter a number:'));

		if (isNaN(possibleNumber)) {
			return 0;
		} else {
			return possibleNumber;
		}
	},

	input_string: function() {
		return prompt('Enter a string:');
	},
};

(function(mirror) {
	var commands = {};
	var buttons = {};

	function buttonCommand(which) {
		return function() {
			if ($(buttons[which]).hasClass('mp-button-disabled') === false) {
				// button was not disabled when clicked
				commands[which].apply({});
			}
		};
	}

	function enableButtons(options) {
		if (options) {
			var enabled = options.enable || null;
			var disabled = options.disable || null;
		} else {
			var enabled = ['run', 'validate', 'step', 'reset'];
			var disabled = ['stop'];
		}

		if (enabled instanceof Array) {
			for (var i = 0, l = enabled.length; i < l; i++) {
				if (buttons[enabled[i]]) {
					buttons[enabled[i]].removeClass('mp-button-disabled');
				}
			}
		} else if (typeof enabled === 'string') {
			if (buttons[enabled]) {
				buttons[enabled].removeClass('mp-button-disabled');
			}
		}

		if (disabled instanceof Array) {
			for (var i = 0, l = disabled.length; i < l; i++) {
				if (buttons[disabled[i]]) {
					buttons[disabled[i]].addClass('mp-button-disabled');
				}
			}
		} else if (typeof disabled === 'string') {
			if (buttons[disabled]) {
				buttons[disabled].addClass('mp-button-disabled');
			}
		}
	}

	function when(command, fn) {
		commands[command] = fn;
	}

	var BannerHandler = Banner(jQuery('.mp-editor'));
	var ErrorHandler = ErrorControl(mirror, BannerHandler);
	var StateHandler = State(jQuery('.mp-scope ul'), jQuery('.mp-stdout ul'))

	// attach command button events
	buttons['run'] = $('.mp-control-button[data-command="run"]');
	buttons['validate'] = $('.mp-control-button[data-command="validate"]');
	buttons['step'] = $('.mp-control-button[data-command="step"]');
	buttons['stop'] = $('.mp-control-button[data-command="stop"]');
	buttons['reset'] = $('.mp-control-button[data-command="reset"]');

	buttons['run'].click(buttonCommand('run'));
	buttons['validate'].click(buttonCommand('validate'));
	buttons['step'].click(buttonCommand('step'));
	buttons['stop'].click(buttonCommand('stop'));
	buttons['reset'].click(buttonCommand('reset'));

	var highlightLine = (function() {
		var markedLine = null;

		return function(line) {
			if (line === null && markedLine !== null) {
				markedLine.clear();
				return;
			}

			if (typeof line === 'number') {
				if (markedLine !== null) {
					markedLine.clear();
					markedLine = null;
				}

				var linePlainText = mirror.getLine(line);
				var leadingWhitespaceWidth = linePlainText.match(/^\s+/) || 0;

				if (leadingWhitespaceWidth !== null && leadingWhitespaceWidth[0]) {
					leadingWhitespaceWidth = leadingWhitespaceWidth[0].length;
				}

				markedLine = mirror.markText({
					line: line,
					ch: leadingWhitespaceWidth,
				}, {
					line: line,
					ch: linePlainText.length,
				}, {
					className: 'mp-active-line',
					startStyle: 'mp-active-line-left',
					endStyle: 'mp-active-line-right',
				});
			}
		};
	}());

	function lockEditor() {
		$('.mp-editor').addClass('locked');
		mirror.setOption('readOnly', 'nocursor');
	}

	function unlockEditor() {
		$('.mp-editor').removeClass('locked');
		mirror.setOption('readOnly', false);
	}

	function getScript() {
		return mirror.getValue();
	}

	function isValid(script) {
		return MiniPy.validate(mirror.getValue(), {
			globals: defaultPythonGlobals,
		});
	}

	when('run', function() {
		var validity = isValid(getScript());

		if (validity === true) {
			// script SYNTAX is valid, enter run state
			enableButtons({
				enable: ['stop', 'reset'],
				disable: ['run', 'validate', 'step'],
			});

			StateHandler.reset();
			lockEditor();

			var runHooks = {
				exit: function(scope) {
					// after execution is done, display final scope state
					StateHandler.update(scope);

					BannerHandler.show({
						type: BannerHandler.GENERIC,
						message: 'Program finished',
					});
				},
			};

			var runGlobals = defaultPythonGlobals;
			runGlobals.print = function() {
				var printArguments = [];

				// build array of print arguments
				for (var i = 0, l = arguments.length; i < l; i++) {
					printArguments.push(arguments[i]);
				}

				StateHandler.printOut({
					arguments: printArguments,
					from: this.line,
					announceMutation: false,
				});
			};

			try {
				MiniPy.run(getScript(), {
					globals: defaultPythonGlobals,
					hooks: runHooks,
				});
			} catch (error) {
				// script has syntax, logic, or runtime errors
				ErrorHandler.post(error);
			}

			// leave run state
			enableButtons();
			unlockEditor();
		} else {
			// script has syntax errors
			ErrorHandler.post(validity);
		}
	});

	when('validate', function() {
		enableButtons({
			disable: ['run', 'validate', 'step', 'stop', 'reset'],
		});

		var validity = isValid(getScript());

		if (validity === true) {
			BannerHandler.show({
				type: BannerHandler.OK,
				message: 'Valid syntax',
			});
		} else {
			ErrorHandler.post(validity);
		}

		enableButtons();
	});

	function startStepping() {
		enableButtons({
			enable: ['step', 'stop', 'reset'],
			disable: ['run', 'validate'],
		});

		StateHandler.reset();
		lockEditor();

		var stepHooks = {
			scope: function(scope) {
				StateHandler.update(scope, false);
			},

			exit: function() {
				enableButtons();

				unlockEditor();
				highlightLine(null);

				BannerHandler.show({
					type: BannerHandler.GENERIC,
					message: 'Program finished',
				});

				when('step', startStepping);
			},
		};

		var interpretGlobals = defaultPythonGlobals;
		interpretGlobals.print = function() {
			var printArguments = [];

			// build array of print arguments
			for (var i = 0, l = arguments.length; i < l; i++) {
				printArguments.push(arguments[i]);
			}

			StateHandler.printOut({
				arguments: printArguments,
				from: this.line,
				announceMutation: true,
			});
		};

		var inspector = MiniPy.inspect(getScript(), {
			globals: defaultPythonGlobals,
			hooks: stepHooks,
		});

		// first step
		step(inspector);

		// future steps
		when('step', step.bind(step, inspector));
	}

	function step(inspector) {
		var expression = null;

		StateHandler.clearMutationHalo();

		try {
			expression = inspector.next();
		} catch (err) {
			// script has syntax, logic, or runtime errors
			ErrorHandler.post(err);
		}

		if (expression !== null) {
			highlightLine(expression.range.start.line);
		}
	}

	when('step', startStepping);

	when('stop', function() {
		enableButtons();

		unlockEditor();
		highlightLine(null);

		BannerHandler.show({
			type: BannerHandler.GENERIC,
			message: 'User exited program',
		});

		when('step', startStepping);

		StateHandler.clearMutationHalo();
	});

	when('reset', function() {
		enableButtons();

		StateHandler.reset();
		unlockEditor();

		if (typeof globalDefaultScript === 'undefined' || typeof globalDefaultScript !== 'string') {
			mirror.setValue('');
		} else {
			mirror.setValue(globalDefaultScript);
		}
	});

	// bind general shortcuts
	mirror.setOption('extraKeys', {
		'Esc': function() {
			mirror.getInputField().blur();
		},
	});
}(cm));
