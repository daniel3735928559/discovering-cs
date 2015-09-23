
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
"["                    return '['
"]"                    return ']'
","                    return ','
">"                    return '>'
"<"                    return '<'
"="                    return '='
"!"                    return '!'
"and"|"or"|"True"|"False"|"in"             return 'KEYWORD'
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
    | test EOF
        { typeof console !== 'undefined' ? console.log($1) : print($1);
          return $1; }
    ;

e
    : e '+' e
        {$$ = ['add',$1,$3];}
    | e '-' e
        {$$ = ['sub',$1,$3];}
    | e '*' e
        {$$ = ['mul',$1,$3];}
    | e '/' e
        {$$ = ['div',$1,$3];}
    | e '%' e
        {$$ = ['mod',$1,$3];}
    | '-' e %prec UMINUS
        {$$ = ['neg',$2];}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = ['val',Number(yytext)];}
    | STRING
        {$$ = ['val',$1.substring(1,yytext.length-1)];}
    | VAR '[' e ']'
        {$$ = ['arr_val',['name',$1],$3];}
    | VAR
        {$$ = ['val',$scope.get_variable(yytext)];}
    | VAR '(' elements ')'
        {
	    if($1 == "len") $$ = ['len',$3];
	    else $$ = ['call',['name',$1],['array'].concat($3)];
	}
    | '[' elements ']'
        {$$ = ['array'].concat($2);}
    | '[' ']'
        {$$ = ['val',[]];}
    ;

test
    : e '>' e
        {$$ = ['gt',$1, $3];}
    | e '<' e
        {$$ = ['lt',$1, $3];}
    | e '!' '=' e
        {$$ = ['neq',$1, $4];}
    | e '=' '=' e
        {$$ = ['eq',$1, $4];}
    | e '>' '=' e
        {$$ = ['geq',$1, $4];}
    | e '<' '=' e
        {$$ = ['leq',$1, $4];}
    | '(' test ')'
        {$$ = $2;}
    | test KEYWORD test
        {console.log($2);
	if($2 == "and") $$ = ['bool_and',$1, $3];
	else if($2 == "or") $$ = ['bool_or',$1, $3];
	else $$ = {};}
    ;

elements
    : elements ',' e
        {$$ = $1.concat([$3]);}
    | e
        {$$ = [$1];}
    ;