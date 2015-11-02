
//vizualization settings
var numberOfNodes = 12,
	maxLoad = 15,
	defLoad = true,  								//set true to use predefined load by default (will be random instead)
	load = [12,2,10,8,2,13,9,11,14,6,4,5],  		//change predefined loads,
	defOrient = true, 								//set true to use predefined orientations
	orientations = [0,0,1,1,0,1,0,1,1,1,0,1],

	color1 = 'black',		//colors for the orientations - black and orange
	color2 = "#FFAD1F",
	lineHeight = 200,	//distance between top and bottom lines
	distance = 80,		//distance between the nodes (adjusts according to window size)
	circleRadius = 25,  //node radius
	topLine = 160,		//coordinate of the top line
	
	loadHeight = 4,		//height of 1 load 
	loadWidth = 12,		//loadBar's width
	speed = 2;
	
var animating = false;
var animStep = 0;

//arrays for the node objects
var chain = [];
var mirrorChain = [];

//arrays for the connection lines segments
var topCon = [];
var botCon = [];

//load arrays
var topLoad = [];
var botLoad = [];

//create simulation from the given parameters
function create() {
	numberOfNodes = parseInt($("#amount").val());
	defLoad = defOrient = true;
	
	load = JSON.parse("[" + $("#inputLoad").val() + "]");
	orientations = JSON.parse("[" + $("#inputOrient").val() + "]");
	for (var i = 0; i < load.length || i < orientations.length; i++) {
		if (load[i] > maxLoad) load[i] = maxLoad;
		if (orientations[i] != 0 && orientations[i] != 1) orientations[i] = 0;
	}
	
	createChain(numberOfNodes);
	animStep = 0;
}

//create random simulation
function random() {
	defLoad = defOrient = false;
	numberOfNodes = parseInt($("#amount").val());
	createChain(numberOfNodes);
	animStep = 0;
}

//display starting loads and orientation in the input fields
function displayInfo() {
	$("#amount").val(numberOfNodes);
	var loadStr = "", orientStr = "";
	for (var i = 0; i < numberOfNodes; i++) {
		loadStr = loadStr.concat(load[i] + ',');
		orientStr = orientStr.concat(orientations[i] + ',');
	}
	loadStr = loadStr.substring(0, loadStr.length - 1);
	orientStr = orientStr.substring(0, orientStr.length - 1);
	
	$("#inputLoad").val(loadStr);
	$("#inputOrient").val(orientStr);
}

//repeat the simulation with the same parameters
function repeat() {
	createChain(numberOfNodes);
	animStep = 0;
}

//proceed with the next simulation step
function nextStep() {
		
	switch(animStep) {
		case 0:
			createMirrorChain(1000);	 //animation duration in ms		
			break;
		case 1:
			drawCrossConnections(500);
			setTimeout(removeConnections, 500, 500); 
			break;
		case 2:
			exchangeNodes(1000);
			break;
		case 3:
			balanceRight({array: topLoad, s:1});  //s is level of smoothness of the balancing
			balanceLeft({array: botLoad, s:1});
			break;
		case 4:
			balanceLeft({array: topLoad, s:1});
			balanceRight({array: botLoad, s:1});
			break;
		case 5:
			balanceRight({array: topLoad, s:2});
			balanceLeft({array: botLoad, s:2});
			balanceLeft({array: topLoad, s:2});
			balanceRight({array: botLoad, s:2});
			break;
		case 6:
			balanceRight({array: topLoad, s:3});
			balanceLeft({array: botLoad, s:3});
			balanceLeft({array: topLoad, s:3});
			balanceRight({array: botLoad, s:3});
			break;
		case 7:
			removeLines(500);
			setTimeout(merge, 500, 1000);		
			setTimeout(finalBalance, 2000, 500);
			setTimeout(showConnections, 2000, 500); 	
			canvas.remove(text);
			break;
		case 8:			
			return;
	}
	animStep++;
	if (!animating && animStep <= 8) nextStep(); //try to avoid doing nothing
}

//balance a chain to the right side with smoothness s
function balanceRight(param) {
	var array = param.array;
	var s = param.s;
	
	for (var j = 1; j < maxLoad; j++) {
		for (var i = 0; i < numberOfNodes; i++) {
			//if there is a load unit at this position
			if (array[i][j] !== null && array[i][j] !== undefined) {
				//tell it to try to fall right
				array[i][j].fallRight(s);
			}
		}
	}
	
}

//balance a chain to the left side with smoothness s
function balanceLeft(param) {
	var array = param.array;
	var s = param.s;
	
	for (var j = 1; j < maxLoad; j++) {
		for (var i = 0; i < numberOfNodes; i++) {
			//if there is a load unit at this position
			if (array[i][j] !== null && array[i][j] !== undefined) {
				//tell it to try to fall left
				array[i][j].fallLeft(s);
			}
		}
	}
}

//draw the secondary, cross-connections
function drawCrossConnections(k) {
	animating = true;
	//determine the colors for the top and bottom connection lines
	var colorTop = chain[0].orientation == 1 ? color1 : color2;
	var colorBot = chain[0].orientation == 0 ? color1 : color2;

	//draw the new connection line that starts on the top
	
	var from = {'x': chain[0].leftLine.left, 'y': chain[0].leftLine.top +2};
	var to = {'x': chain[0].center.x, 'y': chain[0].center.y};

	for (var i = 1; i <= chain.length + 1; i++) {		
		var line = new fabric.Line(
		[from.x, from.y, to.x, to.y], {stroke: colorTop, strokeWidth: 2, opacity: 0, selectable: false});
		canvas.add(line);
		line.sendToBack();
		line.animate({opacity: 1}, {duration: k});
		topCon.push(line);
		
		from = {'x': to.x, 'y': to.y}
		
		if (i > chain.length) break;
		if (i == chain.length) {
			to = {'x': to.x + chain[i-1].rightLine.width + circleRadius, 'y': to.y};
			continue;
		}
		
		if (chain[i].orientation == chain[0].orientation){
			to = {'x': chain[i].center.x, 'y': chain[i].center.y};
		}
		else { 
			to = {'x': mirrorChain[i].center.x, 'y': mirrorChain[i].center.y};
		}	
	}
	
	//draw the connection line that starts on the bottom
	
	var from = {'x': mirrorChain[0].leftLine.left, 'y': mirrorChain[0].leftLine.top+3};
	var to = {'x': mirrorChain[0].center.x, 
			  'y': mirrorChain[0].center.y};
	
	for (var i = 1; i <= chain.length + 1; i++) {		
		var line = new fabric.Line(
		[from.x, from.y, to.x, to.y], {stroke: colorBot, strokeWidth: 2, opacity: 0, selectable: false});
		canvas.add(line);
		line.sendToBack();
		line.animate({opacity: 1}, {duration: k});
		botCon.push(line);
		
		
		from = {'x': to.x, 'y': to.y}
		
		if (i > chain.length) break;
		if (i == chain.length) {
			to = {'x': to.x + chain[i-1].rightLine.width + circleRadius, 'y': to.y};
			continue;
		}
		
		if (mirrorChain[i].orientation == mirrorChain[0].orientation){
			to = {'x': mirrorChain[i].center.x, 'y': mirrorChain[i].center.y};
		}
		else {
			to = {'x': chain[i].center.x, 'y': chain[i].center.y};
		}
	}
}

//remove the chains' cross-connections
function removeLines (k) {
	animating = true;
	for (var i = 0; i < topCon.length; i++) {
		topCon[i].animate({opacity: 0}, {duration: k});
		botCon[i].animate({opacity: 0}, {duration: k});
	}
}

// merge two chains back together
function merge(k) {
	
	calcFinalLoad();
	
	for (var i = 0; i < chain.length; i++) {		
		var m = mirrorChain[i].load * (loadHeight + 5);
		
		//move the top chain down
		for (var j = 0; j < chain[i].load; j++) {
			topLoad[i][j].shape.animate({'top': topLoad[i][j].shape.top + lineHeight/2 - m}, {duration: k});
			topLoad[i][j].array = botLoad;
			botLoad[i][mirrorChain[i].load + j] = topLoad[i][j];
		}
		
		chain[i].circle.animate({'top': chain[i].circle.top + lineHeight / 2}, {duration: k});
		
		//move the bottom chain up
		for (var j = 0; j < mirrorChain[i].load; j++) {
			botLoad[i][j].shape.animate({'top': botLoad[i][j].shape.top - lineHeight/2}, {duration: k});
		}
		mirrorChain[i].circle.animate({'top': mirrorChain[i].circle.top - lineHeight / 2}, {duration: k});
			
			
		chain[i].load = chain[i].load + mirrorChain[i].load;	

	}
}

//calculate final load (helper function for the merge animation)
function calcFinalLoad() {
	for (var i = 0; i < chain.length; i++) {
		for (var j = maxLoad; j >=0; j--) {
			if (topLoad[i][j] !== null && topLoad[i][j] !== undefined) {
				chain[i].load = j+1;
				break;
			}
		}
		for (var j = maxLoad; j >=0; j--) {
			if (botLoad[i][j] !== null && botLoad[i][j] !== undefined) {
				mirrorChain[i].load = j+1;
				break;
			}
		}
			
	}
	
}

// animate final balancing step (after merging)
function finalBalance() {
	for (var i = 0; i < chain.length - 1; i++) {
		if (chain[i].load > chain[i+1].load + 1) {
			var load = botLoad[i][chain[i].load - 1].shape;
			load.animate({
				top: load.top + loadHeight + 5,
				left: load.left + distance
			}, {durration: (1000 / speed)});
			chain[i].load--;
			chain[i+1].load++;
		}
	}
	setTimeout(function () {
		for (var i = chain.length - 1; i > 0; i--) {
			if (chain[i].load > chain[i-1].load + 1) {
				var load = botLoad[i][chain[i].load - 1].shape;
				load.animate({
					top: load.top + loadHeight + 5,
					left: load.left - distance
				}, {durration: (1000 / speed)});
				chain[i].load--;
				chain[i+1].load++;
			}
		}
	}, 1000 / speed)
	
	
}


//exchange differently oriented nodes
function exchangeNodes(k) {
	animating = true;
	//move connection lines 
	for (var i = 0; i < topCon.length; i++) {
		if (chain[0].orientation === 0) {
			topCon[i].animate({y1: botCon[0].y1, y2: botCon[0].y1}, {duration: k, onComplete: function() {animating = false;}});
			botCon[i].animate({y1: topCon[0].y1, y2: topCon[0].y1}, {duration: k});
		}
		else {
			topCon[i].animate({y1: topCon[0].y1, y2: topCon[0].y1}, {duration: k, onComplete: function() {animating = false;}});
			botCon[i].animate({y1: botCon[0].y1, y2: botCon[0].y1}, {duration: k});
		}
		
	}
	
	//exchange nodes
	for (var i = 0; i < chain.length; i++) {
		
		if (chain[i].orientation === 0) {
			
			chain[i].circle.animate({'top': chain[i].circle.top + lineHeight}, {duration: k});
			mirrorChain[i].circle.animate({'top': mirrorChain[i].circle.top - lineHeight}, {duration: k});
			
			//exchange loads
			for (var j = 0; j < chain[i].load; j++) {
				topLoad[i][j].shape.animate({'top': topLoad[i][j].shape.top + lineHeight}, {duration: k});
				topLoad[i][j].array = botLoad;
				
				botLoad[i][j] = topLoad[i][j];
				topLoad[i][j] = null;
			}
			
			var temp = mirrorChain[i];
			mirrorChain[i] = chain[i];
			chain[i] = temp;
						
		}
	}	
	
}

//remove original connection lines
function removeConnections(k) {
	
	for (var i = 0; i < chain.length; i++) {
		
			
		chain[i].leftLine.animate({'width': 0, 'left': chain[i].leftLine.left + chain[i].leftLine.width}, {duration: k});
		chain[i].rightLine.animate({'width': 0}, {duration: k});
		mirrorChain[i].leftLine.animate({'width': 0, 'left': chain[i].leftLine.left + chain[i].leftLine.width}, {duration: k});
		mirrorChain[i].rightLine.animate({'width': 0}, {duration: k, onComplete: function() {animating = false;}})
	}	
}

//show the original connection lines
function showConnections(k) {
	for (var i = 0; i < chain.length; i++) {
		chain[i].leftLine.set({'top': topLine + lineHeight/2 + circleRadius});
		chain[i].rightLine.set({'top': topLine + lineHeight/2 + circleRadius});
		mirrorChain[i].leftLine.set({'top': topLine + lineHeight/2 + circleRadius});
		mirrorChain[i].rightLine.set({'top': topLine + lineHeight/2 + circleRadius});
		
		chain[i].leftLine.animate({'width': (distance - circleRadius*2) / 2, 
								   'left': chain[i].circle.left - distance / 2 + circleRadius}, {duration: k});
		chain[i].rightLine.animate({'width': (distance - circleRadius*2) / 2}, {duration: k});
		mirrorChain[i].leftLine.animate({'width': (distance - circleRadius*2) / 2, 
										 'left': mirrorChain[i].circle.left - distance / 2 + circleRadius}, {duration: k});
		mirrorChain[i].rightLine.animate({'width': (distance - circleRadius*2) / 2}, {duration: k});
	}
	animating = false;
}

//create the secondary mirrored chain
function createMirrorChain(k){
	animating = true;
	mirrorChain = [];
	for (var i = 0; i < chain.length; i++) {
		mirrorChain[i] = new Node(i);
		mirrorChain[i].orientation = (chain[i].orientation == 1) ? 0 : 1;
		mirrorChain[i].load = 0;
		mirrorChain[i].setGradients();
		mirrorChain[i].circle.fill = '#CCCCCC';
	
		mirrorChain[i].draw();
		
		mirrorChain[i].circle.sendToBack();
		mirrorChain[i].leftLine.sendToBack();
		mirrorChain[i].rightLine.sendToBack();
		

		mirrorChain[i].leftLine.animate({'top': topLine + lineHeight + circleRadius}, {duration: k, onComplete: function() {animating = false;}});
		mirrorChain[i].rightLine.animate({'top': topLine + lineHeight + circleRadius}, {duration: k});
		mirrorChain[i].circle.animate({'top': topLine + lineHeight}, {duration: k});
		
		mirrorChain[i].center.y = mirrorChain[i].center.y + lineHeight;
		
		botLoad[i] = [];
	}
	
	
	
}

//create the chain of length n
function createChain(n) {

	canvas.clear();
	canvas.add(text);
	distance = canvas.width / (numberOfNodes + 1.5);
	circleRadius = Math.min(Math.max(10, distance/4), 25);
	
	chain = [];
	topCon = [];
	botCon = [];
	
	for (var i = 0; i < n; i++) {
		chain[i] = new Node(i);
		chain[i].draw();
		
		topLoad[i] = [];
		
		if (load[i] == undefined) load[i] = 0;
		if (orientations[i] == undefined) orientations[i] = 0;
		var k = (defLoad === true) ? load[i] : Math.floor(Math.random()*maxLoad + 1);
		for (var j = 0; j < k; j++) {
			topLoad[i][j] = new LoadUnit(j, chain[i]);
		}
		chain[i].load = k;		
		
		//save for replay
		load[i] = k;
		orientations[i] = chain[i].orientation;
		
	}
	defLoad = defOrient = true;
	
	displayInfo();
}

//get the id as if the chain were a ring
function getContID(l, i) {
	if (i >=0 && i < l) return i;
	if (i < 0) return getContID(l, l+i);
	return getContID(l, i-l); 
}


//node class
Node = function (i) {
	
	this.index = i; 
	
	if (defOrient) {
		if (orientations[i] !== undefined) {
			this.orientation = orientations[i];
		}
		else this.orientation = Math.round(Math.random());
		
	}
	else this.orientation = Math.round(Math.random());
	
	this.leftLine = new fabric.Rect({
			top: topLine + circleRadius,
			left: distance*(i+0.5) + circleRadius,
			width: (distance - circleRadius*2) / 2,
			height: 4,
			selectable: false
		});

	this.rightLine = new fabric.Rect({
			top: topLine + circleRadius,
			left: distance*(i+1) + circleRadius*2,
			width: (distance - circleRadius*2) / 2,
			height: 4,
			selectable: false
		});

	this.circle = new fabric.Circle({
			radius: circleRadius,
			top: topLine,
			left: distance * (i+1),
			stroke: 'rgba(0,0,0,0.5)',
			fill: "white",
			strokeWidth: 2,			
			selectable:false
		});
	this.center = {
		'x': this.circle.left + this.circle.radius + 1,
		'y': this.circle.top + this.circle.radius + 1
	};
	
	this.setGradients();
	
}
//set the gradient coloring for the connections
Node.prototype.setGradients = function() {
	this.leftLine.setGradient('fill', {
		x1: 0,
		y1: 0,
		x2: this.leftLine.width,
		y2: 0,
		colorStops: {
			0: '#E8E8E8',			
			1: this.orientation ? "black" : "#FFAD1F",
		}
	});
	
	this.rightLine.setGradient('fill', {
		x1: 0,
		y1: 0,
		x2: this.rightLine.width,
		y2: 0,
		colorStops: {
			0: this.orientation ? "#FFAD1F" : "black",
			1: '#E8E8E8',	
		}
	});	
	
}
Node.prototype.draw = function () {
	
	canvas.add(this.leftLine);
	canvas.add(this.rightLine);
	canvas.add(this.circle);
}

//A class for one single load unit
LoadUnit = function(index, node) {
	
	this.array = topLoad; 		//initially all loads are in the top array
	this.verticalPos = index;
	this.horizontalPos = node.index;
	this.shape = new fabric.Rect({
			top: node.center.y - circleRadius * 1.5 - index * (loadHeight + 5),
			left: node.center.x - loadWidth / 2,
			fill: 'black',
			width: loadWidth,
			height: loadHeight,
			selectable: false
	});
	
	canvas.add(this.shape);	
}
// try to find a position at the right side to fall to, then animate the load movement
// s - level of smoothness
LoadUnit.prototype.fallRight = function (s){
	
	
	//go look for a new position for this load unit (starting from the end of diagonal)
	for (var i = 0; i < this.verticalPos; i++) {
		//horizontal position (node index)
		var calcPos = this.horizontalPos + this.verticalPos * s - i * s;
		var contPos = getContID(numberOfNodes, calcPos);
		var diff = calcPos - this.horizontalPos;
		
		//check if it is free
		if (this.array[contPos][i] === undefined || this.array[contPos][i] === null) {
			animating = true;
			this.array[contPos][i] = this; 
			this.array[this.horizontalPos][this.verticalPos] = null;
			
			//animate special case (going round)
			if (calcPos !== contPos) {
				
				var shift =  calcPos - numberOfNodes + 1; 
				
				//first animate to the right side of the chain,
				//after animation completes, transport to the left side
				//and continue with animation
				this.shape.animate({
					top: this.shape.top + (loadHeight + 5) * (numberOfNodes - this.horizontalPos - 0.37) / s,  
					left: distance + circleRadius - 1 + distance * (numberOfNodes - 0.5),
					}, {
					duration: (1000 / speed) * (numberOfNodes - this.horizontalPos - 0.5),
					easing: function(t, b, c, d) { return c*t/d + b; },
					param: {
						shape: this.shape,
						hPos: contPos,
						vPos: this.shape.top + (loadHeight + 5) * (calcPos - this.horizontalPos) / s,
						duration: (1000 / speed) * (contPos + 0.5)
					},
					onComplete: function() {
				
						this.param.shape.left = distance / 2 + circleRadius;
						this.param.shape.animate({							
							top: this.param.vPos,
							left: this.param.shape.left + distance / 2 + distance * this.param.hPos - (loadWidth / 2) + 1,
							
						}, {
							duration: this.param.duration,
							easing: function(t, b, c, d) { return c*t/d + b; }});
						
						animating = false;
					}
				});
				
			}
			
			//fall normally
			else {
				this.shape.animate({
				top: this.shape.top + (loadHeight + 5) * (this.verticalPos - i),  
				left: distance + circleRadius - (loadWidth / 2) + 1 + distance * contPos,
				}, {
				duration: (1000 / speed) * diff,
				easing: function(t, b, c, d) { return c*t/d + b; },
				onComplete: function() {
					animating = false;
				}
				
				});
			}
			
			//change parameters of the load
			this.horizontalPos = contPos;
			this.verticalPos = i;
		}
		
	}
}
// try to find a position at the left side to fall to, then animate the load movement
// s - level of smoothness
LoadUnit.prototype.fallLeft = function (s){
	
	//go look for a new position for this load unit (starting from the end of diagonal)
	for (var i = 0; i < this.verticalPos; i++) {
		//horizontal position (node index)
		var calcPos = this.horizontalPos - this.verticalPos * s + i * s;
		var contPos = getContID(numberOfNodes, calcPos);
		var diff = this.horizontalPos - calcPos;
		
		//check if it is free
		if (this.array[contPos][i] === undefined || this.array[contPos][i] === null) {
			animating = true;
			this.array[contPos][i] = this; 
			this.array[this.horizontalPos][this.verticalPos] = null;
			
			
			//animate special case (going round)
			if (calcPos !== contPos) {
				
				
				//first animate to the left side of the chain,
				//after animation completes, transport to the right side
				//and continue with animation
				
				this.shape.animate({
					
					top: this.shape.top + (loadHeight + 5) * (this.horizontalPos + 0.63) / s,  
					left: distance / 2 + circleRadius,
					}, {
					duration: (1000 / speed) * (this.horizontalPos + 0.5),
					easing: function(t, b, c, d) { return c*t/d + b; },
					param: {
						shape: this.shape,
						hPos: contPos,
						vPos: this.shape.top + (loadHeight + 5) * (this.horizontalPos - calcPos) / s,
						duration: (1000 / speed) * (numberOfNodes - contPos - 1 + 0.5)
					},
					onComplete: function() {
						this.param.shape.left = distance + circleRadius + 1 + distance * (numberOfNodes - 0.5);
						this.param.shape.animate({
							top: this.param.vPos,
							left: this.param.shape.left - distance * (numberOfNodes - this.param.hPos - 1) - distance * 0.5 - loadWidth/2,							
						}, {
							duration: this.param.duration,
							easing: function(t, b, c, d) { return c*t/d + b; }});
						animating = false;
					}
				});
				
			}
			
			//fall normally
			else {
				this.shape.animate({
				top: this.shape.top + (loadHeight + 5) * (this.verticalPos - i),  
				left: distance + circleRadius - (loadWidth / 2) + 1 + distance * contPos,
				}, {
				duration: (1000 / speed) * diff,
				easing: function(t, b, c, d) { return c*t/d + b; },
				onComplete: function() {
					animating = false;
				}
				});
			}
			
			//change parameters of the load
			this.horizontalPos = contPos;
			this.verticalPos = i;
		}
		
	}
}


$(document).ready(function() {
	
	//initialize controls
	$("#createBtn").click(create);
	$("#repeatBtn").click(repeat);
	$("#randomBtn").click(random);
		
		
	//initialize canvas as a fabric object
		canvas = new fabric.Canvas('canvas', {
			selection: false, 
			renderOnAddRemove: false,
			moveCursor: 'default', 
			hoverCursor: 'default'
		});  
		
	canvas.setDimensions({
			width: $(window).width() * 0.9,
			height: $(window).height() * 0.75
		});
	
		
	//proceed to the  next simulation step on mouse click	
	canvas.on({
		'mouse:down': function (options) {
			if (!animating) {				
				nextStep();
			}				
		}	
	});
	
	text = new fabric.Text('click to continue', { left: 10, top: 10, fontSize: 14, fill: 'grey', selectable: false });	

	createChain(numberOfNodes);	
		
	canvas.renderAll();
	animate();
	
}) 


//automatic update of canvas every browser-frame
animate = function () {
	canvas.renderAll();
	fabric.util.requestAnimFrame(animate);
}
