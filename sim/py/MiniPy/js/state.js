// [MiniPy] /site/js/state.js

var State = (function(scopeElementList, stdoutElementList) {
	var knownVariables = {};

	var printTemplate = '<li>{value}<span class="origin">{line}</span></li>';
	var variableTemplate = '<li data-identifier="{identifier}"><span class="identifier">{identifier}</span>{value}</li>';
	var valueTemplate = '<span class="{type}">{value}</span>';
	var punctuationTemplate = '<span class="punctuation">{symbol}</span>';
	var scopeTemplate = '<li class="scope"><span class="function-declaration">{declaration}</span><ul>{variables}</ul></li>';

	function renderPunctuation(symbol) {
		return punctuationTemplate.replace('{symbol}', symbol);
	}

	function renderValue(value) {
		if (value instanceof Array) {
			// array
			var leftBracket = renderPunctuation('[');
			var rightBracket = renderPunctuation(']');
			var comma = renderPunctuation(',');

			// convert array of values into array of HTML strings
			var elementsHtmlStrings = value.map(function(elementValue) {
				return renderValue(elementValue);
			});

			// join array element HTML strings into large string separated
			// by commas
			return leftBracket + elementsHtmlStrings.join(comma) + rightBracket;
		} else {
			// literal value
			return valueTemplate.replace('{type}', typeof value).replace('{value}', value.toString());
		}
	}

	function renderFunctionDeclaration(name, args) {
		return 'def ' + name + '(' + args.join(', ') + ')';
	}

	function renderScope(scope) {
		var variablesHtml = Object.keys(scope.variables || {}).reduce(function(html, identifier) {
			var value = scope.variables[identifier];

			if (value.args instanceof Array) {
				// function, ignore
				return html;
			} else {
				return html + variableTemplate
					.replace('{identifier}', identifier)
					.replace('{identifier}', identifier)
					.replace('{value}', '<span class="value">' + renderValue(value) + '</span>');
			}
		}, '');

		if (scope.subscope !== undefined) {
			var subscopeHtml = renderScope(scope.subscope);
		} else {
			var subscopeHtml = '';
		}

		if (scope.name !== undefined && scope.args instanceof Array) {
			return scopeTemplate
				.replace('{declaration}', renderFunctionDeclaration(scope.name, scope.args))
				.replace('{variables}', variablesHtml + subscopeHtml);
		} else {
			return variablesHtml + subscopeHtml;
		}
	}

	function update(scope) {
		scopeElementList.html(renderScope(scope));
	}

	function clearMutationHalo() {
		scopeElementList.children('.mutating').removeClass('mutating');
		stdoutElementList.children('.mutating').removeClass('mutating');
	}

	function printOut(results) {
		var valueHTML = renderValue(results.arguments[0]);

		var html = printTemplate
			.replace('{type}', 'line')
			.replace('{value}', '<span class="value">' + valueHTML + '</span>')
			// switch from 0-based line count (MiniPy) to 1-based (visual editor)
			.replace('{line}', results.from + 1);

		var println = $(html).appendTo(stdoutElementList);

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
		update: update,
		clearMutationHalo: clearMutationHalo,
		printOut: printOut,
		reset: reset,
	};
});
