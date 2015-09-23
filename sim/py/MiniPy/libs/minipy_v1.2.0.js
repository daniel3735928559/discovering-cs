// MiniPy.js v1.2.0

(function(root) {
	var exports = {};

	var moduleAliasNameMap = {
		error: 'MiniPyError',
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
		},

		TokenType: {
			EOF: 0,

			// whitespace
			NEWLINE: 1,
			INDENT: 2,
			DEDENT: 3,

			// syntactic symbols
			PUNCTUATOR: 4,
			KEYWORD: 5,
			IDENTIFIER: 6,

			// literals
			BOOLEAN: 7,
			STRING: 8,
			NUMBER: 9,
		},

		TokenTypeStrings: [
			'EOF',
			'Newline',
			'Indent',
			'Dedent',
			'Punctuator',
			'Keyword',
			'Identifier',
			'Boolean',
			'String',
			'Number',
		],

		ValueType: {
			BOOLEAN: 0,
			NUMBER: 1,
			STRING: 2,
			ARRAY: 3,
		},
	};


	// [MiniPy] /src/error/error.js

	exports.MiniPyError = (function() {
		function MiniPyError(source, details) {
			this.type = details.type || 0;
			this.message = details.message || '';

			this.from = details.from || undefined;
			this.to = details.to || undefined;

			this.toString = function() {
				return JSON.stringify(details, null, '   ');
			};
		}

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
		var TokenTypeStrings = require('../enums').enums.TokenTypeStrings;

		function Token(lexer, type, value, line, column) {
			this.lexer = lexer;
			this.type = type;
			this.value = value;

			this.line = line;
			this.column = column;
		}

		Token.prototype.getValue = function() {
			if (this.value !== null) {
				return this.value;
			} else {
				return TokenTypeStrings[this.type];
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
				from: details.from || {
						line: this.line,
						column: this.column,
				},
				to: details.to || {
						line: this.line,
						column: this.column + this.getLength(),
				},
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

				pushToken(new Token(self, TokenType.NEWLINE, sc.next(), sc.line, null));
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
						pushToken(new Token(self, TokenType.NEWLINE, null, null, null));

						while (state.indent > 0) {
							state.indent -= 1;
							pushToken(new Token(self, TokenType.DEDENT, null, null, null));
						}
					}

					pushToken(new Token(self, TokenType.EOF, null, scanner.line, scanner.column));
					return false;
				} else {
					var p = scanner.peek();

					if (isNewline(p)) {
						pushToken(new Token(self, TokenType.NEWLINE, scanner.next(), scanner.line, null));

						var currLineIndent = 0;

						while (true) {
							p = scanner.peek();

							if (isNewline(p)) {
								// emit Newline token
								currLineIndent = 0;
								pushToken(new Token(self, TokenType.NEWLINE, scanner.next(), scanner.line, null));
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
									currLineIndent = 0;
									consumeComment(scanner);
								} else {
									// handle non-empty line
									if (pureTabIndentation === true) {
										if (state.hasPassedFirstLine === false) {
											// first semantically significant line is
											// indented, throw an error
											throw scanner.error({
												type: ErrorType.BAD_INDENTATION,
												message: 'First line cannot be indented',
												from: {
													line: scanner.line,
												},
											});
										} else {
											if (currLineIndent > state.indent) {
												if (currLineIndent === state.indent + 1) {
													// current line increases level of indentation by 1
													state.indent += 1;
													pushToken(new Token(self, TokenType.INDENT, null, scanner.line, null));
												} else {
													// current line increases by more than 1 level of
													// indentation, throw error
													throw scanner.error({
														type: ErrorType.BAD_INDENTATION,
														message: 'Too much indentation',
														from: {
															line: scanner.line,
														},
													});
												}
											} else if (currLineIndent < state.indent) {
												// current line has less indentation than previous lines
												// emit dedent tokens until fully resolved
												while (state.indent > currLineIndent) {
													state.indent -= 1;
													pushToken(new Token(self, TokenType.DEDENT, null, scanner.line, null));
												}
											}
										}
									} else {
										// the next token is non-whitespace meaning this line
										// uses illegal whitespace characters in its indentation;
										throw scanner.error({
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
										pushToken(new Token(self, TokenType.DEDENT, null, scanner.line, null));
									}
								}

								break;
							}
						}

						return true;
					} else if (isWhitespace(p)) {
						// handle non-newline whitespace
						scanner.next();
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
							var line = scanner.line;
							var column = scanner.column;
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

							pushToken(new Token(self, type, value, line, column));
							return true;
						} else if (isNumeric(p)) {
							// handle numbers
							var line = scanner.line;
							var column = scanner.column;
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
								throw scanner.error({
									type: ErrorType.UNEXPECTED_CHARACTER,
									message: 'Expected a digit',
									from: {
										line: scanner.line,
										column: scanner.column,
									},
									to: {
										line: scanner.line,
										column: scanner.column + 1,
									},
								});
							}

							// try to parse the string to a real number
							var parsed = parseFloat(value);

							if (isNaN(parsed) === true) {
								// throw an error if the JS parser couldn't make
								// sense of the string
								throw new Error('Could not parse number: "' + value + '"');
							}

							pushToken(new Token(self, TokenType.NUMBER, parsed, line, column));
							return true;
						} else if (p === '"' || p === '\'') {
							// handle string literals
							var line = scanner.line;
							var column = scanner.column;
							var quoteType = scanner.next();
							var value = '';

							while (true) {
								p = scanner.peek();

								if (isNull(p)) {
									// unexpected end of line
									throw scanner.error({
										type: ErrorType.UNEXPECTED_EOF,
										message: 'Unterminated string, expecting a matching end quote instead got end of program',
										from: {
											line: line,
											column: column,
										},
										to: {
											line: scanner.line,
											column: scanner.column + 1,
										},
									});
								} else if (p < ' ') {
									// irregular character in literal
									if (p === '\n' || p === '\r' || p === '') {
										// advance scanner to get accurage
										// line/column position
										scanner.next();

										throw scanner.error({
											type: ErrorType.UNEXPECTED_CHARACTER,
											message: 'Unterminated string, expecting a matching end quote',
											from: {
												line: line,
												column: column,
											},
											to: {
												line: scanner.line,
												column: scanner.column,
											},
										});
									} else {
										// catch control characters
										throw scanner.error({
											type: ErrorType.UNEXPECTED_CHARACTER,
											message: 'Control character in string',
											from: {
												line: scanner.line,
												column: scanner.column,
											},
											to: {
												line: scanner.line,
												column: scanner.column + 1,
											},
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

							pushToken(new Token(self, TokenType.STRING, value, line, column));
							return true;
						} else if (contains(prefixOperatorCharacters, p) ||
							contains(punctuationCharacters, p)) {
							// handle operators
							var line = scanner.line;
							var column = scanner.column;
							var value = scanner.next();

							if (contains(prefixOperatorCharacters, value) &&
								contains(suffixOperatorCharacters, scanner.peek())) {
								value += scanner.next();
							}

							pushToken(new Token(self, TokenType.PUNCTUATOR, value, line, column));
							return true;
						}
					}

					throw scanner.error({
						type: ErrorType.UNEXPECTED_CHARACTER,
						message: 'Unexpected character',
						from: {
							line: scanner.line,
							column: scanner.column,
						},
						to: {
							line: scanner.line,
							column: scanner.column + 1,
						},
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
		var TokenTypeStrings = require('../enums').enums.TokenTypeStrings;

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
							return self.lexer.error(details);
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

						this.line = token.line;
						this.column = token.column;

						this.error = function(details) {
							return token.error(details);
						};
					},

					Prefix: function(operator, operand) {
						this.type = 'UnaryExpression';
						this.operator = operator;
						this.right = operand;

						this.line = operator.line;
						this.column = operator.column;

						this.error = function(details) {
							switch (details.type) {
								case ErrorType.UNEXPECTED_EOF:
								case ErrorType.EXPECTED_NEWLINE:
									return operand.error(details);
								default:
									return operator.error(details);
							}
						};
					},

					Infix: function(operator, operandLeft, operandRight) {
						this.type = (operator.getValue() === '=' ? 'AssignmentExpression' : 'BinaryExpression');
						this.operator = operator;
						this.left = operandLeft;
						this.right = operandRight;

						this.line = operator.line;
						this.column = operator.column;

						this.error = function(details) {
							switch (details.type) {
								case ErrorType.UNEXPECTED_EOF:
								case ErrorType.EXPECTED_NEWLINE:
									return operandRight.error(details);
								default:
									return operator.error(details);
							}
						};
					},

					Array: function(elements) {
						this.type = 'Literal';
						this.subtype = TokenType.ARRAY;
						this.elements = elements;

						this.error = function(details) {
							return elements[0].error(details);
						};
					},

					Subscript: function(root, subscript, leftBracketToken) {
						this.type = 'Subscript';
						this.root = root;
						this.subscript = subscript;
						this.operator = leftBracketToken;

						this.error = function(details) {
							return leftBracketToken.error(details);
						};
					},

					// a method call
					Call: function(callee, args, rightParenToken) {
						this.type = 'CallExpression';
						this.callee = callee;
						this.arguments = args;

						this.line = callee.line;
						this.column = callee.column;

						this.error = function(details) {
							switch (details.type) {
								case ErrorType.UNEXPECTED_EOF:
								case ErrorType.EXPECTED_NEWLINE:
									return rightParenToken.error(details);
								default:
									details.from = {
										line: callee.line,
										column: callee.column,
									};

									details.to = {
										line: rightParenToken.line,
										column: rightParenToken.column + 1,
									};

									return callee.error(details);
							}
						};
					},

					// an if/elif/else statement
					If: function(ifKeywordToken, condition, ifBlock, elifBlocks, elseBlock) {
						this.type = 'IfStatement';
						this.condition = condition;
						this.ifBlock = ifBlock;
						this.elifBlocks = elifBlocks;
						this.elseBlock = elseBlock;

						this.line = ifKeywordToken.line;
						this.column = ifKeywordToken.column;

						this.error = function(details) {
							var lastBlock = ifBlock;

							if (elseBlock !== null) {
								lastBlock = elseBlock.block;
							} else if (elifBlocks.length !== null && elifBlocks.length > 0) {
								lastBlock = elifBlocks[elifBlocks.length - 1];
							}

							var lastExpression = lastBlock[lastBlock.length - 1];

							switch (details.type) {
								case ErrorType.UNEXPECTED_EOF:
								case ErrorType.EXPECTED_NEWLINE:
									return lastExpression.error(details);
								default:
									return ifKeywordToken.error(details);
							}
						};
					},

					While: function(whileKeywordToken, condition, block) {
						this.type = 'WhileStatement';
						this.condition = condition;
						this.block = block;

						this.line = whileKeywordToken.line;
						this.column = whileKeywordToken.column;

						this.error = function(details) {
							var lastExpression = block[block.length - 1];

							switch (details.type) {
								case ErrorType.UNEXPECTED_EOF:
								case ErrorType.EXPECTED_NEWLINE:
									return lastExpression.error(details);
								default:
									return whileKeywordToken.error(details);
							}
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

							return new self.nodes.expressions.Infix(operatorToken, leftOperand, rightOperand);
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
									// break loop when end bracket encountered
									self.next(TokenType.PUNCTUATOR);
									break;
								}

								elements.push(parser.parseExpression());

								if (self.peek(TokenType.PUNCTUATOR, ',')) {
									self.next(TokenType.PUNCTUATOR, ',');
								} else if (self.peek(TokenType.PUNCTUATOR, ']')) {
									self.next(TokenType.PUNCTUATOR);
									break;
								}
							}

							return new self.nodes.expressions.Array(elements);
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
							self.next(TokenType.PUNCTUATOR, ']');

							return new self.nodes.expressions.Subscript(rootExpression, subscriptIndex, leftBracketToken);
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

							return new self.nodes.expressions.Call(calleeExpression, args, rightParenToken);
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

								self.next(TokenType.PUNCTUATOR, ':');
								self.next(TokenType.NEWLINE);

								var elifBlock = self.parseBlock();

								elifStatements.push({
									type: 'ElifStatement',
									condition: elifCondition,
									block: elifBlock,

									line: elifKeywordToken.line,
									column: elifKeywordToken.column,
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

								elseBlock = {
									type: 'ElseStatement',
									block: self.parseBlock(),

									line: elseKeywordToken.line,
									column: elseKeywordToken.column,
								};

							// TODO: bundle elseKeywordToken line/column data with IfStatement
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

			prefix('if', new self.nodes.parselets.If());
			prefix('while', new self.nodes.parselets.While());
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
						message: 'Unexpected end of file. Expected ' + value.toUpperCase(),
					});
				} else {
					var curr = this.lexer.curr();
					throw curr.error({
						type: ErrorType.UNEXPECTED_TOKEN,
						message: 'Unexpected ' + TokenTypeStrings[curr.type] + '. Expected ' + value.toUpperCase(),
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
					message: 'Unexpected ' + TokenTypeStrings[token.type] + ' with value "' + token.getValue() + '"',
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

			var body = [];

			while (true) {
				var latest = this.parseExpression();
				body.push(latest);

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

			return body;
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
					var next = this.next();

					if (next !== null) {
						throw next.error({
							type: ErrorType.UNEXPECTED_TOKEN,
							message: 'Expected the end of the program',
						});
					} else {
						throw latest.error({
							type: ErrorType.UNEXPECTED_EOF,
							message: 'Expression was followed by an unexpected end of the program',
						});
					}
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

		function BooleanValue(value) {
			this.type = 'Value';
			this.value = value;
		}

		BooleanValue.prototype.isType = function(test) {
			return (test === ValueType.BOOLEAN);
		};

		BooleanValue.prototype.get = function() {
			return this.value;
		};

		BooleanValue.prototype.operation = function(isUnary, operatorToken, operand, operandToken) {
			var a = this.value,
				b;

			if (isUnary === false) {
				if (operand.isType(ValueType.BOOLEAN) === false) {
					throw operandToken.error({
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a boolean',
					});
				}

				// set `b` during binary operations to represent the computed
				// value of the right operand
				b = operand.get();
			}

			switch (operatorToken.getValue()) {
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
						throw operatorToken.error({
							type: ErrorType.UNKNOWN_OPERATION,
							message: 'The "not" operator can only be used in the form: not <expression>',
						});
					}
				case '==':
					return new BooleanValue(a === b);
				case '!=':
					return new BooleanValue(a != b);
				default:
					throw operatorToken.error({
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorToken.getValue() + '"',
					});
			}
		};

		function NumberValue(value) {
			this.type = 'Value';
			this.value = value;
		}

		NumberValue.prototype.isType = function(test) {
			return (test === ValueType.NUMBER);
		};

		NumberValue.prototype.get = function() {
			return this.value;
		};

		NumberValue.prototype.operation = function(isUnary, operatorToken, operand, operandToken) {
			var a = this.value,
				b;

			if (isUnary === false) {
				if (operand.isType(ValueType.NUMBER) === false) {
					throw operandToken.error({
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a number',
					});
				}

				// set `b` during binary operations to represent the computed
				// value of the right operand
				b = operand.get();
			}

			switch (operatorToken.getValue()) {
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
						throw operatorToken.error({
							type: ErrorType.UNKNOWN_ERROR, // TODO: this is an inappropriate error type
							message: 'Cannot divide by 0',
						});
					}

					return new NumberValue(a / b);
				case '%':
					return new NumberValue(a % b);
				case '**':
					return new NumberValue(Math.pow(a, b));
				case '>':
					return new NumberValue(a > b);
				case '>=':
					return new NumberValue(a >= b);
				case '<':
					return new NumberValue(a < b);
				case '<=':
					return new NumberValue(a <= b);
				case '==':
					return new NumberValue(a === b);
				case '!=':
					return new NumberValue(a != b);
				default:
					throw operatorToken.error({
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorToken.getValue() + '"',
					});
			}
		};

		function StringValue(value) {
			this.type = 'Value';

			// value is supplied having already been stripped of quotes
			this.value = value;
		}

		StringValue.prototype.isType = function(test) {
			return (test === ValueType.STRING);
		};

		StringValue.prototype.get = function() {
			return this.value;
		};

		StringValue.prototype.operation = function(isUnary, operatorToken, operand, operandToken) {
			if (isUnary === true) {
				// there are only binary string operations
				throw operatorToken.error({
					type: ErrorType.UNKNOWN_OPERATION,
					message: 'Not a valid string operation',
				});
			}

			function expectOperandType(type, message) {
				if (operand.isType(type) === false) {
					// expect subscript operand to be of type number
					throw operandToken.error({
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a ' + message,
					});
				}
			}

			var a = this.value;
			var b = operand.get();

			switch (operatorToken.getValue()) {
				case '+':
					expectOperandType(ValueType.STRING, 'string');
					return new StringValue(a + b);
				case '==':
					expectOperandType(ValueType.STRING, 'string');
					return new StringValue(a == b);
				case '!=':
					expectOperandType(ValueType.STRING, 'string');
					return new StringValue(a != b);
				case '[':
					// subscript syntax
					expectOperandType(ValueType.NUMBER, 'number');

					if (b >= a.length || -b > a.length) {
						throw operatorToken.error({
							type: ErrorType.OUT_OF_BOUNDS,
							message: '"' + b + '" is out of bounds',
						});
					} else if (b < 0) {
						// negative index
						return new StringValue(a[a.length + b])
					} else {
						// positive index
						return new StringValue(a[b]);
					}
				default:
					throw operatorToken.error({
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorToken.getValue() + '"',
					});
			}
		};

		function ArrayValue(elements) {
			this.type = 'Value';
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

		ArrayValue.prototype.operation = function(isUnary, operatorToken, operand, operandToken) {
			if (isUnary === true) {
				// there are only binary array operations
				throw operandToken.error({
					type: ErrorType.UNKNOWN_OPERATION,
					message: 'Not a valid array operation',
				});
			}

			function expectOperandType(type, message) {
				if (operand.isType(type) === false) {
					// expect subscript operand to be of type number
					throw operandToken.error({
						type: ErrorType.TYPE_VIOLATION,
						message: 'Expected a ' + message,
					});
				}
			}

			var a = this.value;
			var b = operand.get();

			switch (operatorToken.getValue()) {
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
						throw operatorToken.error({
							type: ErrorType.OUT_OF_BOUNDS,
							message: '"' + b + '" is out of bounds',
						});
					} else if (b < 0) {
						// negative index
						return a[a.length + b];
					} else {
						// positive index
						return a[b];
					}
				default:
					throw operatorToken.error({
						type: ErrorType.UNKNOWN_OPERATION,
						message: 'Unknown operation with symbol "' + operatorToken.getValue() + '"',
					});
			}
		};

		return {
			Boolean: BooleanValue,
			Number: NumberValue,
			String: StringValue,
			Array: ArrayValue,
		};
	}());


	// [MiniPy] /src/runtime/Scope.js

	exports.Scope = (function() {
		var ErrorType = require('../enums').enums.ErrorType;

		function Scope(parent) {
			this.parent = parent || null;
			this.local = {};
		}

		Scope.prototype.setErrorGenerator = function(errorGenerator) {
			this.errorGenerator = errorGenerator;
		};

		Scope.prototype.isLocal = function(name) {
			if (this.local.hasOwnProperty(name)) {
				return true;
			} else {
				return false;
			}
		};

		Scope.prototype.get = function(node) {
			var name = node.value;

			if (this.isLocal(name)) {
				return this.local[name];
			} else {
				if (this.parent !== null && typeof this.parent.get === 'function') {
					return this.parent.get(name);
				} else {
					throw this.errorGenerator({
						type: ErrorType.UNDEFINED_VARIABLE,
						message: 'No variable with identifier "' + name + '"',
						from: {
							line: node.line,
							column: node.column,
						},
						to: {
							line: node.line,
							column: node.column + name.length,
						},
					});
				}
			}
		};

		Scope.prototype.set = function(node, value) {
			var name = node.value || node.toString();

			if (this.isLocal(name)) {
				this.local[name] = value;
			} else if (this.parent !== null) {
				this.parent.set(name, value);
			} else {
				this.local[name] = value;
			}
		};

		return Scope;
	}());


	// [MiniPy] /src/runtime/Interpreter.js

	exports.Interpreter = (function() {
		// TODO:
		// + For loop
		// + Range function
		// + Change print statement to function (Python 3.0)
		// + Operation type checking

		var TokenType = require('../enums').enums.TokenType;
		var ErrorType = require('../enums').enums.ErrorType;

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
			// create global scope
			function scopeErrorGenerator(details) {
				return ast.error(details);
			}

			var scope = new Scope();
			scope.setErrorGenerator(scopeErrorGenerator);

			// load passed global variables into scope
			globals = globals || {};
			for (var key in globals) {
				if (globals.hasOwnProperty(key)) {
					scope.set(key, globals[key]);
				}
			}

			var validEventNames = [
				'assign',
				'print',
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

			var loadOnce = once(function() {
				event('load');
			});

			var exitOnce = once(function() {
				event('exit');
			});

			// function for triggering an event with an optional payload
			function event(eventName, payload) {
				if (validEventNames.indexOf(eventName) >= 0 &&
					hooks[eventName] instanceof Array) {
					hooks[eventName].forEach(function(hook) {
						if (!(payload instanceof Array)) {
							payload = [payload];
						}

						// hook.apply({}, payload);
						waitingHooks.push(function(expression) {
							hook.apply(expression || {}, payload);
						});
					});
				}
			}

			/*
			 * Isaac Evavold 9/10/15 9:00pm
			 *
			 * The following array and functions implement a system for pausing/resuming
			 * the interpreter. This enables the user to execute the program
			 * line-by-line manually for debugging/educational purposes.
			 *
			 * NOTES:
			 * Each time the interpreter is resumed it executes 1 non-empty line before
			 * pausing again. In the case of lines which don't affect flow-control
			 * (assignment, function calls, arithmetic, etc.) this usually consumes
			 * the entire statement. In the case of more complex statements (If, While,
			 * For, etc.) the interpreter executes the statement declaration line once
			 * and next begins executing the consequent block of statements as
			 * appropriate.
			 *
			 * IMPLEMENTATION:
			 * - resumeStack: [Function]
			 *      An array of functions waiting to be executed. The last function in
			 *      the stack will be executed next. If that function calls `pause`
			 *      during its execution then the a new continuation function will be
			 *      pushed onto the stack to be executed next. Once the function returns
			 *      the next function lower is popped and executed.
			 *
			 *      Put another way, when interpreting Python code the depth of the
			 *      `resumeStack` is approximate to the level of indentation + 1 at any
			 *      particular point with a different function representing the
			 *      continuation at each indentation.
			 *
			 * - pause: (Function) -> void
			 *      Functions passed to `pause` are pushed onto the `resumeStack` and
			 *      represent continuations of the program execution at a certain point.
			 *      Generally `pause` is called when a statement is performing
			 *      flow-control (If, While, For, etc.) and is executing a sub-block
			 *      of statements. It prevents `execBlock` from executing the next node
			 *      before the current flow-controlling node has finished executing.
			 *
			 * - resume: () -> Function
			 *      Returns the top function in the `resumeStack` for execution. This
			 *      function should only be called by the Intepreter librarie's `next`
			 *      or `execute` methods which are responsible for triggering the
			 *      continuation of program interpreteration.
			 *
			 *      Generally:
			 *      The Interpreter only calls `pause` and the user only calls `resume`.
			 *
			 * - exec: (AST Node object) -> value or void
			 *      Either executes a single line and returns the computed value of the
			 *      line (in the case of Literals, Arithmetic, Identifiers, etc.) or
			 *      void of the line is a statement (Print, Assignment, etc.) or void of
			 *      the line performs flow-control (If, While, For, etc.). The execution
			 *      of any line may involve calling `exec` on smaller parts of the line
			 *      though typically these smaller parts always directly return a value.
			 *
			 *      Flow-control statements call `pause` on their consequent statements
			 *      inside `exec`.
			 *
			 * - execBlock: ([AST Node object], Function?) -> Line details
			 *      The principle of `execBlock` is stolen from my limited understanding
			 *      of Haskell's method of pattern matching to lazily traverse lists.
			 *      `execBlock` is passed an array of AST Node objects and executes the
			 *      first node while passing the rest of the array to itself via the
			 *      `pause` function. When execution resumes `execBlock` will receive
			 *      the new list sans the previously executed node and continue
			 *      execution on the array of nodes.
			 *
			 */
			var resumeStack = [];

			function pause(fn) {
				resumeStack.push(fn);
			}

			function resume() {
				return resumeStack.pop();
			}

			function exec(node) {
				switch (node.type) {
					case 'Literal':
						switch (node.subtype) {
							case TokenType.BOOLEAN:
								return new Type.Boolean(node.value);
							case TokenType.NUMBER:
								return new Type.Number(node.value);
							case TokenType.STRING:
								return new Type.String(node.value);
							case TokenType.ARRAY:
								var executedElements = node.elements.map(function(element) {
									return exec(element);
								});

								return new Type.Array(executedElements);
							default:
								throw node.error({
									type: ErrorType.UNEXPECTED_TOKEN,
									message: 'Unknown value',
								});
						}

						break;
					case 'Identifier':
						return scope.get(node);
					case 'AssignmentExpression':
						var assignee = node.left;
						var value = exec(node.right);

						scope.set(assignee, value);
						event('assign', [assignee.value, value]);
						break;
					case 'UnaryExpression':
						var operatorToken = node.operator;
						var right = exec(node.right);

						var isUnary = true;
						return right.operation(isUnary, operatorToken);
					case 'BinaryExpression':
						var operatorToken = node.operator;
						var left = exec(node.left);
						var right = exec(node.right);

						var isUnary = false;
						return left.operation(isUnary, operatorToken, right, node.right);
					case 'Subscript':
						var operator = node.operator;
						var root = exec(node.root);
						var subscript = exec(node.subscript);

						var isUnary = false;
						return root.operation(isUnary, operator, subscript, node.subscript);
					case 'CallExpression':
						var calleeIdentifier = node.callee.value;

						if (calleeIdentifier === 'print') {
							var printArguments = [];

							for (var i = 0, l = node.arguments.length; i < l; i++) {
								var argument = exec(node.arguments[i]);

								if (argument.type === 'Value') {
									printArguments.push(argument.get());
								} else {
									throw node.arguments[i].error({
										type: ErrorType.TYPE_VIOLATION,
										message: 'Only concrete values (ex: booleans, numbers, strings) can be printed',
									});
								}
							}

							event('print', printArguments);
						} else {
							// get identifier's value from scope
							var fn = scope.get(node.callee);

							if (typeof fn === 'function') {
								// call global function
								var executedArguments = node.arguments.map(exec);
								return fn.apply({}, executedArguments);
							} else {
								// callee is not a function
								node.callee.error({
									type: ErrorType.TYPE_VIOLATION,
									message: '"' + calleeIdentifier + '" is not a function',
								});
							}
						}

						break;
					case 'IfStatement':
						var condition = exec(node.condition);

						if (condition.value === true) {
							// IF block
							pause(function() {
								return execBlock(node.ifBlock);
							});
						} else {
							// check ELIF or ELSE clauses
							var cases = [];

							if (node.elifBlocks !== null) {
								cases = node.elifBlocks;
							}

							if (node.elseBlock !== null) {
								cases.push(node.elseBlock);
							}

							var nextCase = function(cases) {
								if (cases.length > 0) {
									var thisCase = cases[0];

									if (thisCase.type === 'ElifStatement') {
										var elifCondition = exec(thisCase.condition);

										if (elifCondition.value === true) {
											// condition matches, execute this "elif" block
											pause(function() {
												return execBlock(thisCase.block);
											});
										} else {
											// condition did not match, try next block
											pause(function() {
												return nextCase(cases.slice(1));
											});
										}

										return {
											type: 'ElifStatement',
											line: thisCase.line,
										};
									} else if (thisCase.type === 'ElseStatement') {
										// execution of "else" block
										pause(function() {
											return execBlock(thisCase.block);
										});

										return {
											type: 'ElseStatement',
											line: thisCase.line,
										};
									}
								}
							};

							if (cases.length > 0) {
								pause(function() {
									return nextCase(cases);
								});
							}
						}

						break;
					case 'WhileStatement':
						var condition = exec(node.condition);
						var loop = function() {
							pause(function() {
								var newCondition = exec(node.condition);

								if (newCondition.value === true) {
									pause(function() {
										return execBlock(node.block, loop);
									});
								}

								return {
									type: 'WhileStatement',
									line: node.line,
								};
							});
						};

						if (condition.value === true) {
							pause(function() {
								return execBlock(node.block, loop);
							});
						}

						break;
				}
			}

			function execBlock(nodes, done) {
				if (nodes.length > 0) {
					var node = nodes[0];
					var detail = {
						type: node.type,
						line: getLine(node),
					};

					if (nodes.length > 1) {
						pause(function() {
							return execBlock(nodes.slice(1), done);
						});
					}

					exec(node);

					if (nodes.length === 1 && typeof done === 'function') {
						done();
					}

					return detail;
				}
			}

			function getLine(node) {
				return node.line;
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
					pause(function() {
						return execBlock(ast.body);
					});
				},

				next: function() {
					var fn = resume();

					if (typeof fn === 'function') {
						var expression = fn.apply({}, []);

						clearWaitingHooks(expression);

						return expression;
					} else {
						exitOnce();
						clearWaitingHooks(null);
						return null;
					}
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

		var defaultHooks = {
			print: function(arg) {
				console.log('PRINT: ' + arg);
			},
		};

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
					var MiniPyError = require('./error/error');
					var ErrorType = require('./error/errorType');

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
