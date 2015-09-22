// [MiniPy] /site/js/state.js

var State = (function(scopeElementList, stdoutElementList) {
	var knownVariables = {};

	var variableTemplate = '<li data-identifier={identifier}><span class="identifier">{identifier}</span><span class="value {type}">{value}</span></li>';
	var printTemplate = '<li><span class="value {type}">{output}</span><span class="origin">{line}</span></li>';

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

		var html = variableTemplate
			.replace('{identifier}', variable.identifier)
			.replace('{identifier}', variable.identifier)
			.replace('{type}', typeof variable.value)
			.replace('{value}', variable.value.toString());

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
		// TODO: only prints one print argument currently
		var value = results.arguments[0];

		var html = printTemplate
			.replace('{type}', typeof value)
			.replace('{output}', value.toString())
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
