"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	// Vertex shader program 顶点着色器
	const vsSource = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		
		uniform mat4 u_modelViewMatrix;
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying lowp vec4 v_color;
		varying vec3 v_modelViewPosition;
		
		void main() {
			v_modelViewPosition = (u_modelViewMatrix * a_position).xyz;
			gl_Position = u_modelViewProjectionMatrix * a_position;
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

	const clippedProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);
	const unclippedProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);

	const clippingFront	= m4.createVec4FromValues( 1/Math.sqrt(3),  1/Math.sqrt(3),  1/Math.sqrt(3), -5/Math.sqrt(3));
	const clippingBack	= m4.createVec4FromValues(-1/Math.sqrt(3), -1/Math.sqrt(3), -1/Math.sqrt(3),  5/Math.sqrt(3));
	// let planeTransformMatrix = m4.identity();
	// planeTransformMatrix = m4.xRotate(planeTransformMatrix, -Math.PI / 4);
	// planeTransformMatrix = m4.yRotate(planeTransformMatrix, -Math.PI / 4);
	// planeTransformMatrix = m4.zRotate(planeTransformMatrix, -Math.PI / 2);

	const frontObjBufferInfo	= primitives.createCubeWithVertexColorsBufferInfo(gl, 10, 60, 30);
	const backObjBufferInfo		= primitives.createCubeWithVertexColorsBufferInfo(gl, 10, 60, 30);

	const planeBufferInfo = primitives.createPlaneWithVertexColorsBufferInfo(gl, 20, 20, 1, 1);
	// const planeBufferInfo = primitives.createPlaneWithVertexColorsBufferInfo(gl, 20, 20, 1, 1, planeTransformMatrix);

	
	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	let frontObjUniforms = {
		u_modelMatrix: null,
		u_viewMatrix: null,
		u_modelViewMatrix: null,
		u_modelViewProjectionMatrix: null,
		u_viewNormalMatrix: null,
		u_clippingPlane: null,
		u_colorMult: [0.5, 1, 0.5, 1]
	};
	let backObjUniforms = {
		u_modelMatrix: null,
		u_viewMatrix: null,
		u_modelViewMatrix: null,
		u_modelViewProjectionMatrix: null,
		u_viewNormalMatrix: null,
		u_clippingPlane: null,
		u_colorMult: [0.5, 0.5, 1, 1]
	};


	let planeUniforms = {
		u_modelViewProjectionMatrix: m4.identity(),
		u_colorMult: [1, 0.5, 0.5, 1]
	}

	let frontObjTranslation 	= [  10,  10,   0];
	let backObjTranslation 		= [ -10, -10,   0];
	let planeTranslation		= [  10,  10,   0];


	let objectsToDraw = [{
		programInfo: clippedProgram,
		bufferInfo: frontObjBufferInfo,
		uniforms: frontObjUniforms
	}, {
		programInfo: clippedProgram,
		bufferInfo: backObjBufferInfo,
		uniforms: backObjUniforms
	}, {
		programInfo: unclippedProgram,
		bufferInfo: planeBufferInfo,
		uniforms: planeUniforms
	}];

	function computeModelMatrix(translation, rotation) {
		let modelMatrix = m4.translation(
			translation[0],
			translation[1],
			translation[2]);
		modelMatrix = m4.xRotate(modelMatrix, rotation[0]);
		modelMatrix = m4.yRotate(modelMatrix, rotation[1]);
		modelMatrix = m4.zRotate(modelMatrix, rotation[2]);
		return modelMatrix;
	}

	function computeModelViewProjectionMatrix(viewProjectionMatrix, translation, rotation) {
		let modelViewProjectionMatrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		modelViewProjectionMatrix = m4.xRotate(modelViewProjectionMatrix, rotation[0]);
		modelViewProjectionMatrix = m4.yRotate(modelViewProjectionMatrix, rotation[1]);
		modelViewProjectionMatrix = m4.zRotate(modelViewProjectionMatrix, rotation[2]);
		return modelViewProjectionMatrix;
	}

	function computeClipping(plane, translation, rotation) {
		let transformedPlane = m4.cloneVec4(plane);
		let transformMatrix = m4.translation(
			translation[0],
			translation[1],
			translation[2]);
		transformMatrix = m4.xRotate(transformMatrix, rotation[0]);
		transformMatrix = m4.yRotate(transformMatrix, rotation[1]);
		transformMatrix = m4.zRotate(transformMatrix, rotation[2]);
		transformMatrix = m4.transpose(transformMatrix);
		transformMatrix = m4.inverse(transformMatrix);
		transformedPlane = m4.transformVector(transformMatrix, transformedPlane);
		return transformedPlane;
	}

	requestAnimationFrame(drawScene);

	// Draw the scene.
	function drawScene(time) {
		time *= 0.0005;

		let lastUsedProgramInfo = null;
		let lastUsedBufferInfo = null;

		webglUtils.resizeCanvasToDisplaySize(gl.canvas);

		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		//gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);

		// Clear the canvas AND the depth buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		// Compute the projection matrix
		let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
		let projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

		// Compute the camera's matrix using look at.
		let cameraPosition = [0, 0, 100];
		let target = [0, 0, 0];
		let up = [0, 1, 0];
		let cameraMatrix = m4.lookAt(cameraPosition, target, up);
		let viewMatrix = m4.inverse(cameraMatrix);
		let viewNormalMatrix = m4.normalFromMat4(viewMatrix);
		let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		let frontObjRotation	=  [ time,  time,  0];
		let backObjRotation		=  [ time, -time,  0];
		let planeRotation		=  [ time,  time,  0];

		// 对每个物体计算矩阵
		// 对于需要clipping的物体
		frontObjUniforms.u_modelMatrix = computeModelMatrix(frontObjTranslation, frontObjRotation);
		frontObjUniforms.u_viewMatrix = viewMatrix;
		frontObjUniforms.u_modelViewMatrix = m4.multiply(viewMatrix, frontObjUniforms.u_modelMatrix);
		frontObjUniforms.u_modelViewProjectionMatrix = m4.multiply(projectionMatrix, frontObjUniforms.u_modelViewMatrix);
		frontObjUniforms.u_viewNormalMatrix = viewNormalMatrix;
		frontObjUniforms.u_clippingPlane = computeClipping(clippingFront, frontObjTranslation, frontObjRotation);


		backObjUniforms.u_modelMatrix = computeModelMatrix(backObjTranslation, backObjRotation);
		backObjUniforms.u_viewMatrix = viewMatrix;
		backObjUniforms.u_modelViewMatrix = m4.multiply(viewMatrix, backObjUniforms.u_modelMatrix);
		backObjUniforms.u_modelViewProjectionMatrix = m4.multiply(projectionMatrix, backObjUniforms.u_modelViewMatrix);
		backObjUniforms.u_viewNormalMatrix = viewNormalMatrix;
		backObjUniforms.u_clippingPlane = computeClipping(clippingBack, backObjTranslation, backObjRotation);

		// 对于不需要clipping的物体
		planeUniforms.u_modelViewProjectionMatrix = computeModelViewProjectionMatrix(viewProjectionMatrix, planeTranslation, planeRotation);

		// 在这里画物体
		objectsToDraw.forEach(function(object) {
		let programInfo = object.programInfo;
		let bufferInfo = object.bufferInfo;
		let bindBuffers = false;

		if (programInfo !== lastUsedProgramInfo) {
			lastUsedProgramInfo = programInfo;
			gl.useProgram(programInfo.program);
			// 更换程序后要重新绑定缓冲，因为只需要绑定程序要用的缓冲。
    		// 如果两个程序使用相同的bufferInfo但是第一个只用位置数据，
    		// 当我们从第一个程序切换到第二个时，有些属性就不存在。
    		bindBuffers = true;
		}

		// 设置属性
		if (bindBuffers || bufferInfo !== lastUsedBufferInfo) {
			lastUsedBufferInfo = bufferInfo;
			webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
		}

		// 设置uniform变量
		webglUtils.setUniforms(programInfo, object.uniforms);

		// 绘制3D图形
		gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
		});

		requestAnimationFrame(drawScene);
	}
}

main();
