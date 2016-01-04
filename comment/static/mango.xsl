<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="cmd|event">
	<xsl:param name="len" />
	<xsl:choose>
		<xsl:when test="$len='short'">
			<div>
				<xsl:attribute name="class">
					entry 
					<xsl:choose>
						<xsl:when test="position() mod 2 = 0">even </xsl:when>
						<xsl:otherwise>odd </xsl:otherwise>
					</xsl:choose>
				</xsl:attribute>
					<a>
					<xsl:attribute name="href">#<xsl:value-of select="@name"/></xsl:attribute>
					<xsl:for-each select="return"><xsl:value-of select="@name" /><xsl:if test="position()!=last()">, </xsl:if>
					<xsl:if test="position()=last()">&#xa0;</xsl:if></xsl:for-each>
					<b><xsl:value-of select="@name"/></b>
					<xsl:if test="name()='cmd'">(<xsl:for-each select="arg"><xsl:value-of select="@name" />
					<xsl:if test="@default!=''">='<xsl:value-of select="@default" />'</xsl:if>
					<xsl:if test="position()!=last()">, </xsl:if></xsl:for-each>)</xsl:if></a>: 
				<div class="short_description">
					<xsl:value-of select="text()" />
				</div>
			</div>
		</xsl:when>
		<xsl:otherwise>
			<div class="long_entry">
				<a><xsl:attribute name="name"><xsl:value-of select="@name"/></xsl:attribute></a>
				<div style="float:left;width:120px"><b><xsl:value-of select="@name"/></b> </div>
				<div style="float:left;padding-left:10px;display:inline-block;max-width:480px;">
					<b>Descrption: </b> <xsl:value-of select="text()" /><br /><br />
					<xsl:if test="count(arg) &gt; 0">
						<b>Arguments: </b>
						<ul>
							<xsl:for-each select="arg">
								<li>
									<xsl:value-of select="@name" />: 
									<xsl:apply-templates select="text()|./*" /><br />	
									<xsl:if test="@default!=''"><br />Default value: '<xsl:value-of select="@default" />'</xsl:if>
									<xsl:if test="@allowed!=''"><br />Allowed values: '<xsl:value-of select="@allowed" />'</xsl:if></li>
							</xsl:for-each>
						</ul>
					</xsl:if>
					<xsl:if test="count(return) &gt; 0">
						<b>Returns: </b>
						<ul>
							<xsl:for-each select="return">
								<li><xsl:value-of select="@name" />: <xsl:value-of select="text()" /></li>
							</xsl:for-each>
						</ul>
					</xsl:if>
				</div><br />
			</div><br />
		</xsl:otherwise>
	</xsl:choose>

</xsl:template>

<xsl:template match="interface">
	<h2>Description</h2><pre><xsl:value-of select="text()" /></pre><h2>Summary</h2>
	<xsl:if test="count(cmd) &gt; 0">
		<b>Commands:</b>
		<xsl:apply-templates select="cmd"><xsl:with-param name="len">short</xsl:with-param></xsl:apply-templates>
		<br />
	</xsl:if>
	<xsl:if test="count(evt) &gt; 0">
		<b>Events:</b>
		<xsl:apply-templates select="event"><xsl:with-param name="len">short</xsl:with-param></xsl:apply-templates>
		<br />
	</xsl:if>
	<h2>Detail</h2>
	<xsl:if test="count(cmd) &gt; 0">
		<b>Commands:</b><br />
		<xsl:apply-templates select="cmd" />
		<br />
	</xsl:if>
	<xsl:if test="count(event) &gt; 0">
		<b>Events:</b>
		<xsl:apply-templates select="event"/>
	</xsl:if>
</xsl:template>

<xsl:template match="pre">
  <xsl:copy>
    <xsl:value-of select="text()" />
  </xsl:copy>
</xsl:template>

<xsl:template match="@*|node()">
  <xsl:copy>
    <xsl:apply-templates select="@*|node()" />
  </xsl:copy>
</xsl:template>

<xsl:template match="/">
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="/suit/mango.css" />
		<title>Interface</title></head>
	<body>
		<xsl:apply-templates select="/interface" />
	</body>
</html>
</xsl:template>
</xsl:stylesheet>

