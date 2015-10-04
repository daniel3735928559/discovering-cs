<?xml version="1.0" encoding="ISO-8859-1"?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="no" omit-xml-declaration="yes" />
  <xsl:param name="print" />

  <xsl:key name="section_key" match="section" use="title" />
  
  <xsl:template match="section">
    <xsl:param name="number">
      <xsl:if test="@number"><xsl:value-of select="@number" /></xsl:if> 
    </xsl:param>
    <div class="section">
      <div id="sec_{translate($number,'.','_')}"> </div>
      <xsl:variable name="title" select="title" />
      <div class="text">
	<div class="header">
	  <xsl:value-of select="$number" />: 
	  <xsl:value-of select="title" />
	</div>
	
	<xsl:if test="count(./summary) > 0">
	  <div class="summary">
	    <xsl:apply-templates select="summary" />
	    <xsl:if test="count(.//def[string(ancestor::section[1]/title)=$title]) != 0">
	      <br /><br /><b>Definitions: </b> 
	      <xsl:for-each select=".//def[string(ancestor::section[1]/title)=$title]">
		<a href="#def_{@term}"><xsl:value-of select="@term" /></a><xsl:if test="position()!=last()">, </xsl:if>
	      </xsl:for-each>
	    </xsl:if>
	  </div>
	</xsl:if>
	
	<xsl:apply-templates select="text/*">
	  <xsl:with-param name="number" select="$number" />
	</xsl:apply-templates>
	
	<xsl:apply-templates select="exercises" />
      </div>
    </div>
    <xsl:for-each select="./section">
      <xsl:variable name="pos" select="position()" />
      <xsl:apply-templates select=".">
	<xsl:with-param name="number" select="concat($number, concat('.', $pos))" />
      </xsl:apply-templates>
    </xsl:for-each>
    
    
  </xsl:template>

  <xsl:template match="exercises">
    <xsl:apply-templates select="document(concat('hw/hw',/section/@number,'.xml'))/homework/hw">
      <xsl:with-param name="qnum" select="/section/@number" />
    </xsl:apply-templates>
  </xsl:template>
  
  <xsl:template match="hw">
    <xsl:param name="qnum" />
    <xsl:apply-templates select="q">
      <xsl:with-param name="qnum" select="$qnum" />
      <!-- <xsl:with-param name="index"/> -->
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="q">
    <xsl:param name="qnum" />
    <xsl:param name="index" select="position()"/>
    <xsl:variable name="num" select="concat($qnum,'.',$index)" />
    <div class="hwq">
      <div class="hwnum"><b><xsl:value-of select="$num" />: </b></div>
      <div class="hwcontent">
      <xsl:apply-templates select="*[name()!='q']|text()">
	<xsl:with-param name="q_name" select="concat('eoc_exc_',$qnum,'.',$index)" />
      </xsl:apply-templates>
      <xsl:for-each select="q">
	<xsl:variable name="subindex"><xsl:number value="position()" format="a" /></xsl:variable>
	<p><b><xsl:value-of select="concat($num,'.',$subindex)" />: </b>
	<xsl:apply-templates select="*|text()" /></p>
      </xsl:for-each>
      

      </div>
      
    </div>
  </xsl:template>

  <xsl:template match="ans">
    <xsl:param name="q_name" />
    <xsl:if test="$print!='yes'">
      <div class="exc_toggle" ng-init="toggles['{$q_name}'] = false" ng-click="exc_toggle('{$q_name}')">Show answer</div>
	<div class="exc_toggleable" ng-if="toggles['{$q_name}'] == true">
	  <xsl:apply-templates select="*|text()" />
	</div>
      </xsl:if>
      <xsl:if test="$print='yes'">
	<b>Answer: </b><br />
	<xsl:apply-templates select="*|text()" />
      </xsl:if>
  </xsl:template>
  
  <xsl:template match="warning">
    <div class='warning'>
      	<b>Warning: <xsl:value-of select="@title" /></b><xsl:apply-templates select="*|text()" />
    </div>
  </xsl:template>

  <xsl:template match="footnote">
    <a href="/text/info/links.xml"><sup>[<xsl:value-of select="count(preceding::footnote)+1" />]</sup></a>
  </xsl:template>

  <xsl:template match="exercise">
    <xsl:variable name="exc_name" select="@name" />

    <xsl:if test="$print!='yes'">
      <div class="exc_toggle" ng-init="toggles['{$exc_name}'] = false" ng-click="exc_toggle('{$exc_name}')">
	<xsl:apply-templates select="question/*|question/text()" />
      </div>
      <div class="exc_toggleable" ng-if="toggles['{$exc_name}'] == true">
	<xsl:apply-templates select="answer/*|answer/text()" />
      </div>
    </xsl:if>
    <xsl:if test="$print='yes'">
      <font color="blue"><u><xsl:apply-templates select="question/*|question/text()" /></u></font><br />
      <xsl:apply-templates select="answer/*|answer/text()" />
    </xsl:if>

    
  </xsl:template>
 
  
  <xsl:template match="aside">    
    <div class='aside'>
      	<b>Aside: <xsl:value-of select="@title" /></b><xsl:apply-templates select="*|text()" />
    </div>
  </xsl:template>

  <xsl:template name="definitions">
    <xsl:for-each select="//def">
      <a href="#" ng-click="goto_loc('def_{@term}')"><xsl:value-of select="@term" /></a><xsl:if test="position()!=last()"><br /></xsl:if>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="code">
    <div class="code"><pre><xsl:apply-templates select="text()|*[name()!='caption']" /></pre>
    </div>
    <xsl:if test="count(./caption) > 0">
      <div class="code_caption"><xsl:value-of select="caption" /></div>
    </xsl:if>
  </xsl:template>

  <xsl:template match="icode">
    <div class="icode"><xsl:apply-templates /></div>
  </xsl:template>

  <xsl:template match="python">
    <xsl:if test="$print!='yes'">
      <div ng-include="'/sim/py/minipy/embedded/minipy.html'" ng-repeat="(simid,program) in {{'{count(preceding::python)}':'{text()}'}}">
      </div>
    </xsl:if>
    <xsl:if test="$print='yes'">
      <div class="code"><pre><xsl:apply-templates /></pre></div>
    </xsl:if>
  </xsl:template>

  <xsl:template match="binsim">
    <xsl:if test="$print!='yes'">
      <div id="binsim_super" ng-controller="BinSimController">
	<div class="binsim_input_div" ng-include="'/sim/bin/sim.html'">
	</div>
      </div>
    </xsl:if>
    <xsl:if test="$print='yes'">
      <div class="code"><pre>[Binary simulator goes here in website version]</pre></div>
    </xsl:if>
  </xsl:template>
      
  <xsl:template match="avrasm">
    <xsl:if test="$print!='yes'">
      <div ng-include="'/sim/avr/simavr.html'" ng-repeat="program in ['{text()}']"></div>
    </xsl:if>
    <xsl:if test="$print='yes'">
      <div class="code"><pre><xsl:apply-templates /></pre></div>
    </xsl:if>
    
  </xsl:template>
  
  <xsl:template name="index">
    <xsl:param name="prefix" />
    <div style="margin-left:5px;" class="index_div">
      <xsl:for-each select="./section">
	<xsl:variable name="place"><xsl:value-of select="$prefix" /><xsl:if test="$prefix!=''">.</xsl:if><xsl:choose><xsl:when test="@number"><xsl:value-of select="@number" /></xsl:when><xsl:otherwise><xsl:value-of select="position()" /></xsl:otherwise></xsl:choose></xsl:variable>
	<xsl:variable name="href" select="translate($place, '.', '_')" />
	<a href="#" ng-click="goto_loc('sec_{$href}')"><xsl:value-of select="$place" />: <xsl:value-of select="./title" /></a><br />
	<xsl:call-template name="index"><xsl:with-param name="prefix" select="$place" /></xsl:call-template>
      </xsl:for-each>
    </div>
  </xsl:template>
  
  <xsl:template match="summary">
    <b>Summary: </b><xsl:apply-templates select="*|text()" />
  </xsl:template>

  <xsl:template match="title">
    <xsl:value-of select="." />
  </xsl:template>

  <xsl:template match="chapter">
      <xsl:apply-templates select="*[name()!='summary' and
				   name()!='section' and name()!='title']" />
      <xsl:for-each select="./section">
	<xsl:variable name="pos" select="position()" />
	  <xsl:apply-templates>
	    <xsl:with-param name="number" select="$pos" />
	  </xsl:apply-templates>
      </xsl:for-each>
  </xsl:template>

  <xsl:template match="def">
    <div id="def_{@term}" class="definition"> </div>
    <xsl:apply-templates select="*|text()" />
  </xsl:template>

  <xsl:template match="figure">
    <xsl:param name="number" />
    <div class="figure">
      <!-- <xsl:if test="@sk"><a href="drawings/{@sk}">View Sketch</a><br /></xsl:if> -->
      <!-- <img src="{@src}" alt="{description/text()}" /> -->
      <!-- <br /> -->
      <!-- <xsl:value-of select="concat(/section/@number,'.',$number,'.fig',count(preceding-sibling::figure)+1,'.png')" /><br /> -->

      <img src="{concat('/text/figures/',$number,'.fig',count(preceding-sibling::figure)+1,'.png')}">
	<xsl:attribute name="width">
	  <xsl:choose>
	    <xsl:when test="@width"><xsl:value-of select="@width" /></xsl:when>
	    <xsl:otherwise>800px</xsl:otherwise>
	  </xsl:choose>
	</xsl:attribute>
      </img>
      <!-- <xsl:if test="./description"> -->
      <!-- 	<pre><xsl:value-of select="description/text()" /></pre> -->
      <!-- </xsl:if> -->
      <div class="caption">Figure <xsl:value-of select="concat($number,'.',count(preceding-sibling::figure)+1)" />: <xsl:value-of select="caption" /></div>
    </div>
  </xsl:template>


  <xsl:template match="chapter">
    <xsl:param name="number" select="position()" />
    <xsl:param name="file" select="concat('ch',$number,'.xml')" />
    <div class="chapter_index">
      <h2><a href="/text/{$file}"><xsl:value-of select="$number" />: <xsl:value-of select="title" /></a></h2>
      <div class="description">
	<xsl:apply-templates select="description/*" />
      </div>
    </div>
  </xsl:template>
    
  <xsl:template match="toc">
    <div class="text">
      <div class="book_title"><xsl:value-of select="./title" /></div>
      <div class="book_subtitle"><xsl:apply-templates select="subtitle/*|subtitle/text()" /></div>
      <div class="header">Table of Contents</div>
      <xsl:apply-templates select="./chapter" />
    </div>
  </xsl:template>

  
  <xsl:template match="/">
    <html>
      <head>
	<title><xsl:value-of select="chapter/title" /></title>
	<link rel="stylesheet" type="text/css" href="/text/box.css" />
	<link rel="stylesheet" type="text/css" href="/sim/avr/sim.css" />
	<link rel="stylesheet" type="text/css" href="/sim/bin/sim.css" />
	<link rel="stylesheet" href="/sim/cm/theme/paraiso-light.css" />
	<script type="text/javascript" src="https://code.angularjs.org/1.4.0-rc.2/angular.min.js"></script>
	<script type="text/javascript" src="https://code.angularjs.org/1.4.0-rc.2/angular-cookies.js"></script>
	<script type="text/javascript" src="/text/box.js"></script>
	<script type="text/javascript" src="/sim/cm/codemirror.js"></script>
	<!-- <script type="text/javascript" src="/sim/py/expr_ng.js"></script> -->
	<!-- <script type="text/javascript" src="/sim/py/sim.js"></script> -->
	<link rel="stylesheet" type="text/css" href="/lib/spy/sim.css" />
	<script type="text/javascript" src="/lib/spy/expr_ng.js"></script>
	<script type="text/javascript" src="/lib/spy/sim.js"></script>
	
	<!-- <script type="text/javascript" src="/sim/avr/sim.js"></script> -->
	<script type="text/javascript" src="/sim/bin/sim.js"></script>

  <!-- MiniPy stylesheets -->
  <link rel="stylesheet" type="text/css" href="/sim/py/MiniPy/main.css" />
  <link rel="stylesheet" type="text/css" href="/sim/py/MiniPy/embedded/css/embedded.css" />
  <link rel="stylesheet" type="text/css" href="/sim/py/MiniPy/libs/CodeMirror/codemirror.css" /> <!-- v5.6 -->
  <link rel="stylesheet" type="text/css" href="/sim/py/MiniPy/libs/CodeMirror/theme/neat.css" />

  <!-- MiniPy javascript -->
  <script type="text/javascript" src="/sim/py/MiniPy/libs/CodeMirror/codemirror.js"></script> <!-- v5.6 -->
  <script type="text/javascript" src="/sim/py/MiniPy/libs/CodeMirror/mode/python/python.js"></script>
  <script type="text/javascript" src="/sim/py/MiniPy/libs/jQuery/jquery.min.js"></script> <!-- v2.1.4 -->
  <script type="text/javascript" src="/sim/py/MiniPy/libs/minipy.js"></script>

  <script type="text/javascript" src="/sim/py/MiniPy/embedded/js/miniPyController.js"></script>
  <script type="text/javascript" src="/sim/py/MiniPy/js/banner.js"></script>
  <script type="text/javascript" src="/sim/py/MiniPy/js/error.js"></script>
  <script type="text/javascript" src="/sim/py/MiniPy/js/state.js"></script>
      </head>
      <body ng-app="app">	
	<div id="super" ng-controller="BoxController">

	  <xsl:if test="$print!='yes'">
	    <div class="sidebar">

	    
	    <!-- <a href="#" ng-if="!signed_in" ng-click="show_login()"><div style="font:12pt Sans serif;padding-bottom:5px;">Sign in</div></a> -->
	    <!-- <a href="#" ng-if="signed_in" ng-click="sign_out()"><div style="font:12pt Sans serif;padding-bottom:5px;">Sign out {{username}}</div></a> -->
	    	    
	    <!-- <a href="#" ng-click="toggle_comments()"><div style="font:12pt Sans serif;padding-bottom:5px;">Comments</div></a> -->
	    
	    <div class="sidebar_header">Book:</div>
	    <table class="chapter_links">
	    <tr><td>0</td><td><a href="/text/box.xml">Title page</a></td></tr>
	    <tr><td>1</td><td><a href="/text/ch1.xml">Introduction</a> (<a class="print_link" href="/text/print/ch1.pdf">PDF</a>)</td></tr>
	    <tr><td>2</td><td><a href="/text/ch2.xml">Programming</a> (<a class="print_link" href="/text/print/ch2.pdf">PDF</a>)</td></tr>
	    <tr><td>3</td><td><a href="/text/ch3.xml">Advanced Programming</a> (<a class="print_link" href="/text/print/ch3.pdf">PDF</a>)</td></tr>
	    <tr><td>4</td><td><a href="/text/ch4.xml">Numbers</a> (<a class="print_link" href="/text/print/ch4.pdf">PDF</a>)</td></tr>
	    <tr><td>5</td><td><a href="/text/ch5.xml">ISA</a> (<a class="print_link" href="/text/print/ch5.pdf">PDF</a>)</td></tr>
	    <tr><td>6</td><td><a href="/text/ch6.xml">Encodings</a> (<a class="print_link" href="/text/print/ch6.pdf">PDF</a>)</td></tr>
	    <tr><td>7</td><td><a href="/text/ch7.xml">Micro&#173;architecture</a> (<a class="print_link" href="/text/print/ch7.pdf">PDF</a>)</td></tr>
	    <tr><td>8</td><td><a href="/text/ch8.xml">Digital Logic</a> (<a class="print_link" href="/text/print/ch8.pdf">PDF</a>)</td></tr>
	    </table>
	    
	    <xsl:if test="number(/section/@number) >= 1">
	      <div class="sidebar_header">This chapter:</div>
	      <a href="#" ng-click="show_index()"><div class="sidebar_link">Outline</div></a>
	      <a href="#" ng-click="show_definitions()"><div class="sidebar_link">Definitions</div></a>
	    </xsl:if>
	    
	    <div class="sidebar_header">Course:</div>
	    <a href="http://pages.cs.wisc.edu/~karu/courses/cs252/fall2015/wiki/index.php"><div class="sidebar_link">Homepage</div></a>
	    <a href="/homework"><div class="sidebar_link">Online HW</div></a>
	    <a href="/homework/rating.html"><div class="sidebar_link">Rate lecture</div></a>
	    
	    <div class="sidebar_header">Simulators:</div>
	    <a href="/sim/py/python.html"><div class="sidebar_link">Python</div></a>
	    <a href="/sim/bin/bin.html"><div class="sidebar_link">Binary</div></a>
	    <a href="/sim/avr/avr.html"><div class="sidebar_link">AVR</div></a>

	    <div class="sidebar_header">Additional:</div>
	    <a href="/text/info/authors.xml"><div class="sidebar_link">Authors</div></a>
	    <a href="/text/info/acknowledgements.xml"><div class="sidebar_link">Contributors</div></a>
	    <a href="/text/info/copyright.xml"><div class="sidebar_link">Copyright</div></a>
	    <a href="/text/info/links.xml"><div class="sidebar_link">Links</div></a>
	    </div>
	  </xsl:if>
	  <div class="index_container" ng-if="display_index == true || display_definitions == true || display_login == true || display_pysim == true || display_avrsim == true || display_pyref == true || display_avrref == true || display_binary_expl == true" ng-click="hide_all()">
	  </div>
	  <div class="index"  ng-if="display_index == true">
	    <h2>Chapter Outline:</h2>
	    <xsl:call-template name="index">
	      <xsl:with-param name="prefix" />
	    </xsl:call-template>
	  </div>
	  <div class="index" ng-if="display_definitions == true">
	    <h2>Terminology Index:</h2>
	    <xsl:call-template name="definitions" />
	  </div>
	  
	  <div class="super">
	    <xsl:apply-templates select="@*|node()"/>
	  </div>
	</div>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="p">
    <xsl:param name="number" />
    <xsl:variable name="par_id" select="concat($number,'.',name(),position())" />
    <!-- <div class="comment_container" ng-include="'comment.html'" ng-repeat="par_id in ['{$par_id}']"> -->
    <!-- </div> -->
    <p>
      <xsl:apply-templates select="@*|node()">
	<xsl:with-param name="number" select="$number" />	
      </xsl:apply-templates>
    </p>
  </xsl:template>
  
  <xsl:template match="@*|node()">
    <xsl:param name="number" />
    <xsl:copy>
      <xsl:apply-templates select="@*|node()">
	<xsl:with-param name="number" select="$number" />	
	<xsl:with-param name="print" select="$print" />	
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>
  
</xsl:stylesheet>
