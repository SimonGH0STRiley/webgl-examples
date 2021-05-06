let rotation = 0.0;

main();

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {"stencil": true});
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Vertex shader program 顶点着色器
	const vsSource = `
		attribute vec4 vertexPosition;
		attribute vec4 vertexColor;

		uniform mat4 modelMatrix;
		uniform mat4 viewMatrix;
		uniform mat4 projectionMatrix;

		varying lowp vec4 color;
		varying vec3 modelViewPosition;

		void main(void) {
			modelViewPosition = (viewMatrix * modelMatrix * vertexPosition).xyz;
			gl_Position = projectionMatrix * viewMatrix * modelMatrix * vertexPosition;
			color = vertexColor;
		}
	`;

	// Fragment shader program 片段着色器
	const fsSource = `
		precision highp float;

		uniform mat4 viewMatrix;
		uniform mat3 viewNormalMatrix;
		uniform vec4 plane;

		varying lowp vec4 color;
		varying	vec3 modelViewPosition;

		vec4 planeToEC(vec4 plane, mat4 viewMatrix, mat3 viewNormalMatrix) {
			vec3 normal = vec3(plane.x, plane.y, plane.z);
			vec3 pointInWC = normal * -plane.w;
			vec3 pointInEC = (viewMatrix * vec4(pointInWC.xyz, 1.0)).xyz;
			vec3 normalInEC = normalize(viewNormalMatrix * normal);
			return vec4(normalInEC, -dot(normalInEC, pointInEC));
		}

		float calDistance(vec4 plane, vec3 position) {
			float distance = dot(vec3(plane.x, plane.y, plane.z), position) + plane.w;
			return distance;
		}

		void main(void) {
			vec4 planeInEC = planeToEC(plane, viewMatrix, viewNormalMatrix);
			float distance = calDistance(plane, modelViewPosition);
			if (distance < 0.0) {
				discard;
			}
			gl_FragColor = color;
		}
	`;
	
	const vsSourcePlane = `
	attribute vec4 vertexPosition;
	attribute vec4 vertexColor;
	uniform mat4 projectionMatrix;
	uniform mat4 viewMatrix;
	varying lowp vec4 color;

	void main(void) {
		gl_Position = vertexPosition;
		// color = vertexColor; // Revert it after testing
		color = vec4(1,0,0,1);
	}
	`;
	const fsSourcePlane = `
		varying lowp vec4 color;
		void main(void) {
			gl_FragColor = color;
		}
	`;

	const vsSourceFill = `
		attribute vec4 vertexPosition;
		attribute vec4 vertexColor;
		uniform mat4 projectionMatrix;
		uniform mat4 viewMatrix;
		varying lowp vec4 color;

		void main(void) {
			gl_Position = vertexPosition;
			color = vertexColor; 
			color = vec4(1,0,0,1); // Revert it after testing
		}
	`;
	const fsSourceFill = `
		varying lowp vec4 color;
		void main(void) {
			gl_FragColor = color;
		}
	`;
	//if (dot (positionForClip, planeNormal) > planeDistance) {

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
	const shaderProgramFill = initShaderProgram(gl, vsSourceFill, fsSourceFill);
	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for vertexPosition, vertexColor and also
	// look up uniform locations.
	const programInfo = {
		program: shaderProgram,
		ProgramFill: shaderProgramFill,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'vertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'vertexColor'),
		},
		attribLocationsFill: {
			vertexPosition: gl.getAttribLocation(shaderProgramFill, 'vertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgramFill, 'vertexColor'),
		},
		uniformLocations: {
			modelMatrix: gl.getUniformLocation(shaderProgram, 'modelMatrix'),
			viewMatrix: gl.getUniformLocation(shaderProgram, 'viewMatrix'),
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'projectionMatrix'),
			viewNormalMatrix: gl.getUniformLocation(shaderProgram, 'viewNormalMatrix'),
			plane: gl.getUniformLocation(shaderProgram, 'plane')
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
		//mat3.normalFromMat4(programInfo.uniformLocations.viewNormalMatrix, programInfo.uniformLocations.viewMatrix);
		// console.log(programInfo.uniformLocations.viewNormalMatrix);
		// console.log(programInfo.uniformLocations.viewMatrix);
		drawScene(gl, programInfo, buffers, deltaTime);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
	//drawScene(gl, programInfo, buffers, 0);

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
		// Fill range (full)
		-1.0, -1.0,  0.0,
		-1.0,  1.0,  0.0,
		 1.0,  1.0,  0.0,
		 1.0, -1.0,  0.0,
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
	// fill
	for(let i = 0; i < 4; i++) {
		verticesColor = verticesColor.concat(colors[1]);
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
		// bottom side
		5, 1, 6, 2,
		6, 2, 7, 3,
		7, 3, 8, 4,
		8, 4, 5, 1,
		// bottom bottom
		2, 1, 3, 4,
		// top
		6, 7, 5, 8,
		// plane
		9, 10, 11, 9, 11, 12
	];

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(cubeVerticesIndices), gl.STATIC_DRAW);
	
	
	console.log('position: ', positions.length / 3);
	console.log('colors: ', verticesColor.length / 4);
	console.log('indices: ', cubeVerticesIndices.length / 2);
	// console.log(cubeVerticesIndices);

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
	gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

	// Clear the canvas before we start drawing on it.

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
 
	gl.enable(gl.STENCIL_TEST);
	gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
	gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.DECR);
	gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.INCR);
	gl.stencilMask(0xFF);

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

	const modelMatrix = mat4.create();
	mat4.scale(modelMatrix, modelMatrix, [2, 2, 2]);
	mat4.rotate(modelMatrix, modelMatrix, rotation, [0, 1, 1]);

	const viewMatrix = mat4.create();
	mat4.translate(viewMatrix, viewMatrix, [-0.0, 0.0, -6.0]);

	const viewNormalMatrix = mat3.create();
	const test = mat3.create();
	const modelViewMatrix = mat4.create();
	mat3.normalFromMat4(test, viewMatrix);
	// console.log(viewNormalMatrix);
	mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
	mat3.normalFromMat4(viewNormalMatrix, viewMatrix);
	// console.log(viewNormalMatrix)

	const plane = vec4.fromValues(1.0, 0.0, 0.0, 1.0);


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
	
	gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, modelMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
	gl.uniformMatrix3fv(programInfo.uniformLocations.viewNormalMatrix, false, viewNormalMatrix);
	gl.uniform4fv(programInfo.uniformLocations.plane, plane);

	{
		const vertexCount = 12;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.LINE_STRIP, vertexCount, type, offset);
	}

	for (let i = 12; i < 36; i += 4){
		const vertexCount = 4;
		const type = gl.UNSIGNED_SHORT;
		// 2 bype per gl.UNSIGHED_SHORT
		const offset = i * 2;
		gl.drawElements(gl.TRIANGLE_STRIP, vertexCount, type, offset);
	}

	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
				programInfo.attribLocationsFill.vertexPosition,
				numComponents,
				type,
				normalize,
				stride,
				offset);
		gl.enableVertexAttribArray(
				programInfo.attribLocationsFill.vertexPosition);
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
				programInfo.attribLocationsFill.vertexColor,
				numComponents,
				type,
				normalize,
				stride,
				offset);
		gl.enableVertexAttribArray(
				programInfo.attribLocationsFill.vertexColor);
	}
	gl.useProgram(programInfo.ProgramFill);
		
	// Draw filling
	gl.stencilFunc(gl.EQUAL, 1, 0xFF);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
	{
		const vertexCount = 6;
		const type = gl.UNSIGNED_SHORT;
		// 12 vertexs 2 bype per gl.UNSIGHED_SHORT
		const offset = 36 * 2;
		gl.drawElements(gl.TRIANGLE_STRIP, vertexCount, type, offset);
	}
	gl.disable(gl.STENCIL_TEST);
	
	// Update the rotation for the next draw

	rotation += deltaTime;
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

function getNormalMatrix(matrix4) {
	return this.setFromMatrix4(matrix4).invert().transpose();
}

function projectPlanes( planes, camera, dstOffset, skipTransform ) {

	const nPlanes = planes !== null ? planes.length : 0;
	let dstArray = null;

	if ( nPlanes !== 0 ) {
		dstArray = uniform.value;
		if ( skipTransform !== true || dstArray === null ) {
			const flatSize = dstOffset + nPlanes * 4,
				viewMatrix = camera.matrixWorldInverse;

			viewNormalMatrix.getNormalMatrix( viewMatrix );

			if ( dstArray === null || dstArray.length < flatSize ) {

				dstArray = new Float32Array( flatSize );

			}

			for ( let i = 0, i4 = dstOffset; i !== nPlanes; ++ i, i4 += 4 ) {

				plane.copy( planes[ i ] ).applyMatrix4( viewMatrix, viewNormalMatrix );

				plane.normal.toArray( dstArray, i4 );
				dstArray[ i4 + 3 ] = plane.constant;

			}

		}

		uniform.value = dstArray;
		uniform.needsUpdate = true;

	}

	scope.numPlanes = nPlanes;
	scope.numIntersection = 0;

	return dstArray;

}