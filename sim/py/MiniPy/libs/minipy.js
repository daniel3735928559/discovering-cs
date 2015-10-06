// MiniPy.js v1.4.0

(function(root) {
	var exports = {};

	var moduleAliasNameMap = {
		error: 'MiniPyError',
		range: 'Range',
		enums: 'enums',
		scanner: 'Scanner',
		token: 'Token',
		lexer: 'Lexer',
		parser: 'Parser',
		scope: 'Scope',
		types: 'Type',
		interpreter: 'Interpreter',
	};

	function require(path) {
		var moduleAlias = path.match(/[a-z]+$/i);

		if (moduleAlias === null) {
			throw new Error('No module at location "' + path + '"');
		} else {
			var moduleName = moduleAliasNameMap[moduleAlias[0].toLowerCase()];

			if (moduleName === undefined) {
				throw new Error('No module with name "' + moduleAlias + '"');
			}

			var obj = {};
			obj[moduleName] = exports[moduleName];

			return obj;
		}
	}


	// [MiniPy] /src/enums.js

	exports.enums = {
		ErrorType: {
			UNKNOWN_ERROR: 0,

			// compile-time errors
			UNEXPECTED_CHARACTER: 1,
			UNEXPECTED_TOKEN: 2,
			UNEXPECTED_EOF: 3,
			BAD_INDENTATION: 4,

			// runtime errors
			UNDEFINED_VARIABLE: 10,
			TYPE_VIOLATION: 11,
			EXECUTION_TIMEOUT: 12,
			UNKNOWN_OPERATION: 13,
			OUT_OF_BOUNDS: 14,
			DIVIDE_BY_ZERO: 15,
			ILLEGAL_STATEMENT: 16,
		},

		TokenType: {
			EOF: 'EOF',

			// whitespace
			NEWLINE: 'Newline',
			INDENT: 'Indent',
			DEDENT: 'Dedent',

			// syntactic symbols
			PUNCTUATOR: 'Punctuator',
			KEYWORD: 'Keyword',
			IDENTIFIER: 'Identifier',

			// literals
			BOOLEAN: 'Boolean',
			STRING: 'String',
			NUMBER: 'Number',
		},

		ValueType: {
			NONE: 'None',
			BOOLEAN: 'Boolean',
			NUMBER: 'Number',
			STRING: 'String',
			ARRAY: 'Array',
			FUNCTION: 'Function',
		},
	};


	// [MiniPy] /src/error/range.js

	exports.Range = (function(programSource) {
		var MiniPyError = require('./error').MiniPyError;

		function Range(start, end) {
			this.start = start || {
					line: null,
					column: null,
			};

			this.end = end || {
					line: null,
					column: null,
			};

			if (start && end && start.line && end.line) {
				this.multiline = (end.line > start.line);
			} else {
				this.multiline = false;
			}
		}

		Range.prototype.open = function(line, column) {
			this.start.line = (typeof line === 'number' && line >= 0 ? line : null);
			this.start.column = (typeof column === 'number' && column >= 0 ? column : null);

			return this;
		};

		Range.prototype.close = function(line, column) {
			this.end.line = (typeof line === 'number' && line >= 0 ? line : null);
			this.end.column = (typeof column === 'number' && column >= 0 ? column : null);

			this.multiline = (this.end.line > this.start.line);

			return this;
		};

		Range.prototype.union = function(secondRange) {
			return new Range(this.start, secondRange.end);
		};

		Range.prototype.error = function(details) {
			return new MiniPyError(programSource, {
				type: details.type,
				message: details.message,
				from: this.start,
				to: this.end,
			});
		};

		return {
			create: function(startLine, startColumn, endLine, endColumn) {
				return new Range({
					line: startLine,
					column: startColumn,
				}, {
					line: endLine,
					column: endColumn,
				});
			},

			open: function(line, column) {
				var r = new Range();
				return r.open(line, column);
			},
		};
	});


	// [MiniPy] /src/error/error.js

	exports.MiniPyError = (function() {
		// given a string `ch` and a number `n`, return a new string
		// with `ch` repeated `n` times
		function multiplyChar(ch, n) {
			var out = '';

			while (n-- > 0) {
				out += ch;
			}

			return out;
		}

		function MiniPyError(source, details) {
			this.source = source;
			this.type = details.type || 0;
			this.message = details.message || '';

			this.from = details.from || undefined;
			this.to = details.to || undefined;
		}

		MiniPyError.prototype.toString = function() {
			var self = this;
			var tab = '    ';

			var message = [];

			if (this.to && this.to.line > this.from.line) {
				// TODO: currently will print every line of source code both
				// those lines in error that those that aren't. in the future
				// there should be a few valid lines above and below the erroneous
				// lines to give context but certainly not the entire program
				var lines = this.source.split('\n');

				message.push('Error on lines ' + (this.from.line + 1) + ' through ' + (this.to.line + 1) + ': ' + this.message);

				message.push(lines.map(function(line, index) {
					if (index >= self.from.line && index <= self.to.line) {
						return '-' + line.replace(/\t/g, tab);
					} else {
						return '+' + line.replace(/\t/g, tab);
					}
				}).join('\n'));
			} else {
				var line = this.source.split('\n')[this.from.line];

				var paddingWidth = line.substring(0, this.from.column).replace(/\t/g, tab).length;
				var padding = multiplyChar('_', paddingWidth);

				// var underlineWidth = line.substring(0, this.to.column || line.length).replace(/\t/g, tab).length - paddingWidth;
				var underlineWidth = this.to.column - this.from.column;
				var underline = multiplyChar('^', underlineWidth);

				message.push('Error on line ' + (this.from.line + 1) + ': ' + this.message);

				message.push(line.replace(/\t/g, tab));
				message.push(padding + underline);
			}

			return message.join('\n') + '\n';
		};

		return MiniPyError;
	}());


	// [MiniPy] /src/parser/Scanner.js

	exports.Scanner = (function() {
		var MiniPyError = require('../error/error').MiniPyError;

		function Scanner(input) {
			this.line = 0;
			this.column = 0;
			this.nextIndex = 0;
			this.input = input;
		}

		Scanner.prototype.peek = function() {
			if (this.nextIndex < this.input.length) {
				// return next character from input WITHOUT incrementing next index
				var peekChar = this.input[this.nextIndex];
				return peekChar;
			} else {
				return null;
			}
		};

		Scanner.prototype.next = function() {
			if (this.nextIndex < this.input.length) {
				// return next character from input and increment next index
				var nextChar = this.input[this.nextIndex];
				this.nextIndex++;

				if (nextChar === '\n') {
					this.line++;
					this.column = 0;
				} else {
					this.column++;
				}

				return nextChar;
			} else {
				return null;
			}
		};

		Scanner.prototype.EOF = function() {
			return (this.nextIndex >= this.input.length);
		};

		Scanner.prototype.error = function(details) {
			return new MiniPyError(this.input, details);
		};

		return Scanner;
	}());


	// [MiniPy] /src/parser/Token.js

	exports.Token = (function() {
		var ErrorType = require('../enums').enums.ErrorType;
		var TokenType = require('../enums').enums.TokenType;

		function Token(lexer, type, value, range) {
			this.lexer = lexer;
			this.type = type;
			this.value = value;
			this.range = range;
		}

		Token.prototype.getValue = function() {
			if (this.value !== null) {
				return this.value;
			} else {
				return this.type;
			}
		};

		Token.prototype.getLength = function() {
			if (this.value !== null) {
				return this.value.toString().length;
			} else {
				// for Indents and Dedents
				return 0;
			}
		};

		Token.prototype.error = function(details) {
			return this.lexer.error({
				type: details.type,
				message: details.message,
				from: details.from || this.range.start,
				to: details.to || this.range.end,
			});
		};

		return Token;
	}());


	// [MiniPy] /src/parser/Lexer.js

	exports.Lexer = (function() {
		var ErrorType = require('../enums').enums.ErrorType;
		var TokenType = require('../enums').enums.TokenType;

		var Token = require('./token').Token;

		function Lexer(scanner) {
			var self = this;
			var RangeBuilder = require('../error/range').Range(scanner.input);

			var prefixOperatorCharacters = '=<>+-*/&|%^~!';
			var suffixOperatorCharacters = '=<>+-*/&|';
			var punctuationCharacters = ',:()[]{}';

			var keywords = [
				'as',
				'assert',
				'break',
				'class',
				'continue',
				'def',
				'del',
				'elif',
				'else',
				'except',
				'exec',
				'finally',
				'for',
				'from',
				'global',
				'if',
				'import',
				'in',
				'lambda',
				'pass',
				// 'print',
				'raise',
				'return',
				'try',
				'while',
				'with',
				'yield',
			];

			var keywordOperators = [
				'and',
				'is',
				'not',
				'or',
			];

			function isKeywordOperator(test) {
				return keywordOperators.indexOf(test) >= 0;
			}

			function isKeyword(test) {
				return keywords.indexOf(test) >= 0;
			}

			function isWhitespace(test) {
				return (test <= ' ') && !isNull(test);
			}

			function isNewline(test) {
				return ('\n' === test);
			}

			function isTab(test) {
				return ('\t' === test);
			}

			function isNull(test) {
				return (test === null);
			}

			function isAlpha(test) {
				return ((test >= 'a' && test <= 'z') || (test >= 'A' && test <= 'Z')) && !isNull(test);
			}

			function isNumeric(test) {
				return (test >= '0' && test <= '9') && !isNull(test);
			}

			function isBooleanLiteral(test) {
				return (test === 'True' || test === 'False');
			}

			function isCommentStart(test) {
				return (test === '#');
			}

			function contains(str, test) {
				return (str.indexOf(test) >= 0);
			}

			function consumeComment(sc) {
				var p;

				while (true) {
					p = sc.peek();

					if (isNull(p) || isNewline(p)) {
						break;
					} else {
						sc.next();
					}
				}

				// emit Newline token
				var prevLine = sc.line;
				var prevColumn = sc.column;
				pushToken(new Token(self, TokenType.NEWLINE, sc.next(), RangeBuilder.create(prevLine, prevColumn, prevLine, prevColumn + 1)));
			}

			var tokenBuffer = [];
			var state = {
				indent: 0,
				hasPassedFirstLine: false,
			};

			function pushToken(token) {
				var prev = tokenBuffer[tokenBuffer.length - 1];

				if (!((prev && prev.type === TokenType.NEWLINE) && token.type === TokenType.NEWLINE)) {
					tokenBuffer.push(token);
				}
			}

			function nextToken() {
				if (scanner.EOF() === true) {
					if (state.indent > 0) {
						// emit Newline token
						var prevLine = scanner.line;
						var prevColumn = scanner.column;
						pushToken(new Token(self, TokenType.NEWLINE, null, RangeBuilder.create(prevLine, prevColumn, prevLine, prevColumn + 1)));

						while (state.indent > 0) {
							state.indent -= 1;
							pushToken(new Token(self, TokenType.DEDENT, null, RangeBuilder.create(scanner.line, scanner.column, scanner.line, scanner.column + 1)));
						}
					}

					pushToken(new Token(self, TokenType.EOF, null, RangeBuilder.create(scanner.line, scanner.column, scanner.line, scanner.column + 1)));
					return false;
				} else {
					var p = scanner.peek();

					if (isNewline(p)) {
						// emit Newline token
						var prevLine = scanner.line;
						var prevColumn = scanner.column;
						pushToken(new Token(self, TokenType.NEWLINE, scanner.next(), RangeBuilder.create(prevLine, prevColumn, prevLine, prevColumn + 1)));

						var currLineIndent = 0;
						var range = RangeBuilder.open(scanner.line, 0);

						while (true) {
							p = scanner.peek();

							if (isNewline(p)) {
								// emit Newline token
								var prevLine = scanner.line;
								var prevColumn = scanner.column;
								pushToken(new Token(self, TokenType.NEWLINE, scanner.next(), RangeBuilder.create(prevLine, prevColumn, prevLine, prevColumn + 1)));

								// reset indentation counters
								currLineIndent = 0;
								range = RangeBuilder.open(scanner.line, 0);
							} else if (isWhitespace(p)) {
								// collect all indentation first
								var pureTabIndentation = true;

								while (isWhitespace(p = scanner.peek()) && !isNewline(p)) {
									if (!isTab(p)) {
										pureTabIndentation = false;
									}

									scanner.next();
									currLineIndent += 1;
								}

								if (isNewline(p) || isNull(p)) {
									// an upcoming newline or EOF means that this line was only
									// filled with whitespace so return the next token
									// and ignore this line
									break;
								} else if (isCommentStart(p)) {
									// consume comments that begin after indentation
									consumeComment(scanner);

									// reset indentation counters
									currLineIndent = 0;
									range = RangeBuilder.open(scanner.line, 0);
								} else {
									// handle non-empty line
									if (pureTabIndentation === true) {
										if (state.hasPassedFirstLine === false) {
											// first semantically significant line is
											// indented, throw an error
											throw range.close(scanner.line, scanner.column).error({
												type: ErrorType.BAD_INDENTATION,
												message: 'First line cannot be indented',
											});
										} else {
											if (currLineIndent > state.indent) {
												if (currLineIndent === state.indent + 1) {
													// current line increases level of indentation by 1
													state.indent += 1;
													pushToken(new Token(self, TokenType.INDENT, null, RangeBuilder.create(scanner.line, 0, scanner.line, currLineIndent)));
												} else {
													// current line increases by more than 1 level of
													// indentation, throw error
													throw range.close(scanner.line, scanner.column).error({
														type: ErrorType.BAD_INDENTATION,
														message: 'Too much indentation',
													});
												}
											} else if (currLineIndent < state.indent) {
												// current line has less indentation than previous lines
												// emit dedent tokens until fully resolved
												while (state.indent > currLineIndent) {
													state.indent -= 1;
													pushToken(new Token(self, TokenType.DEDENT, null, RangeBuilder.create(scanner.line, 0, scanner.line, currLineIndent)));
												}
											}
										}
									} else {
										// the next token is non-whitespace meaning this line
										// uses illegal whitespace characters in its indentation
										// TODO: currently entire indentation is flagged in error, consider
										// changing to only first flag illegal character?
										throw range.close(scanner.line, scanner.column).error({
											type: ErrorType.BAD_INDENTATION,
											message: 'Bad indentation; indent can only be composed of tab characters',
											from: {
												line: scanner.line,
											},
										});
									}
								}
							} else if (isCommentStart(p)) {
								// consume comments that begin after a newline
								consumeComment(scanner);

								// reset indentation counters
								currLineIndent = 0;
								range = RangeBuilder.open(scanner.line, 0);
							} else {
								// line starts with a non-whitespace token
								// deal with dedents when appropriate

								if (state.indent === -1 && !isCommentStart(p)) {
									// since this line has 0-level indentation (and is not
									// a comment) set indent counter to 0 to permit 1+ level
									// indentation in the future
									state.indent = 0;
								}

								if (state.indent > currLineIndent) {
									// dedent 1 or more lines
									while (state.indent > currLineIndent) {
										state.indent -= 1;
										pushToken(new Token(self, TokenType.DEDENT, null, RangeBuilder.create(scanner.line, 0, scanner.line, currLineIndent)));
									}
								}

								break;
							}
						}

						return true;
					} else if (isWhitespace(p)) {
						// handle non-newline whitespace
						if (scanner.column === 0 && scanner.line === 0) {
							// is the start of the very first line, if the first line is indented
							// and is semantically significant, throw an error. if it's only
							// whitespace or a comment, keep lexing

							// gather all the whitespaces
							var leadingWhitespace = '';
							var range = RangeBuilder.open(0, 0);

							while (isWhitespace(p = scanner.peek()) && !isNewline(p)) {
								leadingWhitespace += scanner.next();
							}

							if (isCommentStart(p)) {
								// leave the comment-parsing for later
								return true;
							} else if (isNewline(p) === false) {
								// line was indented but is significant making
								// the indentation illegal
								throw range.close(0, leadingWhitespace.length).error({
									type: ErrorType.BAD_INDENTATION,
									message: 'First line cannot be indented',
								});
							}
						} else {
							// at any other point in the program, just consume
							// the whitespace and move on
							scanner.next();
						}

						return true;
					} else if (isCommentStart(p)) {
						consumeComment(scanner);
						return true;
					} else {
						if (scanner.column === 0) {
							state.hasPassedFirstLine = true;
						}

						if (isAlpha(p) || p === '_') {
							// handle words (either identifiers or keywords)
							var range = RangeBuilder.open(scanner.line, scanner.column);
							var value = scanner.next();

							while (true) {
								p = scanner.peek();

								if (p !== null) {
									if (isAlpha(p) || isNumeric(p) || p === '_') {
										value += scanner.next();
									} else {
										break;
									}
								} else {
									break;
								}
							}

							if (isKeywordOperator(value)) {
								var type = TokenType.PUNCTUATOR;
							} else if (isKeyword(value)) {
								var type = TokenType.KEYWORD;
							} else if (isBooleanLiteral(value)) {
								var type = TokenType.BOOLEAN;

								// in the case of boolean values, convert the string
								// to a real boolean value
								value = (value === 'True');
							} else {
								var type = TokenType.IDENTIFIER;
							}

							pushToken(new Token(self, type, value, range.close(scanner.line, scanner.column)));
							return true;
						} else if (isNumeric(p)) {
							// handle numbers
							var range = RangeBuilder.open(scanner.line, scanner.column);
							var value = scanner.next();

							// gather digits
							while ((p = scanner.peek())) {
								if (!isNumeric(p)) {
									// next char is not a digit
									break;
								} else {
									// append digit
									value += scanner.next();
								}
							}

							// TODO: the lexer isn't worried about multiple decimal
							// points (which constitute and illegal literal) instead
							// it relies on the JS `parseFloat` function to signal
							// the error. consider making the lexer more cognizant of
							// this possible error state

							if (p === '.') {
								value += scanner.next();

								// gather [0-9]
								while (true) {
									p = scanner.peek();

									if (!isNumeric(p)) {
										// next char is not a digit
										break;
									} else {
										// append digit
										value += scanner.next();
									}
								}
							}

							if (isAlpha(p)) {
								throw RangeBuilder.create(scanner.line, scanner.column, scanner.line, scanner.column + 1).error({
									type: ErrorType.UNEXPECTED_CHARACTER,
									message: 'Expected a digit',
								});
							}

							// try to parse the string to a real number
							var parsed = parseFloat(value);

							if (isNaN(parsed) === true) {
								// throw an error if the JS parser couldn't make
								// sense of the string
								throw range.close(scanner.line, scanner.column).error({
									type: ErrorType.UNEXPECTED_CHARACTER,
									message: 'Could not parse as number',
								});
							}

							pushToken(new Token(self, TokenType.NUMBER, parsed, range.close(scanner.line, scanner.column)));
							return true;
						} else if (p === '"' || p === '\'') {
							// handle string literals
							var range = RangeBuilder.open(scanner.line, scanner.column);
							var quoteType = scanner.next();
							var value = '';

							while (true) {
								p = scanner.peek();

								if (isNull(p)) {
									// unexpected end of line
									throw range.close(scanner.line, scanner.column).error({
										type: ErrorType.UNEXPECTED_EOF,
										message: 'Unterminated string; expecting a matching end quote instead got end of program',
									});
								} else if (p < ' ') {
									// irregular character in literal
									if (p === '\n' || p === '\r' || p === '') {
										// advance scanner to get accurate
										// line/column position
										scanner.next();

										throw range.close(scanner.line, scanner.column).error({
											type: ErrorType.UNEXPECTED_CHARACTER,
											message: 'Unterminated string, expecting a matching end quote instead the line ended',
										});
									} else {
										// catch control characters
										throw RangeBuilder.create(scanner.line, scanner.column, scanner.line, scanner.column + 1).error({
											type: ErrorType.UNEXPECTED_CHARACTER,
											message: 'Control character in string',
										});
									}
								} else if (p === quoteType) {
									// consume quote, finish collecting characters
									scanner.next();
									break;
								} else if (p === '\\') {
									// consume backslash and its escaped character
									value += scanner.next();

									switch (scanner.next()) {
										// Python escape sequence docs:
										case '\n':
											// ignore escaped newline
											break;
										case '\\':
											// backslash
											value += '\\';
											break;
										case '\'':
											// single quote
											value += '\'';
											break;
										case '"':
											// double quote
											value += '\"';
											break;
										case 'a':
											// ASCII bell (BEL)
											value += '\a';
											break;
										case 'b':
											// ASCII backspace (BS)
											value += '\b';
											break;
										case 'f':
											// ASCII formfeed (FF)
											value += '\f';
											break;
										case 'n':
											// ASCII linefeed (LF)
											value += '\n';
											break;
										case 'r':
											// ASCII carriage return (CR)
											value += '\r';
											break;
										case 't':
											// ASCII horizontal tab (TAB)
											value += '\t';
											break;
									}
								} else {
									value += scanner.next();
								}
							}

							pushToken(new Token(self, TokenType.STRING, value, range.close(scanner.line, scanner.column)));
							return true;
						} else if (contains(prefixOperatorCharacters, p) ||
							contains(punctuationCharacters, p)) {
							// handle operators
							var range = RangeBuilder.open(scanner.line, scanner.column);
							var value = scanner.next();

							if (contains(prefixOperatorCharacters, value) &&
								contains(suffixOperatorCharacters, scanner.peek())) {
								value += scanner.next();
							}

							pushToken(new Token(self, TokenType.PUNCTUATOR, value, range.close(scanner.line, scanner.column)));
							return true;
						}
					}

					// consume character for accurate line/column info

					throw RangeBuilder.create(scanner.line, scanner.column, scanner.line, scanner.column + 1).error({
						type: ErrorType.UNEXPECTED_CHARACTER,
						message: 'Unexpected character',
					});
				}
			}

			while (true) {
				if (nextToken() !== true) {
					break;
				}
			}

			var nextTokenIndex = 0;

			this.curr = function() {
				return tokenBuffer[nextTokenIndex - 1] || null;
			};

			this.peek = function() {
				return tokenBuffer[nextTokenIndex] || null;
			};

			this.next = function() {
				return tokenBuffer[nextTokenIndex++] || null;
			};

			this.EOF = function() {
				return (scanner.EOF() && buffer.length === 0);
			};

			this.error = function(details) {
				return scanner.error(details);
			};
		}

		return Lexer;
	}());


	// [MiniPy] /src/parser/Parser.js

	exports.Parser = (function() {
		var ErrorType = require('../enums').enums.ErrorType;
		var TokenType = require('../enums').enums.TokenType;
		var ValueType = require('../enums').enums.ValueType;

		function Parser(lexer) {
			var self = this;
			this.lexer = lexer;

			this.symbols = {
				prefixParselets: {},
				infixParselets: {},
			};

			this.nodes = {
				expressions: {
					// wrapper for entire parsed AST
					Program: function(block) {
						this.type = 'Program';
						this.body = block;

						this.error = function(details) {
							return this.body.range.error(details);
						};
					},

					// a syntactically static token (Literal, Identifier, etc.)
					Atom: function(token) {
						if (token.type === TokenType.IDENTIFIER) {
							this.type = 'Identifier';
						} else {
							this.type = 'Literal';
							this.subtype = token.type;
						}

						this.value = token.getValue();

						this.range = token.range;

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Prefix: function(operator, operand) {
						this.type = 'UnaryExpression';
						this.operator = operator;
						this.right = operand;

						this.range = operator.range.union(operand.range);

						this.error = function(details) {
							return operator.error(details);
						};
					},

					Infix: function(operandLeft, operator, operandRight) {
						this.type = (operator.getValue() === '=' ? 'AssignmentExpression' : 'BinaryExpression');
						this.operator = operator;
						this.left = operandLeft;
						this.right = operandRight;

						this.range = operandLeft.range.union(operandRight.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Array: function(leftBracket, elements, rightBracket) {
						this.type = 'Literal';
						this.subtype = ValueType.ARRAY;
						this.elements = elements;

						this.range = leftBracket.range.union(rightBracket.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Subscript: function(root, leftBracket, subscript, rightBracket) {
						this.type = 'Subscript';
						this.root = root;
						this.subscript = subscript;
						this.operator = leftBracket;

						this.range = root.range.union(rightBracket.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					// a method call
					Call: function(callee, leftParen, args, rightParen) {
						this.type = 'CallExpression';
						this.callee = callee;
						this.args = args;

						this.range = callee.range.union(rightParen.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Delete: function(delKeyword, variable) {
						this.type = 'DeleteStatement';
						this.variable = variable;

						this.range = delKeyword.range.union(variable.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Block: function(statements) {
						this.type = 'Block';
						this.statements = statements;

						this.range = statements[0].range.union(statements[statements.length - 1].range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					// an if/elif/else statement
					If: function(ifKeyword, condition, ifBlock, elifBlocks, elseBlock) {
						this.type = 'IfStatement';
						this.condition = condition;
						this.ifBlock = ifBlock;
						this.elifBlocks = elifBlocks;
						this.elseBlock = elseBlock;

						if (elseBlock !== null) {
							this.range = ifKeyword.range.union(elseBlock.range);
						} else if (elifBlocks !== null && elifBlocks.length > 0) {
							this.range = ifKeyword.range.union(elifBlocks[elifBlocks.length - 1].range);
						} else {
							this.range = ifKeyword.range.union(ifBlock.range);
						}

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					While: function(whileKeyword, condition, block) {
						this.type = 'WhileStatement';
						this.condition = condition;
						this.block = block;

						this.range = whileKeyword.range.union(block.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Function: function(defKeyword, name, args, block) {
						this.type = 'FunctionStatement';
						this.name = name;
						this.args = args;
						this.block = block;

						this.range = defKeyword.range.union(block.range);

						this.error = function(details) {
							return this.range.error(details);
						};
					},

					Return: function(returnKeyword, arg) {
						this.type = 'ReturnStatement';
						this.arg = arg;

						this.range = (arg === null ? returnKeyword.range : returnKeyword.range.union(arg.range));

						this.error = function(details) {
							return this.range.error(details);
						};
					},
				},

				parselets: {
					Atom: function() {
						var precedence = 0;

						this.parse = function(parser, token) {
							return new self.nodes.expressions.Atom(token);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Prefix: function(precedence) {
						this.parse = function(parser, operatorToken) {
							var rightOperand = parser.parseExpression(precedence);

							return new self.nodes.expressions.Prefix(operatorToken, rightOperand);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Infix: function(precedence) {
						this.parse = function(parser, operatorToken, leftOperand) {
							var rightOperand = parser.parseExpression(precedence);

							return new self.nodes.expressions.Infix(leftOperand, operatorToken, rightOperand);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					// grouping an expression within parentheses creates a Group
					Group: function() {
						var precedence = 80;

						this.parse = function(parser, leftParenToken) {
							var interior = parser.parseExpression();

							self.next(TokenType.PUNCTUATOR, ')');

							return interior;
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Array: function() {
						var precedence = 80;

						this.parse = function(parser, leftBracketToken) {
							var elements = [];

							while (true) {
								if (self.peek(TokenType.PUNCTUATOR, ']')) {
									// break loop when right bracket found
									var rightBracketToken = self.next(TokenType.PUNCTUATOR, ']');
									break;
								} else if (self.peek(TokenType.NEWLINE)) {
									// unexpected newline
									var badToken = self.next();

									throw badToken.error({
										type: ErrorType.UNEXPECTED_TOKEN,
										message: 'Expecting an array element or a comma, instead found a Newline',
									});
								} else {
									elements.push(parser.parseExpression());

									if (self.peek(TokenType.PUNCTUATOR, ',')) {
										// consume comma
										self.next(TokenType.PUNCTUATOR, ',');
									} else if (self.peek(TokenType.PUNCTUATOR, ']') === null) {
										// next token is not an end bracket meaning the next
										// token is not syntactically legal
										var badToken = self.next();

										throw badToken.error({
											type: ErrorType.UNEXPECTED_TOKEN,
											message: 'Expecting a comma or right bracket, instead found ' +
												(badToken.type === TokenType.PUNCTUATOR ? badToken.value : badToken.type),
										});
									}
								}
							}

							return new self.nodes.expressions.Array(leftBracketToken, elements, rightBracketToken);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Subscript: function() {
						var precedence = 80;

						this.parse = function(parser, leftBracketToken, rootExpression) {
							var subscriptIndex = parser.parseExpression();

							// consume right bracket
							var rightBracketToken = self.next(TokenType.PUNCTUATOR, ']');

							return new self.nodes.expressions.Subscript(rootExpression, leftBracketToken, subscriptIndex, rightBracketToken);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Call: function() {
						var precedence = 80;

						this.parse = function(parser, leftParenToken, calleeExpression) {
							var args = [];

							while (self.peek(TokenType.PUNCTUATOR, ')') === null) {
								var arg = parser.parseExpression();
								args.push(arg);

								if (self.peek(TokenType.PUNCTUATOR, ',') === null) {
									break;
								} else {
									self.next(TokenType.PUNCTUATOR, ',');
								}
							}

							var rightParenToken = self.next(TokenType.PUNCTUATOR, ')');

							return new self.nodes.expressions.Call(calleeExpression, leftParenToken, args, rightParenToken);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Delete: function() {
						var precedence = 100;

						this.parse = function(parser, delKeywordToken) {
							var variable = self.parseExpression();

							return new self.nodes.expressions.Delete(delKeywordToken, variable);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					If: function() {
						var precedence = 100;

						this.parse = function(parser, ifKeywordToken) {
							var condition = self.parseExpression();

							self.next(TokenType.PUNCTUATOR, ':');
							self.next(TokenType.NEWLINE);

							var ifBlock = self.parseBlock();

							// collect the `elif` blocks (if they exist)
							var elifStatements = [];

							while (self.peek(TokenType.KEYWORD, 'elif') !== null) {
								var elifKeywordToken = self.next(TokenType.KEYWORD, 'elif');
								var elifCondition = self.parseExpression();

								var colon = self.next(TokenType.PUNCTUATOR, ':');
								self.next(TokenType.NEWLINE);

								var elifBlock = self.parseBlock();

								elifStatements.push({
									type: 'ElifStatement',
									condition: elifCondition,
									block: elifBlock,
									range: elifKeywordToken.range.union(colon.range),
								});
							}

							if (elifStatements.length === 0) {
								elifStatements = null;
							}

							// collect the `else` block (if it exists)
							var elseBlock = null;

							if (self.peek(TokenType.KEYWORD, 'else') !== null) {
								var elseKeywordToken = self.next(TokenType.KEYWORD, 'else');

								self.next(TokenType.PUNCTUATOR, ':');
								self.next(TokenType.NEWLINE);

								var block = self.parseBlock();

								elseBlock = {
									type: 'ElseStatement',
									block: block,
									range: elseKeywordToken.range,
								};
							}

							return new self.nodes.expressions.If(ifKeywordToken, condition, ifBlock, elifStatements, elseBlock);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					While: function() {
						var precedence = 100;

						this.parse = function(parser, whileKeywordToken) {
							var condition = self.parseExpression();

							self.next(TokenType.PUNCTUATOR, ':');
							self.next(TokenType.NEWLINE);

							var block = self.parseBlock();

							return new self.nodes.expressions.While(whileKeywordToken, condition, block);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Function: function() {
						var precedence = 100;

						this.parse = function(parser, defKeywordToken) {
							var nameToken = self.next(TokenType.IDENTIFIER);

							var args = [];

							// consume left paren
							self.next(TokenType.PUNCTUATOR, '(');

							while (true) {
								if (self.peek(TokenType.PUNCTUATOR, ')')) {
									// break loop when right paren found
									var rightParenToken = self.next(TokenType.PUNCTUATOR, ')');
									break;
								} else {
									args.push(self.next(TokenType.IDENTIFIER));

									if (self.peek(TokenType.PUNCTUATOR, ',')) {
										// consume comma
										self.next(TokenType.PUNCTUATOR, ',');
									} else if (self.peek(TokenType.PUNCTUATOR, ')') === null) {
										// next token is not an end paren meaning the next
										// token is not syntactically legal
										var badToken = self.next();

										throw badToken.error({
											type: ErrorType.UNEXPECTED_TOKEN,
											message: 'Expecting a comma or right parenthesis, instead found ' +
												(badToken.type === TokenType.PUNCTUATOR ? badToken.value : badToken.type),
										});
									}
								}
							}

							self.next(TokenType.PUNCTUATOR, ':');
							self.next(TokenType.NEWLINE);

							var block = self.parseBlock();

							return new self.nodes.expressions.Function(defKeywordToken, nameToken, args, block);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},

					Return: function() {
						var precedence = 100;

						this.parse = function(parser, returnKeywordToken) {
							if (self.peek(TokenType.NEWLINE) || self.peek(TokenType.EOF)) {
								// nothing being returned by this statement
								var arg = null;
							} else {
								var arg = parser.parseExpression();
							}

							return new self.nodes.expressions.Return(returnKeywordToken, arg);
						};

						this.getPrecedence = function() {
							return precedence;
						};
					},
				}
			};


			//
			// GRAMMAR DESCRIPTION
			//

			// streamlines construction of prefix rules
			function prefix(symbol) {
				if (typeof arguments[1] === 'number') {
					var parselet = new self.nodes.parselets.Prefix(arguments[1]);
				} else {
					var parselet = arguments[1];
				}

				self.register('prefix', symbol, parselet);
			}

			// streamlines construction of infix rules
			function infix(symbol) {
				if (typeof arguments[1] === 'number') {
					var parselet = new self.nodes.parselets.Infix(arguments[1]);
				} else {
					var parselet = arguments[1];
				}

				self.register('infix', symbol, parselet);
			}

			prefix('Atom', new self.nodes.parselets.Atom());
			prefix('(', new self.nodes.parselets.Group());
			prefix('[', new self.nodes.parselets.Array());

			infix('=', 10);

			infix('and', 30);
			infix('or', 30);

			infix('>', 30);
			infix('>=', 30);
			infix('<', 30);
			infix('<=', 30);
			infix('==', 30);
			infix('!=', 30);

			infix('+', 50);
			infix('-', 50);
			infix('*', 60);
			infix('/', 60);
			infix('%', 60);

			infix('**', 80);

			prefix('+', 70);
			prefix('-', 70);
			prefix('not', 70);
			prefix('!', 70);

			infix('[', new self.nodes.parselets.Subscript());
			infix('(', new self.nodes.parselets.Call());

			prefix('del', new self.nodes.parselets.Delete());
			prefix('if', new self.nodes.parselets.If());
			prefix('while', new self.nodes.parselets.While());
			prefix('def', new self.nodes.parselets.Function());
			prefix('return', new self.nodes.parselets.Return());
		}

		// given optional matching requirements, return next token
		// without advancing the lexer
		Parser.prototype.peek = function(type, value) {
			var p = this.lexer.peek();

			if (type === undefined) {
				// no matching arguments, return any token
				return p;
			} else if (p === null) {
				// lexer has been exhausted
				return null;
			} else {
				if (p.type === type) {
					if (value === undefined) {
						// token matches type, no value given
						return p;
					} else if (p.getValue() === value) {
						// token maches type and value
						return p;
					} else {
						// token matches type but not value
						return null;
					}
				} else {
					// token doesn't match type
					return null;
				}
			}
		};

		// given optional matching requirements, return next token
		// AND advance the lexer
		// 
		// if given matching requirements are not met, throw an error
		Parser.prototype.next = function(type, value) {
			var next = this.lexer.next();

			if (type === undefined) {
				// no matching arguments, return any token
				return next;
			} else {
				if (next !== null && next.type === type) {
					if (value === undefined) {
						// token matches type, no value given
						return next;
					} else if (next.getValue() === value) {
						// token maches type and value
						return next;
					}
				}

				// token doesn't match type or value
				if (next.type === TokenType.EOF || next === null) {
					var curr = this.lexer.curr();
					throw curr.error({
						type: ErrorType.UNEXPECTED_EOF,
						message: 'Unexpected end of file. Expected ' + (value || type),
					});
				} else {
					var curr = this.lexer.curr();
					throw curr.error({
						type: ErrorType.UNEXPECTED_TOKEN,
						message: 'Unexpected ' + curr.type + '. Expected ' + (value || type),
					});
				}
			}
		};

		// maps symbols to their appropriate parselet functions in either the
		// infix or prefix symbol tables
		Parser.prototype.register = function(fixationType, symbol, parselet) {
			if (fixationType === 'prefix') {
				this.symbols.prefixParselets[symbol] = parselet;
			} else if (fixationType === 'infix') {
				this.symbols.infixParselets[symbol] = parselet;
			}
		};

		Parser.prototype.getPrecedence = function() {
			if (this.peek() !== null) {
				var parser = this.symbols.infixParselets[this.getTokenSymbol(this.peek())];

				if (parser !== undefined) {
					return parser.getPrecedence();
				}
			}

			return 0;
		};

		// make it easier to reason about the binding powers of tokens by grouping
		// Numeric, Boolean, String, Keyword, Identifer tokens under the "Atom" umbrella
		// and differentiating Punctuator tokens by their individual values
		Parser.prototype.getTokenSymbol = function(token) {
			if (token.type === TokenType.PUNCTUATOR || token.type === TokenType.KEYWORD) {
				return token.getValue();
			} else {
				return 'Atom';
			}
		};

		// parse next expression
		Parser.prototype.parseExpression = function(precedence) {
			precedence = precedence || 0;

			if (this.peek(TokenType.EOF)) {
				// expression was abruptly ended by EOF
				throw token.error({
					type: ErrorType.UNEXPECTED_EOF,
					message: 'Unexpected end of program',
				});
			}

			var token = this.next();
			var prefix = this.symbols.prefixParselets[this.getTokenSymbol(token)];

			if (prefix === undefined) {
				// no prefix syntax registered with `token`'s symbol
				throw token.error({
					type: ErrorType.UNEXPECTED_TOKEN,
					message: 'Unexpected ' + token.type + ' with value "' + token.getValue() + '"',
				});
			}

			var left = prefix.parse(this, token);

			// left-associate expressions based on their relative precedence
			while (precedence < this.getPrecedence()) {
				token = this.next(TokenType.PUNCTUATOR);

				var infix = this.symbols.infixParselets[this.getTokenSymbol(token)];
				left = infix.parse(this, token, left);
			}

			return left;
		};

		// parse lists of single-line expressions preceeded by an Indent token and
		// followed by a Dedent token
		Parser.prototype.parseBlock = function() {
			this.next(TokenType.INDENT);

			var statements = [];

			while (true) {
				var latest = this.parseExpression();
				statements.push(latest);

				// look for end-of-line token after expression
				if (this.peek(TokenType.NEWLINE)) {
					this.next(TokenType.NEWLINE);

					if (this.peek(TokenType.DEDENT)) {
						this.next(TokenType.DEDENT);
						break;
					} else {
						continue;
					}
				} else if (this.peek(TokenType.DEDENT)) {
					this.next(TokenType.DEDENT);
					break;
				} else if (this.peek(TokenType.INDENT) || this.peek(TokenType.EOF) || this.peek() === null) {
					var next = this.next();
					throw next.error({
						type: ErrorType.UNEXPECTED_TOKEN,
						message: 'Expected end of indentation',
					});
				}
			}

			return new this.nodes.expressions.Block(statements);
		};

		Parser.prototype.parseProgram = function() {
			var body = [];

			// consume first newline if it exists
			if (this.peek(TokenType.NEWLINE)) {
				this.next(TokenType.NEWLINE);
			}

			// run until loop is broken of encounters EOF/null token. this
			// condition is largely for semantically empty programs which
			// may only have a Newline token followed by an EOF token
			while (this.peek(TokenType.EOF) === null && this.peek() !== null) {
				var latest = this.parseExpression();
				body.push(latest);

				if (this.lexer.curr().type === TokenType.DEDENT) {
					if (this.peek(TokenType.EOF)) {
						break;
					} else {
						continue;
					}
				} else if (this.peek(TokenType.NEWLINE)) {
					// expression followed by a Newline token
					this.next(TokenType.NEWLINE);

					if (this.peek(TokenType.EOF)) {
						// Newline token followed by an EOF token
						break;
					}
				} else if (this.peek(TokenType.EOF)) {
					// expression followed by an EOF token
					break;
				} else {
					// expression followed by an illegal token
					var badToken = this.peek() || this.lexer.curr();

					throw badToken.error({
						type: ErrorType.UNEXPECTED_TOKEN,
						message: 'Unexpected ' +
							(badToken.type === TokenType.PUNCTUATOR ? badToken.value : badToken.type),
					});
				}
			}

			this.next(TokenType.EOF);

			return new this.nodes.expressions.Program(body);
		};

		// hide implementation methods, only expose `parse` command
		return function(lexer) {
			this.parse = function(rawJSON) {
				var ast = (new Parser(lexer)).parseProgram();

				if (rawJSON === true) {
					return JSON.parse(JSON.stringify(ast));
				} else {
					return ast;
				}
			};
		};
	}());


	// [MiniPy] /src/runtime/types.js

	exports.Type = (function() {
		var ErrorType = require('../enums').enums.ErrorType;
		var ValueType = require('../enums').enums.ValueType;

		function NoneValue() {
			this.type = 'None';
		}

		NoneValue.prototype.isType = function(test) {
			return (test === ValueType.NONE);
		};

		function BooleanValue(value) {
			this.type = 'Boolean';
			this.value = value;
		}

		BooleanValue.prototype.isType = function(test) {
			return (test === ValueType.BOOLEAN);
		};

		BooleanValue.prototype.get = function() {
			return this.value;
		};

		BooleanValue.prototype.operation = function(isUnary, operatorSymbol, operandValue) {
			var a = this.value,
				b;

			if (isUnary === false) {
				if (operandValue.isType(ValueType.BOOLEAN) === false) {
					throw {
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a boolean',
					};
				}

				// set `b` during binary operations to represent the computed
				// value of the right operand
				b = operandValue.get();
			}

			switch (operatorSymbol) {
				case 'and':
					return new BooleanValue(a && b);
				case 'or':
					return new BooleanValue(a || b);
				case 'not':
					if (isUnary === true) {
						// negation
						return new BooleanValue(!a);
					} else {
						// operator not being used as a unary operation
						throw {
							type: ErrorType.UNKNOWN_OPERATION,
							message: 'The "not" operator can only be used in the form: not <expression>',
						};
					}
				case '==':
					return new BooleanValue(a === b);
				case '!=':
					return new BooleanValue(a != b);
				default:
					throw {
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorSymbol + '"',
					};
			}
		};

		function NumberValue(value) {
			this.type = 'Number';
			this.value = value;
		}

		NumberValue.prototype.isType = function(test) {
			return (test === ValueType.NUMBER);
		};

		NumberValue.prototype.get = function() {
			return this.value;
		};

		NumberValue.prototype.operation = function(isUnary, operatorSymbol, operandValue) {
			var a = this.value,
				b;

			if (isUnary === false) {
				if (operandValue.isType(ValueType.NUMBER) === false) {
					throw {
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a number',
					};
				}

				// set `b` during binary operations to represent the computed
				// value of the right operand
				b = operandValue.get();
			}

			switch (operatorSymbol) {
				case '+':
					return new NumberValue(a + b);
				case '-':
					if (isUnary === true) {
						// negation
						return new NumberValue(-1 * a);
					} else {
						// subtraction
						return new NumberValue(a - b);
					}
				case '*':
					return new NumberValue(a * b);
				case '/':
					if (b === 0) {
						throw {
							type: ErrorType.DIVIDE_BY_ZERO,
							message: 'Cannot divide by 0',
						};
					}

					return new NumberValue(a / b);
				case '%':
					if (b === 0) {
						throw {
							type: ErrorType.DIVIDE_BY_ZERO,
							message: 'Cannot modulo by 0',
						};
					}

					// use CoffeeScript's modulo function instead of JavaScript's
					// incorrect implementation
					return new NumberValue((a % b + b) % b);
				case '**':
					return new NumberValue(Math.pow(a, b));
				case '>':
					return new BooleanValue(a > b);
				case '>=':
					return new BooleanValue(a >= b);
				case '<':
					return new BooleanValue(a < b);
				case '<=':
					return new BooleanValue(a <= b);
				case '==':
					return new BooleanValue(a === b);
				case '!=':
					return new BooleanValue(a != b);
				default:
					throw {
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorSymbol + '"',
					};
			}
		};

		function StringValue(value) {
			this.type = 'String';

			// value is supplied having already been stripped of quotes
			this.value = value;
		}

		StringValue.prototype.isType = function(test) {
			return (test === ValueType.STRING);
		};

		StringValue.prototype.get = function() {
			return this.value;
		};

		StringValue.prototype.operation = function(isUnary, operatorSymbol, operandValue) {
			if (isUnary === true) {
				// there are only binary string operations
				throw {
					type: ErrorType.UNKNOWN_OPERATION,
					message: 'Not a valid string operation',
				};
			}

			function expectOperandType(type, message) {
				if (operandValue.isType(type) === false) {
					// expect subscript operand to be of type number
					throw {
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a ' + message,
					};
				}
			}

			var a = this.value;
			var b = operandValue.get();

			switch (operatorSymbol) {
				case '+':
					expectOperandType(ValueType.STRING, 'string');
					return new StringValue(a + b);
				case '==':
					expectOperandType(ValueType.STRING, 'string');
					return new BooleanValue(a == b);
				case '!=':
					expectOperandType(ValueType.STRING, 'string');
					return new BooleanValue(a != b);
				case '[':
					// subscript syntax
					expectOperandType(ValueType.NUMBER, 'number');

					if (b >= a.length || -b > a.length) {
						throw {
							type: ErrorType.OUT_OF_BOUNDS,
							message: '"' + b + '" is out of bounds',
						};
					} else if (b < 0) {
						// negative index
						return new StringValue(a[a.length + b])
					} else {
						// positive index
						return new StringValue(a[b]);
					}
				default:
					throw {
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorSymbol + '"',
					};
			}
		};

		function ArrayValue(elements) {
			this.type = 'Array';
			this.value = elements;
		}

		ArrayValue.prototype.isType = function(test) {
			return (test === ValueType.ARRAY);
		};

		ArrayValue.prototype.get = function(index) {
			if (typeof index === 'number') {
				// TODO: check to make sure index is in-range
				return this.value[index];
			} else {
				return this.value;
			}
		};

		ArrayValue.prototype.operation = function(isUnary, operatorSymbol, operandValue) {
			if (isUnary === true) {
				// there are only binary array operations
				throw {
					type: ErrorType.UNKNOWN_OPERATION,
					message: 'Not a valid array operation',
				};
			}

			function expectOperandType(type, message) {
				if (operandValue.isType(type) === false) {
					// expect subscript operand to be of type number
					throw {
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a ' + message,
					};
				}
			}

			var a = this.value;
			var b = operandValue.get();

			switch (operatorSymbol) {
				case '+':
					expectOperandType(ValueType.ARRAY, 'array');
					// concatentate arrays
					var concatenatedElements = [];

					// add elements from `a` to new array
					for (var i = 0, l = a.length; i < l; i++) {
						concatenatedElements.push(a[i]);
					}

					// add elements from `b` to new array
					for (var i = 0, l = b.length; i < l; i++) {
						concatenatedElements.push(b[i]);
					}

					return new ArrayValue(concatenatedElements);
				case '[':
					expectOperandType(ValueType.NUMBER, 'number');

					// subscript syntax
					if (b >= a.length || -b > a.length) {
						throw {
							type: ErrorType.OUT_OF_BOUNDS,
							message: '"' + b + '" is out of bounds',
						};
					} else if (b < 0) {
						// negative index
						return a[a.length + b];
					} else {
						// positive index
						return a[b];
					}
				default:
					throw {
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorSymbol + '"',
					};
			}
		};

		function FunctionValue(blocking, args, exec) {
			// defaults to `false`
			this.type = 'Function';
			this.args = args;
			this.blocking = (blocking === true);
			this.exec = exec;
		}

		FunctionValue.prototype.isType = function(test) {
			return (test === ValueType.FUNCTION);
		};

		return {
			None: NoneValue,
			Boolean: BooleanValue,
			Number: NumberValue,
			String: StringValue,
			Array: ArrayValue,
			Function: FunctionValue,
		};
	}());


	// [MiniPy] /src/runtime/Scope.js

	exports.Scope = (function() {
		var ErrorType = require('../enums').enums.ErrorType;
		var ValueType = require('../enums').enums.ValueType;

		function simplifyValue(value) {
			switch (value.type) {
				case 'Boolean':
				case 'Number':
				case 'String':
					return value.value;
				case 'Array':
					var simplification = [];

					for (var i = 0, l = value.value.length; i < l; i++) {
						simplification[i] = simplifyValue(value.value[i]);
					}

					return simplification;
				case 'Function':
					return {
						args: value.args.map(function(arg) {
							return arg.value;
						}),
					};
				default:
					return undefined;
			}
		}

		function Scope(parent, details) {
			this.parent = parent;
			this.details = details || null;

			if (this.parent === null) {
				this.globals = {};
			} else {
				this.locals = {};
			}
		}

		Scope.prototype.isGlobalScope = function() {
			return (this.parent === null);
		};

		Scope.prototype.owns = function(name) {
			// return true if variable with `name` exists in this scope
			if (this.isGlobalScope()) {
				return this.globals.hasOwnProperty(name);
			} else {
				return this.locals.hasOwnProperty(name);
			}
		};

		Scope.prototype.exists = function(name) {
			// return true if variable with `name` has
			// been created in any available scope
			return this.owns(name) || (!this.isGlobalScope() && this.parent.owns(name));
		};

		Scope.prototype.get = function(node) {
			var name = node.value;

			if (this.owns(name)) {
				if (this.isGlobalScope()) {
					return this.globals[name];
				} else {
					return this.locals[name];
				}
			} else {
				// this scope doesn't own the variable, check with the parent scope
				// or throw an error if it doesn't exist
				if (this.parent instanceof Scope) {
					return this.parent.get(node);
				} else {
					throw node.error({
						type: ErrorType.UNDEFINED_VARIABLE,
						message: 'No variable with identifier "' + name + '"',
					});
				}
			}
		};

		Scope.prototype.set = function(node, value, forceLocal) {
			var name = node.value || node.toString();

			if (forceLocal === true) {
				// variable is forced to be created locally (usually
				// for function arguments)
				if (this.isGlobalScope()) {
					this.globals[name] = value;
				} else {
					this.locals[name] = value;
				}
			} else if (this.exists(name)) {
				// variable already created, modify its value where it resides
				if (this.owns(name)) {
					if (this.isGlobalScope()) {
						this.globals[name] = value;
					} else {
						this.locals[name] = value;
					}
				} else {
					if (this.isGlobalScope()) {
						this.globals[name] = value;
					} else {
						this.parent.set(node, value);
					}
				}
			} else {
				// variable doesn't exist anywhere already, create it locally
				if (this.isGlobalScope()) {
					this.globals[name] = value;
				} else {
					this.locals[name] = value;
				}
			}
		};

		Scope.prototype.toJSON = function(subscope) {
			var scope = {
				variables: {},
			};

			if (this.details !== null) {
				// include extra info about function scopes
				scope.name = this.details.name;
				scope.args = this.details.args;
			}

			if (subscope !== undefined) {
				scope.subscope = subscope;
			}

			// collect variables into JSON scope representation
			if (this.parent === null) {
				for (var name in this.globals) {
					if (this.globals.hasOwnProperty(name)) {
						if (this.globals[name].type === ValueType.FUNCTION) {
							// skip built in functions
							continue;
						}

						scope.variables[name] = simplifyValue(this.globals[name]);
					}
				}
			} else {
				for (var name in this.locals) {
					if (this.locals.hasOwnProperty(name)) {
						if (this.locals[name].type === ValueType.FUNCTION) {
							// skip built in functions
							continue;
						}

						scope.variables[name] = simplifyValue(this.locals[name]);
					}
				}
			}

			// recursively include parent scopes
			if (this.parent === null) {
				return scope;
			} else {
				return this.parent.toJSON(scope);
			}
		};

		return Scope;
	}());


	// [MiniPy] /src/runtime/Interpreter.js

	exports.Interpreter = (function() {
		var TokenType = require('../enums').enums.TokenType;
		var ErrorType = require('../enums').enums.ErrorType;
		var ValueType = require('../enums').enums.ValueType;

		var Type = require('./types').Type;
		var Scope = require('./scope').Scope;

		// for preventing certain events from being called again and again
		function once(fn, context) {
			var result;

			return function() {
				if (fn) {
					result = fn.apply(context || this, arguments);
					fn = null;
				}

				return result;
			};
		}

		function Interpreter(ast, globals) {
			var scope = new Scope(null);

			// load passed global variables into scope
			Object.keys(globals || {}).forEach(function(globalIdentifier) {
				scope.set(globalIdentifier, new Type.Function(false, [], function(calleeNode, argNodes, complexArgs, simpleArgs) {
					var builtin = globals[globalIdentifier];

					if (typeof builtin === 'function') {
						// no argument validation given, just pass the arguments in
						return builtin.apply({
							line: calleeNode.range.start.line,
						}, simpleArgs);
					} else {
						// method configuration specified

						// validate passed arguments in accordinance with the
						// built-in method's specification
						if (typeof builtin.args === 'object') {
							argLoop:
							for (var i = 0, l = argNodes.length; i < l; i++) {
								if (builtin.args[i] instanceof Array) {
									// multiple possible types stored in an array, check each successive type
									// against argument at index `i`. if the argument matches, break the loop
									// and go on to check the next argument. if the argument's type fails all
									// checks, throw an error and point to the offending argument node
									typeLoop:
									for (var j = 0; j < builtin.args[i].length; j++) {
										if (complexArgs[i].type.toLowerCase() === builtin.args[i][j].toLowerCase()) {
											// type successfully matched
											continue argLoop;
										}
									}

									// argument at index `i` wasn't valid so throw an error
									var typeList = builtin.args[i].map(function(type) {
										return type[0].toUpperCase() + type.substring(1);
									}).join(' or ');

									throw argNodes[i].error({
										type: ErrorType.TYPE_VIOLATION,
										message: 'Function "' + globalIdentifier + '" was expecting an argument with type ' + typeList,
									})
								} else if (typeof builtin.args[i] === 'string' && builtin.args[i] !== 'any') {
									// single possible type
								}
							}
						}

						return builtin.fn.apply({}, simpleArgs);
					}
				}));
			});

			var validEventNames = [
				'scope',
				'exit',
			];

			// object with arrays of hook functions maped to valid event names
			var waitingHooks = [];
			var hooks = hooks || {};

			function clearWaitingHooks(expression) {
				if (waitingHooks.length > 0) {
					waitingHooks.map(function(hook) {
						hook.call({}, expression);
					});

					waitingHooks = [];
				}
			}

			function registerHook(eventName, hook) {
				// attach event hooks to hook table
				if (validEventNames.indexOf(eventName) >= 0 && typeof hook === 'function') {
					if (hooks[eventName] instanceof Array) {
						hooks[eventName].push(hook);
					} else {
						hooks[eventName] = [hook];
					}
				}
			}

			var loadOnce = once(function() {
				event('load');
			});

			var exitOnce = once(function(scopeJSON) {
				event('exit', scopeJSON);
			});

			// function for triggering an event with an optional payload
			function event(eventName, payload) {
				if (validEventNames.indexOf(eventName) >= 0 &&
					hooks[eventName] instanceof Array) {

					hooks[eventName].forEach(function(hook) {
						if (!(payload instanceof Array)) {
							payload = [payload];
						}

						waitingHooks.push(function(expression) {
							hook.apply(expression || {}, payload);
						});
					});
				}
			}

			function simplifyValue(value) {
				switch (value.type) {
					case 'Boolean':
					case 'Number':
					case 'String':
						return value.value;
					case 'Array':
						var simplification = [];

						for (var i = 0, l = value.value.length; i < l; i++) {
							simplification[i] = simplifyValue(value.value[i]);
						}

						return simplification;
					case 'Function':
						throw {
							type: ErrorType.TYPE_VIOLATION,
							message: 'Functions cannot be passed or manipulated',
						};
					default:
						return undefined;
				}
			}

			/*
			 * Author:      Isaac Evavold
			 * Created:     9/10/15 9:00pm
			 * Edited:      10/2/15 1:30am
			 *
			 * The following array and functions implement a system for pausing/resuming
			 * the interpreter. This enables the user to execute the program
			 * line-by-line manually for debugging/educational purposes.
			 *
			 * NOTES:
			 * These notes detail version 2.0 of the interpretation system. As a general
			 * overview, at any time the `loadedBlocks` array behaves as a stack holding arrays
			 * of statements corresponding to different levels of indentation in the program. As
			 * interpretation moves through the program, blocks of statements are pushed or popped
			 * as required. At each turn of execution (represetned by the `nextEspression` function),
			 * one statement is popped from the topmost block of the stack and run by the `exec` function.
			 * Said statement may do math or logic, may execute interal statements, may control the
			 * program flow or many other things detailed in `exec`.
			 *
			 * IMPLEMENTATION:
			 * - ExecutionBlock: (array of statements, )
			 *      Constructs an object representing a series of statements of the same scope
			 *      and indentation level. `ExecutionBlock`s make it easier to attach events
			 *      for when the execution of a block is concluded, when a block of statements
			 *      is returned and what line in the program is being returned to.
			 *
			 * - loadBlock: (ExecutionBlock object)
			 *      Given an `ExecutionBlock`, append that object to the top of the
			 *      `loadedBlocks` stack to wait for execution.
			 *
			 * - nextExpression: ()
			 *      Pop the top block off the `loadedBlocks` stack and execute its next statement.
			 *      Once execution is complete `nextExpression` will output detail about which
			 *      corresponding line of the source code was run so that listening programs can
			 *      inform the user.
			 *
			 * - exec: (AST Node object, callback)
			 *      Processes a single AST node and passes the evaluated result back through
			 *      the callback argument. Some nodes could be executed syncronously (Literals,
			 *      built-in functions like `print` and `len`, etc.) but the possibilty of
			 *      asyncronous element execution (Function calls, Loops, If statements, etc.)
			 *      makes it necessary to maintain a similar interface for both cases. The
			 *      function returns nothing.
			 *
			 * - comprehendSeries: (accumulated elements, remaining elements, callback)
			 *      Called when a series of elements (function call arguments, element of
			 *      an array, etc. need to be evaluated in series and any of them may be
			 *      asyncronous. The first argument, "accumulated elements" should usually
			 *      be passed as an empty array. It's purpose is largely for internal
			 *      recusion since `comprehendSeries` keeps calling itself as it digests
			 *      its array of nodes.
			 *
			 * ONGOING MESSINESS:
			 * Currently, the If/Elif/Else and Function statement implementations inject
			 * statement stubs into the execution stack as a workaround for getting program
			 * execution flow to pause at the right times. Some of these injected objects
			 * have to be tagged `execute = false` to prevent execution of the statement
			 * as if it was real. It seems to work but I would like a more natural solution
			 * to this problem of specifying granular flow-control.
			 */

			function ExecutionBlock(statements, events, returnTo) {
				events = events || {};

				this.statements = statements;
				this.before = events.before || null;
				this.done = events.done || null;
				this.return = events.return || null;
				this.returnTo = returnTo || null;
			}

			ExecutionBlock.prototype.slice = function() {
				return new ExecutionBlock(this.statements.slice(1), {
					before: this.before,
					done: this.done,
					return: this.return,
				}, this.returnTo);
			};

			var loadedBlocks = [];

			function loadBlock(block) {
				loadedBlocks.push(block);
			}

			function nextExpression() {
				var poppedBlock = loadedBlocks.pop();

				if (poppedBlock === undefined) {
					exitOnce([scope.toJSON()]);

					// call hooks and pass line details
					clearWaitingHooks();

					return null;
				} else {
					if (typeof poppedBlock.before === 'function') {
						poppedBlock.before();
						poppedBlock.before = null;
					}

					if (poppedBlock.statements.length > 0) {
						var node = poppedBlock.statements[0];
						loadedBlocks.push(poppedBlock.slice());

						exec(node, function(result) {
							if (result) {
								// do nothing?
							}
						});

						var expressionLine = {
							type: node.type,
							range: node.range,
						};

						// call hooks and pass line details
						clearWaitingHooks(expressionLine);

						return expressionLine;
					} else {
						// have exhausted all statements in top block
						if (typeof poppedBlock.done === 'function') {
							var doneOuput = poppedBlock.done();

							// TODO: more specific check to make sure object has type/range fields
							if (doneOuput !== undefined) {
								return doneOuput;
							}
						}

						return nextExpression();
					}
				}
			}

			function comprehendSeries(accumulated, remaining, done) {
				if (remaining.length === 0) {
					done(new Type.Array(accumulated));
				} else {
					exec(remaining[0], function(element) {
						// disallow the passing of functions as call arguments
						// or storing functions in arrays
						if (element.type === ValueType.FUNCTION) {
							throw remaining[0].error({
								type: ErrorType.TYPE_VIOLATION,
								message: 'Functions cannot be passed as arguments or stored in arrays',
							});
						} else if (element.type === ValueType.NONE) {
							throw remaining[0].error({
								type: ErrorType.TYPE_VIOLATION,
								message: 'Cannot collect a value from a function which has returned nothing',
							});
						}

						accumulated.push(element);
						comprehendSeries(accumulated, remaining.slice(1), done);
					});
				}
			}

			function exec(node, done) {
				if (node.execute === false) {
					if (typeof node.script === 'function') {
						node.script();
					}

					done();
					return;
				}

				switch (node.type) {
					case 'Literal':
						switch (node.subtype) {
							case TokenType.BOOLEAN:
								done(new Type.Boolean(node.value));
								break;
							case TokenType.NUMBER:
								done(new Type.Number(node.value));
								break;
							case TokenType.STRING:
								done(new Type.String(node.value));
								break;
							case ValueType.ARRAY:
								// execute each element of the array, pass executed array
								// to callback once all elements have been comprehended
								comprehendSeries([], node.elements, done);
								break;
							default:
								throw node.error({
									type: ErrorType.UNEXPECTED_TOKEN,
									message: 'Unknown value',
								});
						}

						break;

					case 'Identifier':
						done(scope.get(node));
						break;

					case 'AssignmentExpression':
						var assignee = node.left;

						if (assignee.type === 'Identifier') {
							exec(node.right, function(rightValue) {
								if (rightValue.isType(ValueType.NONE)) {
									throw node.right.error({
										type: ErrorType.TYPE_VIOLATION,
										message: 'Cannot use value None in an assignment',
									});
								}

								// normal assignment to identifier
								scope.set(assignee, rightValue);

								// call `scope` event
								event('scope', [scope.toJSON()]);

								done();
							});
						} else if (assignee.type === 'Subscript') {
							exec(assignee.root, function(rootValue) {
								exec(assignee.subscript, function(subscriptValue) {
									if (subscriptValue instanceof Type.Number) {
										if (rootValue instanceof Type.Array) {
											if (subscriptValue.value >= rootValue.value.length || -subscriptValue > rootValue.value.length) {
												throw assignee.subscript.error({
													type: ErrorType.OUT_OF_BOUNDS,
													message: 'Index ' + indexToChange.value + ' is out of bounds of array with length ' + root.value.length,
												});
											} else {
												// negative index (index telative to end of array)
												exec(node.right, function(rightValue) {
													if (rightValue.isType(ValueType.NONE)) {
														throw node.right.error({
															type: ErrorType.TYPE_VIOLATION,
															message: 'Cannot use value None in an assignment',
														});
													}

													if (subscriptValue.value < 0) {
														rootValue.value[rootValue.value.length + subscriptValue.value] = rightValue;
													} else {
														rootValue.value[subscriptValue.value] = rightValue;
													}

													// apply changes to scope
													scope.set(assignee.root, rootValue);

													// call applicable event
													event('scope', [scope.toJSON()]);
												});
											}
										} else {
											throw assignee.root.error({
												type: ErrorType.TYPE_VIOLATION,
												message: 'Subscript assignment notation can only be used on arrays',
											});
										}
									} else {
										assignee.subscript.error({
											type: ErrorType.TYPE_VIOLATION,
											message: 'Subscript value must be a number, instead was ' + subscriptValue.type,
										});
									}
								});
							});
						} else {
							throw assignee.error({
								type: ErrorType.UNKNOWN_OPERATION,
								message: 'Illegal left-hande side of assignment',
							});
						}

						break;

					case 'UnaryExpression':
						var operatorSymbol = node.operator.value;

						exec(node.right, function(rightValue) {
							try {
								var isUnary = true;
								var computedValue = rightValue.operation(isUnary, operatorSymbol);
							} catch (details) {
								// catch errors created by the operation and based on the error type,
								// assign the errors to the offending expressions or tokens
								switch (details.type) {
									case ErrorType.TYPE_VIOLATION:
										// errors caused by the operand
										throw node.right.error(details);
									case ErrorType.UNKNOWN_OPERATION:
										// unknown operation for `rightValue`
										throw node.operator.error(details);
									default:
										if (typeof details.type === 'number' && typeof details.message === 'string') {
											// thrown object is { type: Number, message: String } and can be converted
											throw node.error(details);
										} else {
											throw details;
										}
								}
							}

							done(computedValue);
						});

						break;

					case 'BinaryExpression':
						var operatorSymbol = node.operator.value;

						exec(node.left, function(leftValue) {
							exec(node.right, function(rightValue) {
								try {
									var isUnary = false;
									var computedValue = leftValue.operation(isUnary, operatorSymbol, rightValue);
								} catch (details) {
									// catch errors created by the operation and based on the error type,
									// assign the errors to the offending expressions or tokens
									switch (details.type) {
										case ErrorType.TYPE_VIOLATION:
										case ErrorType.DIVIDE_BY_ZERO:
											// errors caused by the right-hande operand
											throw node.right.error(details);
										case ErrorType.UNKNOWN_OPERATION:
											// unknown operation for `leftValue`
											throw node.operator.error(details);
										default:
											throw node.error(details);
									}
								}

								done(computedValue);
							});
						});

						break;

					case 'Subscript':
						var operatorSymbol = '[';

						exec(node.root, function(rootValue) {
							exec(node.subscript, function(subscriptValue) {
								try {
									var isUnary = false;
									var computedValue = rootValue.operation(isUnary, operatorSymbol, subscriptValue);
								} catch (details) {
									// catch errors created by the operation and based on the error type,
									// assign the errors to the offending expressions or tokens
									switch (details.type) {
										case ErrorType.TYPE_VIOLATION:
										case ErrorType.OUT_OF_BOUNDS:
											// errors caused by the subscript index
											throw node.subscript.error(details);
										default:
											throw node.error(details);
									}
								}

								done(computedValue);
							});
						});

						break;

					case 'DeleteStatement':
						if (node.variable.type === 'Subscript') {
							exec(node.variable.root, function(rootValue) {
								if (rootValue.isType(ValueType.ARRAY)) {
									exec(node.variable.subscript, function(subscriptValue) {
										if (subscriptValue.isType(ValueType.NUMBER)) {
											// check that removal index is in-bounds
											var length = rootValue.value.length;
											var givenIndex = subscriptValue.value;

											if (givenIndex >= length || -givenIndex > length) {
												throw node.variable.subscript.error({
													type: ErrorType.OUT_OF_BOUNDS,
													message: '"' + length + '" is out of bounds',
												});
											} else if (givenIndex < 0) {
												// negative index
												var index = length + givenIndex;
											} else {
												// positive index
												var index = givenIndex
											}

											// remove element from `rootValue` array at index `subscriptValue`
											rootValue.value.splice(index, 1);

											event('scope', [scope.toJSON()]);

											done();
										} else {
											throw node.variable.subscript.error({
												type: ErrorType.TYPE_VIOLATION,
												message: 'Expecting a Number, got a ' + subscriptValue.type,
											});
										}
									});
								} else {
									throw node.variable.error({
										type: ErrorType.ILLEGAL_STATEMENT,
										message: 'Expecting a reference to an Array element',
									});
								}
							})
						} else {
							throw node.variable.error({
								type: ErrorType.ILLEGAL_STATEMENT,
								message: 'Expecting an Array subscript',
							});
						}

						break;

					case 'IfStatement':
						exec(node.condition, function(condition) {
							if (condition.value === true) {
								loadBlock(new ExecutionBlock(node.ifBlock.statements.slice(0)));
							} else {
								var cases = (node.elifBlocks || []);

								if (node.elseBlock !== null) {
									cases.push(node.elseBlock);
								}

								if (cases.length > 0) {
									loadBlock(new ExecutionBlock(cases));
								}
							}
						});

						break;

					case 'ElifStatement':
						exec(node.condition, function(condition) {
							if (condition.value === true) {
								loadBlock(new ExecutionBlock(node.block.statements.slice(0), {
									done: function() {
										// since this condition matched, prevent execution of any
										// other `elif` or `else` blocks
										loadedBlocks.pop();
									},
								}));
							}
						});

						break;

					case 'ElseStatement':
						loadBlock(new ExecutionBlock(node.block.statements.slice(0)));
						break;

					case 'WhileStatement':
						function whileLoop() {
							exec(node.condition, function(condition) {
								if (condition.value === true) {
									loadBlock(new ExecutionBlock(node.block.statements.slice(0), {
										done: whileLoop,
									}))
								}
							});

							// point back to line with while-condition
							return {
								type: node.type,
								range: node.range,
							};
						}

						whileLoop();

						break;

					case 'FunctionStatement':
						scope.set(node.name, new Type.Function(true, node.args, function(callArgValues, callingNode, done) {
							// add debugger pointer to function declaration so that declaration
							// line will be highlighted when stepping through the program
							if (node.block.statements[0].type !== 'FunctionStatement' && node.block.statements[0].execute !== false) {
								node.block.statements.unshift({
									type: 'FunctionStatement',
									execute: false,
									range: node.range,
								});
							}

							var returnTo = {
								type: 'CallExpression',
								execute: false,
								range: callingNode.range,
							};

							var block = new ExecutionBlock(node.block.statements.slice(0), {
								before: function() {
									// new level of scope
									scope = new Scope(scope, {
										name: node.name.value,
										args: node.args.map(function(arg) {
											return arg.value;
										}),
									});

									// create function argument variables
									for (var i = 0, l = Math.min(node.args.length, callArgValues.value.length); i < l; i++) {
										var forceLocal = true;
										scope.set(node.args[i], callArgValues.value[i], forceLocal);
									}

									// update scope listeners
									event('scope', [scope.toJSON()]);
								},

								done: function() {
									// return to old scope
									scope = scope.parent;

									event('scope', [scope.toJSON()]);

									// no returned expression, pass nothing
									done(new Type.None());
								},

								return: function(output) {
									// pass any returned expression
									done(output || new Type.None());
								},
							}, returnTo);

							loadBlock(block);

							return {
								type: node.type,
								range: node.range,
							};
						}));

						event('scope', [scope.toJSON()]);

						break;

					case 'ReturnStatement':
						if (node.arg !== null) {
							exec(node.arg, function(returnValue) {
								while (loadedBlocks.length > 0) {
									var popped = loadedBlocks.pop();

									if (typeof popped.return === 'function') {
										if (popped.returnTo !== null) {
											// pop scope
											scope = scope.parent;

											popped.returnTo.script = function() {
												// return data once interpreter has returned to the calling expression
												popped.return(returnValue);
												event('scope', [scope.toJSON()]);
											};

											loadedBlocks[loadedBlocks.length - 1].statements.unshift(popped.returnTo);
										}

										done();
										return;
									}
								}

								throw node.error({
									type: ErrorType.ILLEGAL_STATEMENT,
									message: 'Can only return from inside a function',
								});
							});
						} else {
							while (loadedBlocks.length > 0) {
								var popped = loadedBlocks.pop();

								if (typeof popped.return === 'function') {
									if (popped.returnTo !== null) {
										// pop scope
										scope = scope.parent;

										popped.returnTo.script = function() {
											// return data once interpreter has returned to the called expression
											popped.return(new Type.None());
											event('scope', [scope.toJSON()]);
										};

										loadedBlocks[loadedBlocks.length - 1].statements.unshift(popped.returnTo);
									}

									done();
									return;
								}
							}

							throw node.error({
								type: ErrorType.ILLEGAL_STATEMENT,
								message: 'Can only return from inside a function',
							});
						}

						break;

					case 'CallExpression':

						var functionValue = scope.get(node.callee);

						comprehendSeries([], node.args, function(callArgValues) {
							if (functionValue.blocking === true) {
								// functions defined in-program and thus debugging execution flow
								// will pass to the function declaration to walk through
								// the function's logic line-by-line
								functionValue.exec(callArgValues, node, done);
							} else {
								// function is inline, probably build-in like `len()` or `print()` and should
								// not effect the line-by-line debugger flow
								var possibleReturnValue = functionValue.exec(node.callee, node.args, callArgValues.value, simplifyValue(callArgValues));

								// convert the return value (if it exists) to an internal represented value object
								// TODO: currently arrays are not supported
								var returnValue;
								switch (typeof possibleReturnValue) {
									case 'boolean':
										returnValue = new Type.Boolean(possibleReturnValue);
										break;
									case 'number':
										returnValue = new Type.Number(possibleReturnValue);
										break;
									case 'string':
										returnValue = new Type.String(possibleReturnValue);
										break;
									default:
										returnValue = new Type.None();
								}

								done(returnValue);
							}
						});

						break;

					default:
						throw node.error({
							type: ErrorType.ILLEGAL_STATEMENT,
							message: 'Unknown statement with type "' + node.type + '"',
						});
				}
			}

			return {
				load: function(hooks) {
					hooks = hooks || {};

					// register any hooks that are passed
					for (var eventName in hooks) {
						if (hooks.hasOwnProperty(eventName)) {
							registerHook(eventName, hooks[eventName]);
						}
					}

					loadOnce();

					loadBlock(new ExecutionBlock(ast.body, {
						done: function() {
							// TODO: fire `exit` event
						},
					}));
				},

				next: function() {
					return nextExpression();
				},

				on: registerHook,
			};
		}

		return Interpreter;
	}());


	// [MiniPy] /src/root.js

	(function(root) {
		var Scanner = require('./parser/scanner').Scanner;
		var Lexer = require('./parser/lexer').Lexer;
		var Parser = require('./parser/parser').Parser;
		var Interpreter = require('./runtime/interpreter').Interpreter;

		var defaultHooks = {};

		var defaultMaxLinesExecuted = 2000;

		function validate(code) {
			try {
				var s = new Scanner(code);
				var l = new Lexer(s);
				var p = new Parser(l);
				var a = p.parse();

				return true;
			} catch (err) {
				return err;
			}
		}

		function createInspector(code, opts) {
			opts = opts || {};

			var globals = opts.globals || {};
			var hooks = opts.hooks || defaultHooks;

			var s = new Scanner(code);
			var l = new Lexer(s);
			var p = new Parser(l);
			var a = p.parse();

			var i = new Interpreter(a, globals);
			i.load(hooks);

			return i;
		}

		function run(code, opts) {
			opts = opts || {};

			var maxLinesExecuted = opts.maxLinesExecuted || defaultMaxLinesExecuted;
			var linesExecuted = 0;

			var i = createInspector(code, opts);

			while (true) {
				var expression = i.next();

				linesExecuted += 1;

				if (expression === null) {
					if (opts.hook && opts.hook.exit && typeof opts.hook.exit === 'function') {
						opts.hook.exit.apply({}, []);
					}

					break;
				} else if (linesExecuted >= maxLinesExecuted) {
					var MiniPyError = require('./error/error').MiniPyError;
					var ErrorType = require('./enums').enums.ErrorType;

					throw new MiniPyError(code, {
						type: ErrorType.EXECUTION_TIMEOUT,
						message: 'Program execution took too long, check for infinite loops',
					});
				}
			}
		}

		root({
			validate: validate,
			inspect: createInspector,
			run: run,

			Error: exports.MiniPyError,
		});
	}(root));


}(function(lib) {
	var root = this;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = lib;
	} else {
		root.MiniPy = lib;
	}
}));
