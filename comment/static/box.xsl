<?xml version="1.0" encoding="ISO-8859-1"?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="no" omit-xml-declaration="yes" />

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
      </div>
    </div>
    <xsl:for-each select="./section">
      <xsl:variable name="pos" select="position()" />
      <xsl:apply-templates select=".">
	<xsl:with-param name="number" select="concat($number, concat('.', $pos))" />
      </xsl:apply-templates>
    </xsl:for-each>
    
    
  </xsl:template>
  
  <xsl:template match="warning">    
    <div class='warning'>
      	<b>Warning: </b><xsl:apply-templates select="*" />
    </div>
  </xsl:template>

  <xsl:template name="definitions">
    <xsl:for-each select="//def">
      <a href="#" ng-click="goto_loc('def_{@term}')"><xsl:value-of select="@term" /></a><xsl:if test="position()!=last()"><br /></xsl:if>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="code">
    <div class="code">
      <pre>
	<xsl:apply-templates />
      </pre>
    </div>
    <xsl:if test="count(./caption) > 0">
      <div class="code_caption"><xsl:value-of select="caption" /></div>
    </xsl:if>
  </xsl:template>

  <xsl:template match="python">
    <div ng-include="'sim/py/simpy.html'" ng-repeat="(simid,program) in {{'{count(preceding::python)}':'{text()}'}}">
    </div>
  </xsl:template>
  
  <xsl:template match="avrasm">
    <div ng-include="'sim/avr/simavr.html'" ng-repeat="program in ['{text()}']">
    </div>
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
    <div id="def_{@term}"> </div>
    <xsl:apply-templates select="*|text()" />
  </xsl:template>

  <xsl:template match="figure">
    <xsl:param name="number" />
    <div class="figure">
      <xsl:if test="@sk"><a href="drawings/{@sk}">View Sketch</a><br /></xsl:if>
      <!-- <img src="{@src}" alt="{description/text()}" /> -->
      <br />
      Filename: <!-- <xsl:value-of select="concat(/section/@number,'.',$number,'.fig',count(preceding-sibling::figure)+1,'.png')" /><br /> -->
      <xsl:value-of select="concat($number,'.fig',count(preceding-sibling::figure)+1,'.png')" /><br />
      <img src="{concat('drafts/',$number,'.fig',count(preceding-sibling::figure)+1,'.png')}">
	<xsl:attribute name="width">
	  <xsl:choose>
	    <xsl:when test="@width"><xsl:value-of select="@width" /></xsl:when>
	    <xsl:otherwise>800px</xsl:otherwise>
	  </xsl:choose>
	</xsl:attribute>
      </img>
      <xsl:if test="./description">
	<pre><xsl:value-of select="description/text()" /></pre>
      </xsl:if>
      <div class="caption">
	<xsl:value-of select="caption" />
      </div>
    </div>
  </xsl:template>


  <xsl:template match="chapter">
    <xsl:param name="number" select="position()" />
    <xsl:param name="file" select="concat('ch',$number,'.xml')" />
    <div class="chapter_index">
      <a href="{$file}"><h2><xsl:value-of select="$number" />: <xsl:value-of select="title" /></h2></a>
      <div class="description">
	<xsl:apply-templates select="description/*" />
      </div>
    </div>
  </xsl:template>
    
  <xsl:template match="toc">
    <div class="text">
    <div class="header">Table of Contents</div>
      <xsl:apply-templates select="./chapter" />
    </div>
  </xsl:template>

  
  <xsl:template match="/">
    <html>
      <head>
	<title><xsl:value-of select="chapter/title" /></title>
	<link rel="stylesheet" type="text/css" href="box.css" />
	<link rel="stylesheet" type="text/css" href="sim/py/sim.css" />
	<link rel="stylesheet" type="text/css" href="sim/avr/sim.css" />
	<link rel="stylesheet" href="sim/cm/codemirror.css" />
	<script type="text/javascript" src="https://code.angularjs.org/1.4.0-rc.2/angular.min.js"></script>
	<script type="text/javascript" src="https://code.angularjs.org/1.4.0-rc.2/angular-cookies.js"></script>
	<script type="text/javascript" src="box.js"></script>
	<script type="text/javascript" src="sim/cm/codemirror.js"></script>
	<script type="text/javascript" src="sim/py/expr_ng.js"></script>
	<script type="text/javascript" src="sim/py/sim.js"></script>
	<script type="text/javascript" src="sim/avr/sim.js"></script>
      </head>
      <body ng-app="app">	
	  
	<div id="super" ng-controller="BoxController">
	  <div class="sidebar" align="center">

	    
	    <a href="box.xml"><div style="font:12pt Sans serif;padding-bottom:5px;">Table of Contents</div></a>
	    <a href="#" ng-if="!signed_in" ng-click="show_login()"><div style="font:12pt Sans serif;padding-bottom:5px;">Sign in</div></a>
	    <a href="#" ng-if="signed_in" ng-click="sign_out()"><div style="font:12pt Sans serif;padding-bottom:5px;">Sign out {{username}}</div></a>
	    
	    <div style="font:9pt Sans serif;display:inline-block;">References:</div><br/>
	    <a href="#" ng-click="show_pyref()"><div style="font:12pt Sans serif;padding-bottom:5px;">Python</div></a>
	    <a href="#" ng-click="show_avrref()"><div style="font:12pt Sans serif;padding-bottom:5px;">AVR</div></a>

	    <div style="font:9pt Sans serif;display:inline-block;">Simulators:</div><br/>
	    <a href="#" ng-click="show_pysim()"><div style="font:12pt Sans serif;padding-bottom:5px;">Python</div></a>
	    <a href="#" ng-click="show_avrsim()"><div style="font:12pt Sans serif;padding-bottom:5px;">AVR</div></a>
	    
	    <div style="font:9pt Sans serif;display:inline-block;">This chapter:</div><br/>

	    <a href="#" ng-click="show_index()"><div style="font:12pt Sans serif;padding-bottom:5px;">Outline</div></a>
	    <a href="#" ng-click="show_definitions()"><div style="font:12pt Sans serif;padding-bottom:5px;">Definitions</div></a>
	    <a href="#" ng-click="toggle_comments()"><div style="font:12pt Sans serif;padding-bottom:5px;">Comments</div></a>
	    
	    <div style="font:9pt Sans serif;display:inline-block;padding-top:10px;">Other chapters:</div><br/>
	    
	    <a href="ch1.xml">
	      <div class="chapter_link" align="center">1<br/>
	      <div style="font:9pt Sans serif">Introduction</div>
	      </div>
	    </a>
	    <a href="ch2.xml">
	      <div class="chapter_link" align="center">2<br/>
	      <div style="font:9pt Sans serif">Programming</div>
	      </div>
	    </a>
	    <a href="ch3.xml">
	      <div class="chapter_link" align="center">3<br/>
	      <div style="font:9pt Sans serif">Advanced Programming</div>
	      </div>
	    </a>
	    <a href="ch4.xml">
	      <div class="chapter_link" align="center">4<br/>
	      <div style="font:9pt Sans serif">Numbers</div>
	      </div>
	    </a>
	    <a href="ch5.xml">
	      <div class="chapter_link" align="center">5<br/>
	      <div style="font:9pt Sans serif">ISA</div>
	      </div>
	    </a>
	    <a href="ch6.xml">
	      <div class="chapter_link" align="center">6<br/>
	      <div style="font:9pt Sans serif">Encodings and the ISA</div>
	      </div>
	    </a>
	    <a href="ch7.xml">
	      <div class="chapter_link" align="center">7<br/>
	      <div style="font:9pt Sans serif">Micro- architecture</div>
	      </div>
	    </a>
	    <a href="ch8.xml">
	      <div class="chapter_link" align="center">8<br/>
	      <div style="font:9pt Sans serif">Digital Logic</div>
	      </div>
	    </a>
	  </div>
	  <div class="index_container" ng-if="display_index == true || display_definitions == true || display_login == true || display_pysim == true || display_avrsim == true || display_pyref == true || display_avrref == true" ng-click="hide_all()">
	  </div>
	  <div class="index"  ng-if="display_index == true">
	    <h2>Chapter Outline:</h2>
	    <xsl:call-template name="index">
	      <xsl:with-param name="prefix" />
	    </xsl:call-template>
	  </div>
	  <div class="sim" ng-if="display_pyref == true">
	    <div ng-include="'sim/py/ref.html'">
	    </div>
	  </div>
	  <div class="sim" ng-if="display_avrref == true">
	    <div ng-include="'sim/avr/ref.html'">
	    </div>
	  </div>
	  
	  <div class="sim" ng-if="display_pysim == true">
	    <div ng-include="'sim/py/simpy.html'" ng-repeat="(simid,program) in {{'big':''}}">
	    </div>
	  </div>
	  <div class="sim" ng-if="display_avrsim == true">
	    <div ng-include="'sim/avr/simavr.html'" ng-repeat="(simid,program) in {{'big':''}}">
	    </div>
	  </div>
	  <div class="index" ng-if="display_definitions == true">
	    <h2>Terminology Index:</h2>
	    <xsl:call-template name="definitions" />
	  </div>
	  <div class="login"  ng-if="display_login == true">
	    <h2>Login:</h2>
	    <table>
	      <tr><td>Username: </td><td><input id="login_username" type="text" ng-keydown="$event.which === 13 &amp;&amp; $event.ctrlKey &amp;&amp; sign_in()" ng-model="login.username" /></td></tr>
	      <tr><td>Password: </td><td><input id="login_password" type="password" ng-keypress="$event.which === 13 &amp;&amp; sign_in()" ng-model="login.password" /></td></tr>
	    </table>
	    <button ng-click="sign_in()">Sign in</button><br /><br />
	    <a href="#">Forgot password</a><br />
	    <button>Second-factor sign-on</button>
	    <!-- <span class="login_message">{{login_message}}</span> -->
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
    <div class="comment_container" ng-include="'comment.html'" ng-repeat="par_id in ['{$par_id}']">
    </div>
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
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>
  
</xsl:stylesheet>
