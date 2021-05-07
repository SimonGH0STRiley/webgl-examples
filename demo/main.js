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
		
		uniform mat4 u_modelViewMatrix;
		uniform mat4 u_matrix;
		
		varying lowp vec4 v_color;
		varying vec3 v_modelViewPosition;
		
		void main() {
			v_modelViewPosition = (u_modelViewMatrix * a_position).xyz;
			gl_Position = u_matrix * a_position;
			v_color = a_color;
		}
	`;

	// Fragment shader program 片段着色器
	const fsSource = `
		precision highp float;
		
		uniform mat4 u_viewMatrix;
		uniform mat3 u_viewNormalMatrix;
		uniform vec4 u_clippingPlane;
		uniform vec4 u_colorMult;

		varying lowp vec4 v_color;
		varying vec3 v_modelViewPosition;

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
		
		void main() {
			vec4 planeInEC = planeToEC(u_clippingPlane, u_viewMatrix, u_viewNormalMatrix);
			float distance = calDistance(planeInEC, v_modelViewPosition);
			if (distance < 0.0) {
				discard;
			}
			gl_FragColor = v_color * u_colorMult;
		}
	`;

	const programInfo = webglUtils.createProgramInfo(gl, [vsSource, fsSource]);

	//const planeBufferInfo		= primitives.createPlaneWithVertexColorsBufferInfo(gl, 20, 20);
	const cubeBufferInfo		= primitives.createCubeWithVertexColorsBufferInfo(gl, 10, 60, 30)
	//const bottomConeBufferInfo	= primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 10, 10, 10, 10, 10);
	const coneBufferInfo	= primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 10, 5, 10, 60, 1, true, true);

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	// let planeUniforms = {
	// 	u_matrix: m4.identity(),
	// 	u_colorMult: [1, 0.5, 0.5, 0.5]
	// };
	let cubeUniforms = {
		u_viewMatrix: undefined,
		u_viewNormalMatrix: undefined,
		u_modelViewMatrix: undefined,
		u_matrix: undefined,
		u_clippingPlane: undefined,
		u_colorMult: [0.5, 1, 0.5, 1]
	};
	let coneUniforms = {
		// u_modelViewMatrix: m4.identity(),
		u_matrix: m4.identity(),
		u_colorMult: [0.5, 0.5, 1, 1]
	};

	let planeTranslation		= [ 0,  0,  0];
	let cubeTranslation 		= [ 0,  5,  0];
	let coneTranslation   = [ 0, -5,  0];

	let objectsToDraw = [{
	// 	programInfo: programInfo,
	// 	bufferInfo: planeBufferInfo,
	// 	uniforms: planeUniforms
	// },{
		programInfo: programInfo,
		bufferInfo: cubeBufferInfo,
		uniforms: cubeUniforms
	}, {
		programInfo: programInfo,
		bufferInfo: coneBufferInfo,
		uniforms: coneUniforms
	}];

	function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
		let matrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		matrix = m4.xRotate(matrix, xRotation);
		matrix = m4.yRotate(matrix, yRotation);
		return matrix
	}

	function computeModelViewMatrix (matrix, projectionMatrix) {
		let modelViewMatrix = mat4.create();
		let inverseProjectionMatrix = mat4.create();
		mat4.invert(inverseProjectionMatrix, projectionMatrix);
		mat4.multiply(modelViewMatrix, inverseProjectionMatrix, matrix);
		return modelViewMatrix;
	}

	requestAnimationFrame(drawScene);

	// Draw the scene.
	function drawScene(time) {
		time *= 0.0005;

		webglUtils.resizeCanvasToDisplaySize(gl.canvas);

		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		//gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);

		// Clear the canvas AND the depth buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Compute the projection matrix
		let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
		let projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

		// Compute the camera's matrix using look at.
		let cameraPosition = [0, 0, 100];
		let target = [0, 0, 0];
		let up = [0, 1, 0];
		let cameraMatrix = m4.lookAt(cameraPosition, target, up);
		let viewMatrix = m4.inverse(cameraMatrix);
		let viewNormalMatrix = mat3.create();
		mat3.normalFromMat4(viewNormalMatrix, viewMatrix);

		let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		let planeXRotation	= -time;
		let planeYRotation	=  time;
		let cubeXRotation	=  0;
		let cubeYRotation	=  0;
		let coneXRotation	=  time;
		let coneYRotation	= -time;

		// 对每个物体计算矩阵
		// planeUniforms.u_matrix = computeMatrix(viewProjectionMatrix, planeTranslation, planeXRotation, planeYRotation);
		
		cubeUniforms.u_viewMatrix = viewMatrix;
		cubeUniforms.u_viewNormalMatrix = viewNormalMatrix;
		cubeUniforms.u_matrix = computeMatrix(viewProjectionMatrix, cubeTranslation, cubeXRotation, cubeYRotation);
		cubeUniforms.u_modelViewMatrix = computeModelViewMatrix(cubeUniforms.u_matrix, projectionMatrix);
		cubeUniforms.u_clippingPlane = vec4.fromValues(1/Math.sqrt(3), 1/Math.sqrt(3), 1/Math.sqrt(3), -3);

		coneUniforms.u_matrix = computeMatrix(viewProjectionMatrix, coneTranslation, coneXRotation, coneYRotation);

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
