
/* description: Parses and executes mathematical expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[0-9]+("."[0-9]+)?     return 'NUMBER'
"*"                    return '*'
"/"                    return '/'
"-"                    return '-'
"+"                    return '+'
"%"                    return '%'
"("                    return '('
")"                    return ')'
[a-zA-Z_][a-zA-Z_0-9]* return 'VAR'
\"((\\.|[^\"])*)\"     return 'STRING'
<<EOF>>                return 'EOF'
.                      return 'INVALID'

/lex

/* operator associations and precedence */

%left '+' '-'
%left '*' '/' '%'
%left UMINUS

%start expressions

%% /* language grammar */

expressions
    : e EOF
        { typeof console !== 'undefined' ? console.log($1) : print($1);
          return $1; }
    ;

e
    : e '+' e
        {$$ = $1+$3;}
    | e '-' e
        {$$ = $1-$3;}
    | e '*' e
        {$$ = $1*$3;}
    | e '/' e
        {$$ = $1/$3;}
    | e '%' e
        {$$ = $1%$3;}
    | '-' e %prec UMINUS
        {$$ = -$2;}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number(yytext);}
    | STRING
        {$$ = $1.substring(1,yytext.length-1);}
    | VAR
        {$$ = $scope.get_variable(yytext);}
    ;

