"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	ui.setupSlider("#translate",	{
		slide:	updateClippingTransformMatrix('translateY'),
		value:	0,
		min:	-5,
		max:	5,
		step:	0.1,
		precision: 1
	});
	ui.setupSlider("#rotate-x", {
		slide: updateClippingTransformMatrix('rotateX'),
		value: 0,
		min: 0,
		max: 90
	}); 
	ui.setupSlider("#rotate-y", {
		slide: updateClippingTransformMatrix('rotateY'),
		value: 0,
		min: 0,
		max: 90
	}); 

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

	const objectProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);
	const planeProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);

	// let selectedObject		= null;
	// let frontObjBufferInfo	= primitives.createCubeWithVertexColorsBufferInfo(gl, 10);
	// let backObjBufferInfo	= frontObjBufferInfo;
	// document.getElementById("objList").addEventListener("click", selectObject);
	// function selectObject() {
	// 	const objectTypeList = document.getElementsByName("objType");
	// 	objectTypeList.forEach(currObject => {
	// 		if (currObject.checked) {
	// 			// selectedObject = currObject.value;
	// 			// console.log(selectedObject);
	// 			console.log(currObject.value);
	// 			frontObjBufferInfo	= primitives.createSphereWithVertexColorsBufferInfo(gl, 5, 60, 30);
	// 			backObjBufferInfo	= frontObjBufferInfo;
	// 		}
	// 	})
	// }

	// if (!selectedObject || selectedObject === 'cube') {
	// 	frontObjBufferInfo	= primitives.createCubeWithVertexColorsBufferInfo(gl, 10);
	// 	backObjBufferInfo = frontObjBufferInfo;
	// } else if (selectedObject === 'sphere') {
	// 	frontObjBufferInfo	= primitives.createSphereWithVertexColorsBufferInfo(gl, 5);
	// } else if (selectedObject === 'pyramid') {
	// 	frontObjBufferInfo	= primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 0, 0, 10, 10, 10);
	// } else if (selectedObject === 'cone') {
	// 	frontObjBufferInfo	= primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 0, 5, 10);
	// } else if (selectedObject === 'slinder') {
	// 	frontObjBufferInfo	= primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 5, 5, 10);
	// }


	const frontObjBufferInfo	= primitives.createCubeWithVertexColorsBufferInfo(gl, 10);
	const backObjBufferInfo	= frontObjBufferInfo;
	frontObjBufferInfo.useStencil		= backObjBufferInfo.useStencil		= true;
	frontObjBufferInfo.stencilClear		= backObjBufferInfo.stencilClear	= true;
	frontObjBufferInfo.stencilWrite		= backObjBufferInfo.stencilWrite	= true;
	frontObjBufferInfo.stencilFrontOp	= backObjBufferInfo.stencilFrontOp	= [gl.KEEP, gl.KEEP, gl.DECR];
	frontObjBufferInfo.stencilBackOp	= backObjBufferInfo.stencilBackOp	= [gl.KEEP, gl.KEEP, gl.INCR];
	frontObjBufferInfo.stencilFunc		= backObjBufferInfo.stencilFunc		= [gl.ALWAYS, 1, 0xFF];
	
	let clippingTransformMatrix = m4.identity();
	let recentTransform = [0, 0, 0, 0];

	let clippingFrontBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 30, 30, 1, 1, clippingTransformMatrix);
	let clippingBackBufferInfo	= clippingFrontBufferInfo;
	clippingFrontBufferInfo.useStencil	= clippingBackBufferInfo.useStencil	= true;
	clippingFrontBufferInfo.stencilOp	= clippingBackBufferInfo.stencilOp	= [gl.KEEP, gl.KEEP, gl.KEEP];
	clippingFrontBufferInfo.stencilFunc	= clippingBackBufferInfo.stencilFunc= [gl.EQUAL, 1, 0xFF];
	// clippingFrontBufferInfo.useStencil	= true;
	// clippingFrontBufferInfo.stencilOp	= [gl.KEEP, gl.KEEP, gl.KEEP];
	// clippingFrontBufferInfo.stencilFunc	= [gl.EQUAL, 1, 0xFF];
	// clippingBackBufferInfo.useStencil	= true;
	// clippingBackBufferInfo.stencilOp	= [gl.KEEP, gl.KEEP, gl.KEEP];
	// clippingBackBufferInfo.stencilFunc	= [gl.EQUAL, 1, 0xFF];


	// clippingTransformMatrix = m4.translate(clippingTransformMatrix, 5/3, 5/3, 5/3);
	// clippingTransformMatrix = m4.zRotate(clippingTransformMatrix, -Math.PI / 4);
	// clippingTransformMatrix = m4.xRotate(clippingTransformMatrix, Math.asin(1 / Math.sqrt(3)));
	let clippingFront	= m4.transformVector(m4.inverse(m4.transpose(clippingTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
	let clippingBack	= m4.reverseVec4(clippingFront);

	function updateClippingTransformMatrix(method) {
		return function (event, ui) {
			if (method === 'translateY') {
				clippingTransformMatrix = m4.translate(clippingTransformMatrix, 0, ui.value - recentTransform[0], 0);
				recentTransform[0] = ui.value;
			} else if (method === 'rotateX') {
				clippingTransformMatrix = m4.xRotate(clippingTransformMatrix, degToRad(ui.value - recentTransform[1]));
				recentTransform[1] = ui.value;
			} else if (method === 'rotateY') {
				clippingTransformMatrix = m4.yRotate(clippingTransformMatrix, degToRad(ui.value - recentTransform[2]));
				recentTransform[2] = ui.value;
			}
			clippingFront	= m4.transformVector(m4.inverse(m4.transpose(clippingTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
			clippingBack	= m4.reverseVec4(clippingFront);
			clippingFrontBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 20, 20, 1, 1, clippingTransformMatrix);
			clippingBackBufferInfo	= clippingFrontBufferInfo;
			console.log(clippingTransformMatrix);
		}
	}

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
	let frontPlaneUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0, 0, 1, 1]
	};
	let backPlaneUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [1, 0, 0, 1]
	};

	let frontObjTranslation 	= [  0,  7,  0];
	let backObjTranslation 		= [  0, -7,  0];

	let objectsToDraw = [{
		programInfo: objectProgram,
		bufferInfo: frontObjBufferInfo,
		uniforms: frontObjUniforms
	}, {
		programInfo: planeProgram,
		bufferInfo: clippingFrontBufferInfo,
		uniforms: frontPlaneUniforms
	}, {
		programInfo: objectProgram,
		bufferInfo: backObjBufferInfo,
		uniforms: backObjUniforms
	}, {
		programInfo: planeProgram,
		bufferInfo: clippingBackBufferInfo,
		uniforms: backPlaneUniforms
	}
	];

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

	function computeModelViewProjectionMatrix(viewProjectionMatrix, translation, rotation, transformMatrix) {
		let modelViewProjectionMatrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		modelViewProjectionMatrix = m4.xRotate(modelViewProjectionMatrix, rotation[0]);
		modelViewProjectionMatrix = m4.yRotate(modelViewProjectionMatrix, rotation[1]);
		modelViewProjectionMatrix = m4.zRotate(modelViewProjectionMatrix, rotation[2]);
		return m4.multiply(modelViewProjectionMatrix, transformMatrix);
	}

	function computeClipping(plane, translation, rotation) {
		let transformedPlane = m4.cloneVec4(plane);
		let transformMatrix = m4.translation(translation[0], translation[1], translation[2]);
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
		let cameraPosition = [0, 20, 50];
		let target = [0, 0, 0];
		let up = [0, 1, 0];
		let cameraMatrix = m4.lookAt(cameraPosition, target, up);
		let viewMatrix = m4.inverse(cameraMatrix);
		let viewNormalMatrix = m4.normalFromMat4(viewMatrix);
		let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		let frontObjRotation	=  [ 0,  time,  0];
		let backObjRotation		=  [ 0,  time,  0];

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
		frontPlaneUniforms.u_modelViewProjectionMatrix	= 
			computeModelViewProjectionMatrix(viewProjectionMatrix, frontObjTranslation, frontObjRotation, clippingTransformMatrix);
		backPlaneUniforms.u_modelViewProjectionMatrix	= 
			computeModelViewProjectionMatrix(viewProjectionMatrix, backObjTranslation, backObjRotation, clippingTransformMatrix);

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

		// Stencil 相关
		if (bufferInfo.useStencil) {
			gl.enable(gl.STENCIL_TEST);
		} else {
			gl.disable(gl.STENCIL_TEST);
		}
		if (bufferInfo.stencilClear) {
			gl.stencilMask(0xFF);
			gl.clear(gl.STENCIL_BUFFER_BIT);
		}
		if (bufferInfo.stencilWrite) {
			gl.stencilMask(0xFF);
		} else {
			gl.stencilMask(0);
		}
		if (bufferInfo.stencilOp) {
			gl.stencilOp(bufferInfo.stencilOp[0], bufferInfo.stencilOp[1], bufferInfo.stencilOp[2]);
		}
		if (bufferInfo.stencilFrontOp) {
			gl.stencilOpSeparate(gl.FRONT, bufferInfo.stencilFrontOp[0], bufferInfo.stencilFrontOp[1], bufferInfo.stencilFrontOp[2]);
		}
		if (bufferInfo.stencilBackOp) {
			gl.stencilOpSeparate(gl.BACK, bufferInfo.stencilBackOp[0], bufferInfo.stencilBackOp[1], bufferInfo.stencilBackOp[2]);
		}
		if (bufferInfo.stencilFunc) {
			gl.stencilFunc(bufferInfo.stencilFunc[0], bufferInfo.stencilFunc[1], bufferInfo.stencilFunc[2])
		}
		// 绘制3D图形
		gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
		});

		requestAnimationFrame(drawScene);
	}
}

main();
