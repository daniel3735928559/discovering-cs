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
	prompt_number: function() {
		var possibleNumber = parseFloat(prompt('Enter a number:'));

		if (isNaN(possibleNumber)) {
			return 0;
		} else {
			return possibleNumber;
		}
	},

	prompt_string: function() {
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
			var enabled = ['run', 'validate', 'step'];
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

	buttons['run'].click(buttonCommand('run'));
	buttons['validate'].click(buttonCommand('validate'));
	buttons['step'].click(buttonCommand('step'));
	buttons['stop'].click(buttonCommand('stop'));

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
				enable: 'stop',
				disable: ['run', 'validate', 'step'],
			});

			StateHandler.reset();
			lockEditor();

			var runHooks = {
				print: function() {
					var printExpression = this;
					var printArguments = [];

					for (var i = 0, l = arguments.length; i < l; i++) {
						printArguments.push(arguments[i]);
					}

					StateHandler.printOut({
						arguments: printArguments,
						from: printExpression.line,
						announceMutation: false,
					});
				},

				assign: function(identifier, value) {
					if (StateHandler.hasVariable(identifier) === true) {
						StateHandler.updateVariable({
							identifier: identifier,
							value: value,
							announceMutation: false,
						});
					} else {
						StateHandler.createVariable({
							identifier: identifier,
							value: value,
							announceMutation: false,
						});
					}
				},

				exit: function() {
					BannerHandler.show({
						type: BannerHandler.GENERIC,
						message: 'Program finished',
					});
				},
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
			disable: ['run', 'validate', 'step', 'stop'],
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

		enableButtons({
			enable: ['run', 'validate', 'step'],
		});
	});

	function startStepping() {
		enableButtons({
			enable: ['step', 'stop'],
			disable: ['run', 'validate'],
		});

		StateHandler.reset();
		lockEditor();

		var stepHooks = {
			print: function() {
				var printExpression = this;
				var printArguments = [];

				for (var i = 0, l = arguments.length; i < l; i++) {
					printArguments.push(arguments[i]);
				}

				StateHandler.printOut({
					arguments: printArguments,
					from: printExpression.line,
				});
			},

			assign: function(identifier, value) {
				if (StateHandler.hasVariable(identifier) === true) {
					StateHandler.updateVariable({
						identifier: identifier,
						value: value,
					});
				} else {
					StateHandler.createVariable({
						identifier: identifier,
						value: value,
					});
				}
			},

			exit: function() {
				enableButtons({
					enable: ['run', 'validate', 'step'],
					disable: 'stop',
				});

				unlockEditor();
				highlightLine(null);

				BannerHandler.show({
					type: BannerHandler.GENERIC,
					message: 'Program finished',
				});

				when('step', startStepping);
				alert('Program finished');
			},
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
			ErrorHandler.post(error);
		}

		if (expression !== null) {
			highlightLine(expression.line);
		}
	}

	when('step', startStepping);

	when('stop', function() {
		enableButtons({
			enable: ['run', 'validate', 'step'],
			disable: 'stop',
		});

		unlockEditor();
		highlightLine(null);

		BannerHandler.show({
			type: BannerHandler.GENERIC,
			message: 'User exited program',
		});

		when('step', startStepping);

		StateHandler.clearMutationHalo();
	});

	// bind general shortcuts
	mirror.setOption('extraKeys', {
		'Esc': function() {
			mirror.getInputField().blur();
		},
	});
}(cm));
