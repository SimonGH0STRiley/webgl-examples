"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	// Vertex shader program 顶点着色器
	const vsSource = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		
		uniform mat4 u_matrix;
		
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_matrix * a_position;
			v_color = a_color;
		}
	`;

	// Fragment shader program 片段着色器
	const fsSource = `
		precision highp float;
		
		uniform vec4 u_colorMult;
		
		varying lowp vec4 v_color;
		
		void main() {
		gl_FragColor = v_color * u_colorMult;
		}
	`;

	const programInfo = webglUtils.createProgramInfo(gl, [vsSource, fsSource]);

	const topConeBufferInfo		= primitives.createSphereWithVertexColorsBufferInfo(gl, 10, 60, 30)
	// const bottomConeBufferInfo	= primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 10, 10, 10, 10, 10);
	const bottomConeBufferInfo	= primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 10, 5, 10, 60, 1, true, true);

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	let topConeUniforms = {
		u_colorMult: [0.5, 1, 0.5, 1],
		u_matrix: m4.identity(),
	};
	let bottomConeUniforms = {
		u_colorMult: [0.5, 0.5, 1, 1],
		u_matrix: m4.identity(),
	};
	let topConeTranslation 		= [  0, 5, 0];
	let bottomConeTranslation   = [  0, -5, 0];

	let objectsToDraw = [{
		programInfo: programInfo,
		bufferInfo: topConeBufferInfo,
		uniforms: topConeUniforms,
	}, {
		programInfo: programInfo,
		bufferInfo: bottomConeBufferInfo,
		uniforms: bottomConeUniforms,
	},];

  function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
	let matrix = m4.translate(viewProjectionMatrix,
		translation[0],
		translation[1],
		translation[2]);
	matrix = m4.xRotate(matrix, xRotation);
	return m4.yRotate(matrix, yRotation);
  }

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {
	time *= 0.0005;

	webglUtils.resizeCanvasToDisplaySize(gl.canvas);

	// Tell WebGL how to convert from clip space to pixels
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);

	// Clear the canvas AND the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Compute the projection matrix
	let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	let projectionMatrix =
		m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

	// Compute the camera's matrix using look at.
	let cameraPosition = [0, 0, 100];
	let target = [0, 0, 0];
	let up = [0, 1, 0];
	let cameraMatrix = m4.lookAt(cameraPosition, target, up);

	// Make a view matrix from the camera matrix.
	let viewMatrix = m4.inverse(cameraMatrix);

	let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

	let topConeXRotation =  time;
	let topConeYRotation =  time;
	let bottomConeXRotation   =  time;
	let bottomConeYRotation   = -time;

	// 对每个物体计算矩阵
	
	topConeUniforms.u_matrix = computeMatrix(
		viewProjectionMatrix,
		topConeTranslation,
		topConeXRotation,
		topConeYRotation);

	bottomConeUniforms.u_matrix = computeMatrix(
		viewProjectionMatrix,
		bottomConeTranslation,
		bottomConeXRotation,
		bottomConeYRotation);

	// 在这里画物体

	objectsToDraw.forEach(function(object) {
	  let programInfo = object.programInfo;
	  let bufferInfo = object.bufferInfo;

	  gl.useProgram(programInfo.program);

	  // Setup all the needed attributes.
	  webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);

	  // Set the uniforms.
	  webglUtils.setUniforms(programInfo, object.uniforms);

	  // Draw
	  gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
	});

	requestAnimationFrame(drawScene);
  }
}

main();
