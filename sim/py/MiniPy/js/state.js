// [MiniPy] /site/js/state.js

var State = (function(scopeElementList, stdoutElementList) {
	var knownVariables = {};

	var variableTemplate = '<li data-identifier={identifier}><span class="identifier">{identifier}</span>{value}</li>';
	var printTemplate = '<li>{value}<span class="origin">{line}</span></li>';

	var valueTemplate = '<span class="value {type}">{value}</span>';

	function valueToHTML(value, reverse) {
		// defaults to `false`
		reverse = (reverse === true);

		if (value instanceof Array) {
			// arrays
			var rightBracket = '<span class="value punctuation">]</span>';

			var elements = value.map(function (element) {
				return valueToHTML(element.value);
			});

			if (reverse === true) {
				elements.reverse();
			}

			var elementsHTML = elements.join('<span class="value punctuation">,</span>');

			var leftBracket = '<span class="value punctuation">[</span>';

			if (reverse === true) {
				// elements are reversed in order so that when CSS property `float: right`
				// is applied they will be in the correct order
				var html = rightBracket + elementsHTML + leftBracket;
			} else {
				var html = leftBracket + elementsHTML + rightBracket;
			}
		} else {
			// single values
			var html = valueTemplate
				.replace('{type}', typeof value)
				.replace('{value}', value.toString());
		}

		return html;
	}

	function hasVariable(identifier) {
		return (knownVariables[identifier] === true);
	}

	function updateVariable(variable) {
		var variableElem = scopeElementList.children('[data-identifier="' + variable.identifier.toString() + '"]');

		if (variable.announceMutation !== false) {
			// give modified variable element a mutation halo
			scopeElementList.children('.mutating').removeClass('mutating');
			variableElem.addClass('mutating');
		}

		var newType = typeof variable.value;
		var newValue = variable.value.toString();

		// update DOM with new values
		variableElem
			.removeClass('number string boolean')
			.addClass(newType)
			.children('.value').text(newValue);
	}

	function createVariable(variable) {
		// add identifier to list of known variables
		knownVariables[variable.identifier.toString()] = true;

		var reverse = true;
		var valueHTML = valueToHTML(variable.value.value, reverse);

		var html = variableTemplate
			.replace('{identifier}', variable.identifier)
			.replace('{identifier}', variable.identifier)
			.replace('{value}', valueHTML);

		// add to DOM
		var variableElem = $(html).appendTo(scopeElementList);

		if (variable.announceMutation !== false) {
			// give new variable element a mutation halo
			scopeElementList.children('.mutating').removeClass('mutating');
			variableElem.addClass('mutating');
		}
	}

	function clearMutationHalo() {
		scopeElementList.children('.mutating').removeClass('mutating');
		stdoutElementList.children('.mutating').removeClass('mutating');
	}

	function printOut(results) {
		console.log(results);
		var valueHTML = valueToHTML(results.arguments[0]);

		var html = printTemplate
			.replace('{type}', 'line')
			.replace('{value}', valueHTML)
			// switch from 0-based line count (MiniPy) to 1-based (visual editor)
			.replace('{line}', results.from + 1);

		var println = $(html).prependTo(stdoutElementList);

		if (results.announceMutation !== false) {
			// give printed line element a mutation halo
			stdoutElementList.children('.mutating').removeClass('mutating');
			println.addClass('mutating');
		}
	}

	function reset() {
		knownVariables = {};
		scopeElementList.empty();
		stdoutElementList.empty();
	}

	return {
		hasVariable: hasVariable,
		updateVariable: updateVariable,
		createVariable: createVariable,
		clearMutationHalo: clearMutationHalo,
		printOut: printOut,
		reset: reset,
	};
});
