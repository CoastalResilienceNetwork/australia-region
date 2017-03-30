require({
    // Specify library locations.
    packages: [
        {
            name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        }
    ]
});

app = {}

define([
	"dojo/_base/declare", "framework/PluginBase", "plugins/natural_defenses/ConstrainedMoveable", "plugins/natural_defenses/jquery-ui-1.11.0/jquery-ui",
		
	"esri/request", "esri/layers/ArcGISDynamicMapServiceLayer",	"esri/layers/ImageParameters", "esri/tasks/query",	"esri/geometry/Extent", "esri/SpatialReference",
	"esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/layers/FeatureLayer", "dojo/_base/Color",
	"esri/geometry/Point", "esri/graphic",
	
	"dijit/form/Button", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/form/Select", "dojo/dom", "dojo/dom-class", "dojo/dom-style", 
	"dojo/_base/window", "dojo/dom-construct", "dojo/dom-attr", "dojo/dom-geometry", "dojo/_base/array", "dojo/_base/lang", "dojo/domReady!", "dojo/on", 
	"dojo/query", "dojo/parser", "dojo/NodeList-traverse",
        
	"dojo/text!./naturaldefenses.json"
],
function (declare, PluginBase, ConstrainedMoveable, ui,	
	
	ESRIRequest, ArcGISDynamicMapServiceLayer, ImageParameters, esriQuery, Extent, SpatialReference, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol,
	FeatureLayer, Color, Point, Graphic,
	
	Button, ContentPane, TabContainer, Select, dom, domClass, domStyle, win, domConstruct, domAttr, domGeom, array, lang, domReady, on, dojoquery, parser,
	domNodeTraverse,

	explorer
){
	return declare(PluginBase, {
		toolbarName: "Natural Defense Projects",
        toolbarType: "sidebar",
		showServiceLayersInLegend: true,
        allowIdentifyWhenActive: false,
		rendered: false,
		infoGraphic: "plugins/natural_defenses/cd_info.jpg",
		height: 300,
        
		initialize: function (frameworkParameters) {
				
			declare.safeMixin(this, frameworkParameters);
			domClass.add(this.container, "claro");
			this.config = dojo.eval("[" + explorer + "]")[0];
			this.controls = this.config.controls
			
			con = dom.byId('plugins/natural_defenses-0');
			domStyle.set(con, "width", "310px");
			domStyle.set(con, "height", "278px");
			
			con1 = dom.byId('plugins/natural_defenses-1');
			if (con1 != undefined){
				domStyle.set(con1, "width", "310px");
				domStyle.set(con1, "height", "278px");
			}
			
			if (this.config.betweenGroups == undefined) {
				this.config.betweenGroups = "+";
			}
			
			pslidernode = domConstruct.create("span", { id: "big", innerHTML: "<span style='padding:0px;'> </span>" });
			dom.byId(this.container).appendChild(pslidernode); 
				
			nslidernode = domConstruct.create("span");
			dom.byId(this.container).appendChild(nslidernode); 
			
			this.refreshnode = domConstruct.create("span", {style: "display:none"});
			
			domClass.add(this.refreshnode, "plugin-report-spinner");

			dom.byId(this.container).appendChild(this.refreshnode);
					
			a = dojoquery(this.container).parent();
					
			this.infoarea = new ContentPane({
				style:"z-index:10000; !important;position:absolute !important;left:310px !important;top:0px !important;width:350px !important;background-color:#FFF !important;padding:10px !important;border-style:solid;border-width:4px;border-color:#444;border-radius:5px;display: none",
				innerHTML: "<div class='infoareacloser' style='float:right !important'><a href='#'>✖</a></div><div class='infoareacontent' style='padding-top:5px'>no content yet</div>"
			});
					
			dom.byId(a[0]).appendChild(this.infoarea.domNode)
					
			ina = dojoquery(this.infoarea.domNode).children(".infoareacloser");
			this.infoAreaCloser = ina[0];

			inac = dojoquery(this.infoarea.domNode).children(".infoareacontent");
			this.infoareacontent = inac[0];

			on(this.infoAreaCloser, "click", lang.hitch(this,function(e){
				domStyle.set(this.infoarea.domNode, 'display', 'none');
			}));	
		},
		
		activate: function () { 
			if (this.rendered == false) {
				this.rendered = true;
				this.render();
				this.currentLayer.setVisibility(true);
			} else {
				if (this.currentLayer != undefined)  {
					this.currentLayer.setVisibility(true);	
				}
				this.resize();
			}
		},
        
		deactivate: function () { 
			
		},
			   
		hibernate: function () { 
			if (this.currentLayer != undefined)  {
				this.currentLayer.setVisibility(false);
			}
			if (this.flClick != undefined) {
				this.map.removeLayer(this.flClick);
			}
			if (this.flHover != undefined) {
				this.map.removeLayer(flHover);
			}
			if (this.sliderpane != undefined) { 
				this.sliderpane.destroy();
			}
			if (this.tabarea != undefined) {
				this.tabarea.destroy();
			}
			if (this.buttonpane != undefined) { 
				this.buttonpane.destroy();
			}	
			this.rendered = false;
		},
			   
		resize: function(w, h) {
			cdg = domGeom.position(this.container);
			if (cdg.h == 0) {
				this.sph = this.height - 112	 
			} 
			else {
				this.sph = cdg.h-50;
			}
			domStyle.set(this.sliderpane.domNode, "height", this.sph + "px");
		},
			   
		
				
		render: function() {
			if (this.sliderpane != undefined) { 
				this.sliderpane.destroy();
				this.map.removeLayer(this.currentLayer)
			}
					
			this.sliderpane = new ContentPane({});
					
			dom.byId(this.container).appendChild(this.sliderpane.domNode);
			
			//tab container
			mymap = dom.byId(this.map.id);
			a = dojoquery(mymap).parent();
			this.b = makeid();
			
			this.tabarea = new ContentPane({
			  id: this.b,
			  style:"display:none; z-index:8; position:absolute; right:105px; top:60px; width:430px; background-color:#FFF; border-style:solid; border-width:4px; border-color:#444; border-radius:5px;",
			  innerHTML: "<div class='tabareacloser' style='float:right !important;'><a href='#' style='color:#cecfce'>✖</a></div><div id='" + this.sliderpane.id + "tabHeader' style='background-color:#424542; color:#fff; height:28px; font-size:1em; font-weight:bold; padding:8px 0px 0px 10px; cursor:move;'>Identify Results</div>" +	
			             "<div id='" + this.sliderpane.id + "tabs' class='tabdiv'>" +
						  "<ul>" +
							"<li><a href='#" + this.sliderpane.id + "tabs-1'>Overview</a></li>" +
							"<li><a href='#" + this.sliderpane.id + "tabs-2'>Effectiveness</a></li>" +
							"<li><a href='#" + this.sliderpane.id + "tabs-3'>Site Characteristics</a></li>" +
							"<li><a href='#" + this.sliderpane.id + "tabs-4'>Project Details</a></li>" +
						  "</ul>" +
						  "<div id='" + this.sliderpane.id + "tabs-1'>" +
							"<p>First</p>" +
						  "</div>" +
						  "<div id='" + this.sliderpane.id + "tabs-2'>" +
							"<p>Second</p>" +
						  "</div>" +
						  "<div id='" + this.sliderpane.id + "tabs-3'>" +
							"<p>Third</p>" +
						  "</div>" +
						  "<div id='" + this.sliderpane.id + "tabs-4'>" +
							"<p>Third</p>" +
						  "</div>" +
						"</div>" 	
			});
					
			dom.byId(a[0]).appendChild(this.tabarea.domNode)
			
			ta = dojoquery(this.tabarea.domNode).children(".tabareacloser");
				this.tabareacloser = ta[0];

			tac = dojoquery(this.tabarea.domNode).children(".tabareacontent");
			this.tabareacontent = tac[0];
								
			on(this.tabareacloser, "click", lang.hitch(this,function(e){
				domStyle.set(this.tabarea.domNode, 'display', 'none');
				this.flClick.clear();
				this.config.idenGraphic = "";
				this.config.idenAtts = "";
			}));
			
			$( '#' + this.sliderpane.id + 'tabs' ).tabs();
			var config = this.config;
			$( '#' + this.sliderpane.id + 'tabs' ).on( "tabsactivate", function( event, ui ) {
				config.tabSelected = ui.newTab.index();
				this.config = config;
			});
			
			var p = new ConstrainedMoveable(
				dom.byId(this.tabarea.id), {
				handle: dom.byId(this.sliderpane.id + "tabHeader"),	
				within: true
			});
				
			this.buttonpane = new ContentPane({
				style:"border-top-style:groove !important; height:40px; overflow: hidden !important; padding:2px !important;"
			});				
			dom.byId(this.container).appendChild(this.buttonpane.domNode);
			
			var projectDesc = this.config.projectDesc
			if (projectDesc != undefined) {
				pdButton = new Button({
					label: "Project Description",
					style:  "float:left !important; margin-top:7px; margin-left:26px;",
					onClick: function(){
						window.open(projectDesc)
					}
				});
				this.buttonpane.domNode.appendChild(pdButton.domNode);
			}
			var methods = this.config.methods
			if (methods != undefined) {
				methodsButton = new Button({
					label: "Supplementary Info",
					style:  "float:left !important; margin-top:7px;",
					onClick: function(){window.open(methods)}
				});
				this.buttonpane.domNode.appendChild(methodsButton.domNode);
			}
			
			if (this.config.globalText != undefined) {
				explainText = domConstruct.create("div", {style:"margin-top:-5px;margin-bottom:10px", innerHTML: this.config.globalText});
				this.sliderpane.domNode.appendChild(explainText);
			}
			
			array.forEach(this.controls, lang.hitch(this,function(entry, i){
				if (entry.type == "text") {
					nslidernodeheader = domConstruct.create("div", {style:"margin-top:5px;margin-bottom:7px", innerHTML: entry.text});
					this.sliderpane.domNode.appendChild(nslidernodeheader);	
				} 
				if (entry.type == "select1") {
					maindiv = domConstruct.create("div", {id: this.sliderpane.id + entry.type, style:"margin-top:10px; margin-bottom:10px;", innerHTML: "<b>" + entry.header + "</b>"});
					this.sliderpane.domNode.appendChild(maindiv);
					
					spacer = domConstruct.create("div", {style:"height:5px"});
					maindiv.appendChild(spacer);
					
					fieldSelect = domConstruct.create("div", {id: this.sliderpane.id + entry.name, style:"margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(fieldSelect);	
					this.symSelect = new Select({
						name: entry.name,
						style: "width: 135px",
						options: [
							{ label: entry.options[0].label, value: entry.options[0].value, selected: entry.options[0].selected, disabled: entry.options[0].disabled },
							{ label: entry.options[1].label, value: entry.options[1].value, selected: entry.options[1].selected },
							{ label: entry.options[2].label, value: entry.options[2].value, selected: entry.options[2].selected, },
							{ label: entry.options[3].label, value: entry.options[3].value, selected: entry.options[3].selected, },
							{ label: entry.options[4].label, value: entry.options[4].value, selected: entry.options[4].selected, }
						],
						onChange: lang.hitch(this,function(e) {
							this.symbologySelected(e);
						})
					}, fieldSelect);
					
					btnHolder = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(btnHolder);
					
					this.showAllButton = new Button({
						label: "Show All",
						style:  "margin-left:40px",
						onClick: lang.hitch(this,function(){
							this.showAll();
						})
					}, btnHolder);
				}
				if (entry.type == "select") {
					maindiv = domConstruct.create("div", {id: this.sliderpane.id + entry.type, style:"margin-top:10px; margin-bottom:10px;", innerHTML: "<b>" + entry.header + "</b>"});
					this.sliderpane.domNode.appendChild(maindiv);
					
					spacer = domConstruct.create("div", {style:"height:5px"});
					maindiv.appendChild(spacer);
					
					fieldSelect = domConstruct.create("div", {id: this.sliderpane.id + entry.name, style:"margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(fieldSelect);
							
					this.fieldSelect = new Select({
						name: entry.name,
						style: "width: 135px",
						options: [
							{ label: entry.options[0].label, value: entry.options[0].value, selected: entry.options[0].selected, disabled: entry.options[0].disabled },
							{ label: entry.options[1].label, value: entry.options[1].value, selected: entry.options[1].selected },
							{ label: entry.options[2].label, value: entry.options[2].value, selected: entry.options[2].selected },
							{ label: entry.options[3].label, value: entry.options[3].value, selected: entry.options[3].selected },
							{ label: entry.options[4].label, value: entry.options[4].value, selected: entry.options[4].selected }
						],
						onChange: lang.hitch(this,function(e) {
							this.fieldSelected(e);
						})
					}, fieldSelect);
					
					equals = domConstruct.create("div", {style:"display:inline; margin-top:10px; margin-bottom:10px;", innerHTML: " = "});
					maindiv.appendChild(equals);
					// Attribute Holder Select	
					attHolder = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(attHolder);
					this.attHolderSelect = new Select({
						id: this.sliderpane.id + "attHolder", 
						name: "attHolder",
						style: "width: 120px; display: " + entry.AttHolder[0].display,
						options: [
							{ label: entry.AttHolder[0].label, value: entry.AttHolder[0].value, selected: entry.AttHolder[0].selected, disabled: entry.AttHolder[0].disabled }
						]
					}, attHolder);
					
					//Habitat Select
					habitatSelect = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(habitatSelect);
							
					this.habitatSelect = new Select({
						id: this.sliderpane.id + "Habitat", 
						name: "habitat",
						style: "width: 120px; display: " + entry.Habitat[0].display,
						options: [
							{ label: entry.Habitat[0].label, value: entry.Habitat[0].value, selected: entry.Habitat[0].selected, disabled: entry.Habitat[0].disabled },
							{ label: entry.Habitat[1].label, value: entry.Habitat[1].value, selected: entry.Habitat[1].selected },
							{ label: entry.Habitat[2].label, value: entry.Habitat[2].value, selected: entry.Habitat[2].selected },
							{ label: entry.Habitat[3].label, value: entry.Habitat[3].value, selected: entry.Habitat[3].selected },
							{ label: entry.Habitat[4].label, value: entry.Habitat[4].value, selected: entry.Habitat[4].selected },
							{ label: entry.Habitat[5].label, value: entry.Habitat[5].value, selected: entry.Habitat[5].selected },
							{ label: entry.Habitat[6].label, value: entry.Habitat[6].value, selected: entry.Habitat[6].selected },
							{ label: entry.Habitat[7].label, value: entry.Habitat[7].value, selected: entry.Habitat[7].selected },
							{ label: entry.Habitat[8].label, value: entry.Habitat[8].value, selected: entry.Habitat[8].selected },
							{ label: entry.Habitat[9].label, value: entry.Habitat[9].value, selected: entry.Habitat[9].selected }
						],
						onChange: lang.hitch(this,function(e) {
							this.attributeSelected(e);
						})
					}, habitatSelect);
					
					//ProjectObjective Select
					projectObSelect = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(projectObSelect);
							
					this.projectObSelect = new Select({
						id: this.sliderpane.id + "ProjectObjective", 
						name: "projectObjective",
						style: "width: 120px; display: " + entry.ProjectObjective[0].display,
						options: [
							{ label: entry.ProjectObjective[0].label, value: entry.ProjectObjective[0].value, selected: entry.ProjectObjective[0].selected, disabled: entry.ProjectObjective[0].disabled },
							{ label: entry.ProjectObjective[1].label, value: entry.ProjectObjective[1].value, selected: entry.ProjectObjective[1].selected },
							{ label: entry.ProjectObjective[2].label, value: entry.ProjectObjective[2].value, selected: entry.ProjectObjective[2].selected },
							{ label: entry.ProjectObjective[3].label, value: entry.ProjectObjective[3].value, selected: entry.ProjectObjective[3].selected }
						],
						onChange: lang.hitch(this,function(e) {
							this.attributeSelected(e);
						})
					}, projectObSelect);
					
					//Classification Select
					classificationSelect = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(classificationSelect);
							
					this.classificationSelect = new Select({
						id: this.sliderpane.id + "Classification",
						name: "classification",
						style: "width: 120px; display: " + entry.Classification[0].display,
						options: [
							{ label: entry.Classification[0].label, value: entry.Classification[0].value, selected: entry.Classification[0].selected, disabled: entry.Classification[0].disabled },
							{ label: entry.Classification[1].label, value: entry.Classification[1].value, selected: entry.Classification[1].selected },
							{ label: entry.Classification[2].label, value: entry.Classification[2].value, selected: entry.Classification[2].selected },
							{ label: entry.Classification[3].label, value: entry.Classification[3].value, selected: entry.Classification[3].selected },
							{ label: entry.Classification[4].label, value: entry.Classification[4].value, selected: entry.Classification[4].selected },
							{ label: entry.Classification[5].label, value: entry.Classification[5].value, selected: entry.Classification[5].selected }
						],
						onChange: lang.hitch(this,function(e) {
							this.attributeSelected(e);
						})
					}, classificationSelect);
					
					//siteExposure Select
					siteExposureSelect = domConstruct.create("div", {style:"display:inline; margin-top:10px;margin-bottom:10px"});
					maindiv.appendChild(siteExposureSelect);
							
					this.siteExposureSelect = new Select({
						id: this.sliderpane.id + "SiteExposure", 
						name: "siteExposure",
						style: "width: 120px; display: " + entry.SiteExposure[0].display,
						options: [
							{ label: entry.SiteExposure[0].label, value: entry.SiteExposure[0].value, selected: entry.SiteExposure[0].selected, disabled: entry.SiteExposure[0].disabled },
							{ label: entry.SiteExposure[1].label, value: entry.SiteExposure[1].value, selected: entry.SiteExposure[1].selected },
							{ label: entry.SiteExposure[2].label, value: entry.SiteExposure[2].value, selected: entry.SiteExposure[2].selected },
							{ label: entry.SiteExposure[3].label, value: entry.SiteExposure[3].value, selected: entry.SiteExposure[3].selected },
							{ label: entry.SiteExposure[4].label, value: entry.SiteExposure[4].value, selected: entry.SiteExposure[4].selected }
						],
						onChange: lang.hitch(this,function(e) {
							this.attributeSelected(e);
						})
					}, siteExposureSelect);
					
				}	
				if (entry.type == "featureLayer"){
					// Create feature layer for display
					this.flClick = new FeatureLayer(entry.url, {
						mode: esri.layers.FeatureLayer.MODE_SELECTION,
						outFields: entry.outfields
					});
					// Create feature layer for display
					this.flHover = new FeatureLayer(entry.url1, {
						mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
						outFields: entry.outfields
					});					
					// set feature layer symbology
					this.pntSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15,
								   new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								   new Color([255,0,0]), 3),
								   new Color([0,255,0,0]));
					this.flClick.setSelectionSymbol(this.pntSym);				
					// add feature layer to map
					this.map.addLayer(this.flClick);	
					this.map.addLayer(this.flHover);	
					// select feature layer from map click
					dojo.connect(this.map, "onClick", lang.hitch(this,function(evt){ 
						this.flClick.clear();
						this.findFPUs(evt);						
					}));	
					// call function to capture and display selected feature layer attributes
					dojo.connect(this.flClick, "onSelectionComplete", lang.hitch(this,function(features){
						this.showAttributes(features[0].attributes);
					}));
					dojo.connect(this.flHover, "onMouseOver", lang.hitch(this,function(e){
						this.map.setMapCursor("pointer");
					}));
					dojo.connect(this.flHover, "onMouseOut", lang.hitch(this,function(e){
						this.map.setMapCursor("default");
					}));
				}
				
				if (entry.type == "iden") {
					maindiv = domConstruct.create("div", {id: this.sliderpane.id + entry.type, style:" display:none; margin-top:5px; margin-bottom:10px;", innerHTML: "<b>Identify Results</b>"});
					this.sliderpane.domNode.appendChild(maindiv);
				}	
			}));
			this.defSet = "no";
			this.layerNum = 5;
			this.imageParameters = new ImageParameters();
			this.layerDefs = [];
			this.vis = [5];
			this.imageParameters.layerIds = this.vis;
			this.imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;
			this.currentLayer = new ArcGISDynamicMapServiceLayer(this.config.url, {opacity:1, "imageParameters": this.imageParameters});
			this.map.addLayer(this.currentLayer,3);
		
			this.resize();
			
			if (this.config.symbolizeBy != ""){
				this.symbologySelected(this.config.symbolizeBy)
			}
			if (this.config.fieldSelected != ""){
				this.fieldSelected(this.config.fieldSelected)
			}
			if (this.config.attributeSelected != ""){
				this.attributeSelected(this.config.attributeSelected);
			}
			if (this.config.showAll != ""){
				this.showAll();
			}
			if (this.config.idenAtts != ""){
				this.showAttributes(this.config.idenAtts);
			}
			if (this.config.tabSelected != ""){
				$('#' + this.sliderpane.id + 'tabs').tabs('option', 'active', this.config.tabSelected)
			}
			if (this.config.idenGraphic != ""){
				var pt = new Point(this.config.idenGraphic.x,this.config.idenGraphic.y,this.map.spatialReference)
				this.selectedGraphic = new Graphic(pt,this.pntSym);
				this.map.graphics.add(this.selectedGraphic);
			}			
		},

		fieldSelected: function(e){
			if (e != 'field'){
				this.config.fieldSelected = e;
				this.config.attributeSelected = "";
				this.config.showAll == ""
				$.each(this.controls[2].options, function(i,v){
					v.selected = false;
				});
				this.vis = [];
				this.vis.push(this.layerNum)
				this.currentLayer.setVisibleLayers(this.vis);
				this.layerDefs = [];
				this.currentLayer.setLayerDefinitions(this.layerDefs);
				this.flHover.setDefinitionExpression(this.flHover.defaultDefinitionExpression);
				
				this.hlField = e;
				if (e != undefined){
					$('#' + this.sliderpane.id + "attHolder").hide();
					$('#' + this.sliderpane.id + "Habitat").hide();
					$('#' + this.sliderpane.id + "ProjectObjective").hide();
					$('#' + this.sliderpane.id + "Classification").hide();
					$('#' + this.sliderpane.id + "SiteExposure").hide();
					this.controls[2].AttHolder[0].display = "none !important;";
					this.controls[2].Habitat[0].display = "none !important;";
					this.controls[2].ProjectObjective[0].display = "none !important;";
					this.controls[2].Classification[0].display = "none !important;";
					this.controls[2].SiteExposure[0].display = "none !important;";
				}			
				if (e == "Habitat"){
					this.field = e;
					$('#' + this.sliderpane.id + e).show();
					this.controls[2].Habitat[0].display = "inline-block;";
					this.controls[2].options[1].selected = true;
				}
				if (e == "ProjectObjective"){
					this.field = e;
					$('#' + this.sliderpane.id + e).show();
					this.controls[2].ProjectObjective[0].display = "inline-block;";
					this.controls[2].options[2].selected = true;
				}
				if (e == "Classification"){
					this.field = e;
					$('#' + this.sliderpane.id + e).show();
					this.controls[2].Classification[0].display = "inline-block;";
					this.controls[2].options[3].selected = true;				
				}
				if (e == "SiteExposure"){
					this.field = e;
					$('#' + this.sliderpane.id + e).show();
					this.controls[2].SiteExposure[0].display = "inline-block;";
					this.controls[2].options[4].selected = true;				
				}
			}
		},
		
		attributeSelected: function(e){
			this.config.attributeSelected = e;
			this.exp = this.field + "='" + e + "'";
			this.config.showAll == ""
			this.flHover.setDefinitionExpression(this.exp);
			this.layerDefs[this.layerNum] = this.exp;
			this.currentLayer.setLayerDefinitions(this.layerDefs);
			this.vis = [];
			this.vis.push(this.layerNum)
			this.currentLayer.setVisibleLayers(this.vis);
			this.defSet = "yes";
			$.each(this.controls[2].Habitat, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].ProjectObjective, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].Classification, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].SiteExposure, function(i,v){
				v.selected = false;
			})			
			
			if (e == "Coastal Dunes"){this.controls[2].Habitat[1].selected = true;}	
			if (e == "Coral Reefs"){this.controls[2].Habitat[2].selected = true;}	
			if (e == "Mangroves"){this.controls[2].Habitat[3].selected = true;}	
			if (e == "Oyster Reefs"){this.controls[2].Habitat[4].selected = true;}	
			if (e == "Reed (Freshwater)"){this.controls[2].Habitat[5].selected = true;}	
			if (e == "Salt-marsh"){this.controls[2].Habitat[6].selected = true;}	
			if (e == "Seagrass"){this.controls[2].Habitat[7].selected = true;}	
			if (e == "Wetlands"){this.controls[2].Habitat[8].selected = true;}	
			if (e == "Willow"){this.controls[2].Habitat[9].selected = true;}
			if (e == "Erosion Mitigation"){this.controls[2].ProjectObjective[1].selected = true;}	
			if (e == "Flood Defense"){this.controls[2].ProjectObjective[2].selected = true;}	
			if (e == "Wave Attenuation"){this.controls[2].ProjectObjective[3].selected = true;}	
			if (e == "Bay"){this.controls[2].Classification[1].selected = true;}	
			if (e == "Estuary"){this.controls[2].Classification[2].selected = true;}	
			if (e == "Lagoon"){this.controls[2].Classification[3].selected = true;}	
			if (e == "Open Coast"){this.controls[2].Classification[4].selected = true;}	
			if (e == "River"){this.controls[2].Classification[5].selected = true;}		
			if (e == "Low"){this.controls[2].SiteExposure[1].selected = true;}	
			if (e == "Moderate"){this.controls[2].SiteExposure[2].selected = true;}	
			if (e == "High"){this.controls[2].SiteExposure[3].selected = true;}	
			if (e == "Very High"){this.controls[2].SiteExposure[4].selected = true;}	
		},
		
		symbologySelected: function(e){
			if (e != 'field'){
				this.config.symbolizeBy = e;
				this.layerNum = e;
				this.config.showAll == ""
				if (this.defSet == "yes"){
					this.layerDefs[this.layerNum] = this.exp;
					this.currentLayer.setLayerDefinitions(this.layerDefs);
				}
				this.vis = [];
				this.vis.push(this.layerNum)
				this.currentLayer.setVisibleLayers(this.vis);
				$.each(this.controls[1].options, function(i,v){
					v.selected = false;
				});
				if (e == 0){this.controls[1].options[1].selected = true;}	
				if (e == 1){this.controls[1].options[2].selected = true;}	
				if (e == 2){this.controls[1].options[3].selected = true;}	
				if (e == 3){this.controls[1].options[4].selected = true;}	
			}
		},
		
		showAll: function(){
			this.config.showAll == "yes"
			this.defSet = "no";
			this.vis = [];
			this.vis.push(5)
			this.currentLayer.setVisibleLayers(this.vis);
			this.layerDefs = [];
			this.currentLayer.setLayerDefinitions(this.layerDefs);
			this.flHover.setDefinitionExpression(this.flHover.defaultDefinitionExpression);
			
			//reset symbology dropdown
			this.symSelect.set('value', 'field');
			$.each(this.controls[1].options, function(i,v){
				v.selected = false;
			});
			
			//reset field dropdown
			this.fieldSelect.set('value', 'field')
			$.each(this.controls[2].options, function(i,v){
				v.selected = false;
			});
			
			//reset attribute dropdown
			$('#' + this.sliderpane.id + "Habitat").hide();
			$('#' + this.sliderpane.id + "ProjectObjective").hide();
			$('#' + this.sliderpane.id + "Classification").hide();
			$('#' + this.sliderpane.id + "SiteExposure").hide();
			this.controls[2].Habitat[0].display = "none !important;";
			this.controls[2].ProjectObjective[0].display = "none !important;";
			this.controls[2].Classification[0].display = "none !important;";
			this.controls[2].SiteExposure[0].display = "none !important;";
			$('#' + this.sliderpane.id + "attHolder").show();
			this.controls[2].AttHolder[0].display = "inline-block;";
			$.each(this.controls[2].Habitat, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].ProjectObjective, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].Classification, function(i,v){
				v.selected = false;
			})
			$.each(this.controls[2].SiteExposure, function(i,v){
				v.selected = false;
			})
			
			/*fldselect = dijit.byId(this.sliderpane.id + "fieldSelect");
			*/	
		},
		
		findFPUs: function(evt){
			this.config.idenGraphic = evt.graphic.geometry;
			var selectionQuery = new esriQuery();
			var tol = this.map.extent.getWidth()/this.map.width * 4;
			var x = evt.mapPoint.x;
			var y = evt.mapPoint.y;
			var queryExtent = new esri.geometry.Extent(x-tol,y-tol,x+tol,y+tol,evt.mapPoint.spatialReference);
			selectionQuery.geometry = queryExtent;
			selectionQuery.outfields = [ "*" ];
			this.flClick.selectFeatures(selectionQuery,esri.layers.FeatureLayer.SELECTION_NEW);
		},
		
		showAttributes: function(atts){
			this.map.graphics.clear();
			this.config.idenAtts = atts;
			
			this.tab1 = "<b>Habitat:</b> " + atts.Habitat + "<br>" +
					"<b>Coastal Classification:</b> " + atts.Classification + "<br>" +
					"<b>Country:</b> " + atts.Country + "<br>" +
					"<b>Location:</b> " + atts.Location + "<br>"
			this.tab2 = "<b>Engineering Effectiveness:</b> " + atts.EngineeringEffectiveness + "<br>" +
					"<b>Estimated Cost Effectiveness:</b> " + atts.EstimatedCostEffectiveness + "<br>" 
			this.tab3 = "<b>Site Exposure:</b> " + atts.SiteExposure + "<br>" +
					"<b>Mean Annual Significant Wave Height (m):</b> " + atts.MeanAnnualSignificantWaveHeight + "<br>" +
					"<b>Tidal Range:</b> " + atts.TidalRange + "<br>" +
					"<b>Engineering Structure Present:</b> " + atts.EngineeringStructurePresent + "<br>" + 
					"<b>Minimum Habitat Width (m):</b> " + atts.MinimumMeasured_AssumedHabitatWidth + "<br>" + 
					"<b>Species:</b> " + atts.Species + "<br>"
			if (atts.Links_2 == "NA"){
				this.tab4 = 	"<b>Project Objective:</b> " + atts.ProjectObjective + "<br>" +
					"<b>Project Title:</b> " + atts.ProjectTitle + "<br>" +
					"<b>Project Type:</b> " + atts.ProjectType + "<br>" +
					"<b>Sources-References:</b> " + atts.Sources_References + "<br>" + 
					"<b>Links:</b> <a style='color:#0000ff;' target='_blank' href='" + atts.Links + "'>Click for more info</a><br>"
			}else{
				this.tab4 = 	"<b>Project Objective:</b> " + atts.ProjectObjective + "<br>" +
					"<b>Project Title:</b> " + atts.ProjectTitle + "<br>" +
					"<b>Project Type:</b> " + atts.ProjectType + "<br>" +
					"<b>Sources-References:</b> " + atts.Sources_References + "<br>" + 
					"<b>Links:</b> <a style='color:#0000ff;'target='_blank' href='" + atts.Links + "'>Click for more info</a>, " +
					"<a style='color:#0000ff;' target='_blank' href='" + atts.Links_2 + "'>Click for additional info</a><br>"
			}
			$('#' + this.sliderpane.id + 'tabs-1').html(this.tab1)
			$('#' + this.sliderpane.id + 'tabs-2').html(this.tab2)
			$('#' + this.sliderpane.id + 'tabs-3').html(this.tab3)
			$('#' + this.sliderpane.id + 'tabs-4').html(this.tab4)
			
			domStyle.set(this.tabarea.domNode, 'display', '');					
		},
		
		getState: function () { 
			var state = new Object();
			state = this.config;
			return state;	
		},
				
		setState: function (state) { 
			this.config = state;						
			this.controls = this.config.controls;
		},
    });
});
function clearSelect(){
	$('.mapselect').slideUp();
	app.sel = "no";
	this.flClick.clear();
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
