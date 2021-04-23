let topRotation = 0.0;
let bottomRotation = 0.0;

main();

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Vertex shader program 顶点着色器
	const vsSource = `
		attribute vec4 aVertexPosition;
		attribute vec4 aVertexColor;

		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;

		varying lowp vec4 vColor;
		varying vec3 positionForClip;

		void main(void) {
			vec4 worldSpacePos = uModelViewMatrix * aVertexPosition;
			positionForClip = worldSpacePos.xyz / worldSpacePos.w;
			gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
			vColor = aVertexColor;
		}
	`;

	// Fragment shader program 片段着色器
	const fsSource = `
		#ifdef GL_ES
			precision mediump float;
		#endif

		vec3 planeNormal = vec3(0.0, 1.0, 0.0);
		float planeDistance = 0.0;

		varying lowp vec4 vColor;
		varying	vec3 positionForClip;

		void main(void) {
			if ( dot( positionForClip, planeNormal ) > planeDistance) {
				discard;
			}
			gl_FragColor = vColor;
		}
	`;
	//if (dot (positionForClip, planeNormal) > planeDistance) {

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVevrtexColor and also
	// look up uniform locations.
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
		},
	};

	
	// Here's where we call the routine that builds all the
	// objects we'll be drawing.
	const buffers = initBuffers(gl);

	// Draw the scene repeatedly
	var then = 0;
	function render(now) {
		now *= 0.001;  // convert to seconds
		const deltaTime = now - then;
		then = now;
		drawScene(gl, programInfo, buffers, deltaTime);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// webglLessonsUI.setupSlider("#x", {slide: updatePosition(0), max: gl.canvas.width });
	// webglLessonsUI.setupSlider("#y", {slide: updatePosition(1), max: gl.canvas.height});
	
	// let translation = [0, 0];
	// function updatePosition(index) {
	// 	return function(event, ui) {
	// 		translation[index] = ui.value;
			
	// 	}
	// }
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

	// Create a buffer for the square's positions.

	const positionBuffer = gl.createBuffer();

	// Select the positionBuffer as the one to apply buffer
	// operations to from here out.

	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Now create an array of positions for the square.

	const positions = [
		 0.0,  1.0,  0.0,
		 1.0, -1.0,  1.0,
		 1.0, -1.0, -1.0,
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		// cut
		 0.5,    0,  0.5,
		 0.5,    0, -0.5,
		-0.5,    0, -0.5,
		-0.5,    0,  0.5,
	];

	// Now pass the list of positions into WebGL to build the
	// shape. We do this by creating a Float32Array from the
	// JavaScript array, then use it to fill the current buffer.

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	// Now set up the colors for the vertices

	const colors = [
		[  0,  255,    0,  255],    // green
		[255,    0,    0,  255],    // red
		[255,  255,    0,  255],    // yellow
		[255,    0,  255,  255],    // purple
		[  0,    0,  255,  255],    // blue
	];

	let verticesColor = [];
	// top
	verticesColor = verticesColor.concat(colors[0]);
	// bottom
	for (let i = 0; i < 4; i++) {
		verticesColor = verticesColor.concat(colors[4]);
	}
	// cut
	for (let i = 0; i < 4; i++) {
		verticesColor = verticesColor.concat(colors[2]);
	}

	  
	const cubeVerticesColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(verticesColor), gl.STATIC_DRAW);

	const cubeVerticesIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);

	const cubeVerticesIndices = [
		// top
		0,  5,  6,
		0,  6,  7,
		0,  7,  8,
		0,  8,  5,
		// bottom
		5, 6, 1, 2, 6,
		7, 2, 3, 7,
		8, 3, 4, 8,
		5, 4, 1, 5 
	];

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(cubeVerticesIndices), gl.STATIC_DRAW);
	
	
	console.log('position: ', positions.length / 3);
	console.log('colors: ', verticesColor.length / 4);
	console.log('indices: ', cubeVerticesIndices.length / 2);
	console.log(cubeVerticesIndices);

	return {
		position: positionBuffer,
		color: cubeVerticesColorBuffer,
		indices: cubeVerticesIndexBuffer,
	};
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, deltaTime) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

	// Clear the canvas before we start drawing on it.

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Create a perspective matrix, a special matrix that is
	// used to simulate the distortion of perspective in a camera.
	// Our field of view is 45 degrees, with a width/height
	// ratio that matches the display size of the canvas
	// and we only want to see objects between 0.1 units
	// and 100 units away from the camera.

	const fieldOfView = 45 * Math.PI / 180;   // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();

	// note: glmatrix.js always has the first argument
	// as the destination to receive the result.
	mat4.perspective(projectionMatrix,
					 fieldOfView,
					 aspect,
					 zNear,
					 zFar);

	// Set the drawing position to the "identity" point, which is
	// the center of the scene.
	const modelViewMatrix = mat4.create();

	// Now move the drawing position a bit to where we want to
	// start drawing the square.

	mat4.translate(modelViewMatrix,     // destination matrix
				   modelViewMatrix,     // matrix to translate
				   [-0.0, 0.0, -6.0]);  // amount to translate
	mat4.rotate(modelViewMatrix,  // destination matrix
				modelViewMatrix,  // matrix to rotate
				topRotation,   // amount to rotate in radians
				[0, 1, 1]);       // axis to rotate around

	// Tell WebGL how to pull out the positions from the position
	// buffer into the vertexPosition attribute
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
				programInfo.attribLocations.vertexPosition,
				numComponents,
				type,
				normalize,
				stride,
				offset);
		gl.enableVertexAttribArray(
				programInfo.attribLocations.vertexPosition);
	}

	// Tell WebGL how to pull out the colors from the color buffer
	// into the vertexColor attribute.
	{
		const numComponents = 4;
		const type = gl.UNSIGNED_BYTE;
		const normalize = true;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
		gl.vertexAttribPointer(
				programInfo.attribLocations.vertexColor,
				numComponents,
				type,
				normalize,
				stride,
				offset);
		gl.enableVertexAttribArray(
				programInfo.attribLocations.vertexColor);
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// Tell WebGL to use our program when drawing

	gl.useProgram(programInfo.program);

	// Set the shader uniforms
	
	gl.uniformMatrix4fv(
			programInfo.uniformLocations.projectionMatrix,
			false,
			projectionMatrix);
	gl.uniformMatrix4fv(
			programInfo.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix);

	{
		const vertexCount = 12;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.LINE_STRIP, vertexCount, type, offset);
	}

	{
		const vertexCount = 17;
		const type = gl.UNSIGNED_SHORT;
		// 12 vertexs 2 bype per gl.UNSIGHED_SHORT
		const offset = 12 * 2;
		gl.drawElements(gl.TRIANGLE_STRIP, vertexCount, type, offset);
	}

	// Update the rotation for the next draw

	topRotation += deltaTime;
	bottomRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	// Create the shader program

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	// Send the source to the shader object

	gl.shaderSource(shader, source);

	// Compile the shader program

	gl.compileShader(shader);

	// See if it compiled successfully

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

