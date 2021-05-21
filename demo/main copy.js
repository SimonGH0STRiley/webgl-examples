"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	// Object vertex shader program 顶点着色器
	const objectVS = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_color = a_color;
		}
	`;

	let isClipped = false;

	// Object fragment shader program 片段着色器
	const objectFS = `
		precision highp float;
		
		uniform vec4 u_colorMult;

		varying lowp vec4 v_color;
		
		void main() {
			gl_FragColor = v_color * u_colorMult;
			gl_FragColor.w = u_colorMult.w;
		}
	`;

	// Clipping vertex shader program 顶点着色器
	const clippingVS = `
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

	// clipping fragment shader program 片段着色器
	const clippingFS = `
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

	const objectProgram		= webglUtils.createProgramInfo(gl, [objectVS,	objectFS]);
	const planeProgram		= webglUtils.createProgramInfo(gl, [objectVS,	objectFS]);
	const clippedProgram	= webglUtils.createProgramInfo(gl, [clippingVS,	clippingFS]);
	const clippingProgram	= webglUtils.createProgramInfo(gl, [clippingVS,	clippingFS]);

	const objectBufferInfo	= [
		primitives.createCubeWithVertexColorsBufferInfo(gl, 10),
		primitives.createSphereWithVertexColorsBufferInfo(gl, 5),
		primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 0, 0, 10, 10, 10),
		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 0, 5, 10),
		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 5, 5, 10)
	];
	document.getElementById("objectList").addEventListener("change", () => {
		const objectTypeList = document.getElementsByName("objectType");
		objectTypeList.forEach((currObject) => {
			if (currObject.checked) {
				objectsToDraw[0].bufferInfo = objectBufferInfo[currObject.value];
			}
		});
	});
	
	let planeTransformMatrix = m4.identity();
	let planeBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 30, 30, 1, 1, planeTransformMatrix);
	document.getElementById("sliderList").addEventListener("input", () => {
		const translateX = document.getElementById("xTranslation").value;
		const translateY = document.getElementById("yTranslation").value;
		const translateZ = document.getElementById("zTranslation").value;
		const rotateX = document.getElementById("xRotaion").value;
		const rotateZ = document.getElementById("zRotaion").value;

		document.getElementById("xTranslationValue").textContent = translateX;
		document.getElementById("yTranslationValue").textContent = translateY;
		document.getElementById("zTranslationValue").textContent = translateZ;
		document.getElementById("xRotationValue").textContent = rotateX;
		document.getElementById("zRotationValue").textContent = rotateZ;

		planeTransformMatrix = m4.translation(translateX, translateY, translateZ);
		planeTransformMatrix = m4.xRotate(planeTransformMatrix, degToRad(rotateX));
		planeTransformMatrix = m4.zRotate(planeTransformMatrix, degToRad(rotateZ));
	});

	let clippingFront, clippingBack	= undefined;
	document.getElementById("clip").addEventListener("click", () => {
		console.log('clip start here');

		isClipped = true;

		const frontObjBufferInfo	= objectsToDraw[0].bufferInfo;
		const backObjBufferInfo		= frontObjBufferInfo;
		frontObjBufferInfo.useStencil		= backObjBufferInfo.useStencil		= true;
		frontObjBufferInfo.stencilClear		= backObjBufferInfo.stencilClear	= true;
		frontObjBufferInfo.stencilWrite		= backObjBufferInfo.stencilWrite	= true;
		frontObjBufferInfo.stencilFrontOp	= backObjBufferInfo.stencilFrontOp	= [gl.KEEP, gl.KEEP, gl.DECR];
		frontObjBufferInfo.stencilBackOp	= backObjBufferInfo.stencilBackOp	= [gl.KEEP, gl.KEEP, gl.INCR];
		frontObjBufferInfo.stencilFunc		= backObjBufferInfo.stencilFunc		= [gl.ALWAYS, 1, 0xFF];

		const clippingTransformMatrix	= planeTransformMatrix;		
		const clippingFrontBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 30, 30, 1, 1, clippingTransformMatrix);
		const clippingBackBufferInfo	= clippingFrontBufferInfo;
		clippingFrontBufferInfo.useStencil	= clippingBackBufferInfo.useStencil	= true;
		clippingFrontBufferInfo.stencilOp	= clippingBackBufferInfo.stencilOp	= [gl.KEEP, gl.KEEP, gl.KEEP];
		clippingFrontBufferInfo.stencilFunc	= clippingBackBufferInfo.stencilFunc= [gl.EQUAL, 1, 0xFF];

		clippingFront	= m4.transformVector(m4.inverse(m4.transpose(clippingTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
		clippingBack	= m4.reverseVec4(clippingFront);
		objectsToDraw = [{
			programInfo: clippedProgram,
			bufferInfo: frontObjBufferInfo,
			uniforms: frontObjectUniforms
		}, {
			programInfo: clippingProgram,
			bufferInfo: clippingFrontBufferInfo,
			uniforms: frontPlaneUniforms
		}, {
			programInfo: clippedProgram,
			bufferInfo: backObjBufferInfo,
			uniforms: backObjectUniforms
		}, {
			programInfo: clippingProgram,
			bufferInfo: clippingBackBufferInfo,
			uniforms: backPlaneUniforms
		}
		];

		console.log('clip end here')
	});
	document.getElementById("reset").addEventListener("click", () => {
		// location.reload();
		// isClipped = false;
		// objectsToDraw.splice(2, 2);
		// objectsToDraw = [{
		// 	programInfo: objectProgram,
		// 	bufferInfo: objectsToDraw[0].bufferInfo,
		// 	uniforms: objectUniforms
		// }, {
		// 	programInfo: planeProgram,
		// 	bufferInfo: planeBufferInfo,
		// 	uniforms: planeUniforms
		// }
		// ];
	});

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	let objectUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0.5, 1, 0.5, 0.8]
	};

	let objectClippedUniforms = {
		u_modelMatrix: null,
		u_viewMatrix: null,
		u_modelViewMatrix: null,
		u_modelViewProjectionMatrix: null,
		u_viewNormalMatrix: null,
		u_clippingPlane: null,
		u_colorMult: [0.5, 0.5, 1, 1]
	};

	let planeUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0, 0, 1, 0.5]
	};

	let planeInnerUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0, 0, 1, 0.8]
	};

	let frontObjectUniforms = {
		u_modelMatrix: null,
		u_viewMatrix: null,
		u_modelViewMatrix: null,
		u_modelViewProjectionMatrix: null,
		u_viewNormalMatrix: null,
		u_clippingPlane: null,
		u_colorMult: [0.5, 1, 0.5, 1]
	};
	let backObjectUniforms = {
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

	let objectTranslation 	= [  0,  0,  0];
	let frontObjectTranslation 		= [  0,  7,  0];
	let backObjectTranslation 		= [  0, -7,  0];

	let objectsToDraw = [
	{
		// 1
		programInfo: objectProgram,
		bufferInfo: objectBufferInfo[1],
		uniforms: objectUniforms,
		renderOption: {
			disableColor: true,
			cullFace: gl.FRONT,
		},
	},
	{
		// 2
		programInfo: planeProgram,
		bufferInfo: planeBufferInfo,
		uniforms: planeUniforms,
		renderOption: {
			disableColor: false,
			disableDepthWrite: true,
			depthFunc: gl.GREATER,
		}
	},
	{
		// 3
		programInfo: objectProgram,
		bufferInfo: objectBufferInfo[1],
		uniforms: objectUniforms,
		renderOption: {
			disableDepth: true,
			depthFunc: gl.LESS,
			cullFace: gl.FRONT,
		},
	},
	{
		// 4
		programInfo: clippingProgram,
		bufferInfo: objectBufferInfo[1],
		uniforms: objectClippedUniforms,
		renderOption: {
			clearDepth: true,
			useStencil: true,
			stencilWrite: true,
			disableColor: true,
			stencilBackOp: [gl.KEEP, gl.KEEP, gl.INCR],
			stencilFrontOp: [gl.KEEP, gl.KEEP, gl.DECR],
			stencilFunc: [gl.ALWAYS, 1, 0xFF],
		}
	},
	
	{
		// 6
		programInfo: objectProgram,
		bufferInfo: objectBufferInfo[1],
		uniforms: objectUniforms,
		renderOption: {
			clearDepth: true,
			cullFace: gl.BACK,
		},
	},
	{
		// 7
		programInfo: planeProgram,
		bufferInfo: planeBufferInfo,
		uniforms: planeUniforms,
		renderOption: {
			useStencil: true,
			stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
			stencilFunc: [gl.NOTEQUAL, 1, 0xFF],
		}
	},
	{
		// 5
		programInfo: planeProgram,
		bufferInfo: planeBufferInfo,
		uniforms: planeInnerUniforms,
		renderOption: {
			
			disableDepth: true,
			useStencil: true,
			stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
			stencilFunc: [gl.EQUAL, 1, 0xFF],
		}
	},
	];

	function computeObjectMatrix(viewProjectionMatrix, translation, rotation) {
		let matrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		matrix = m4.xRotate(matrix, rotation[0]);
		matrix = m4.yRotate(matrix, rotation[1]);
		matrix = m4.zRotate(matrix, rotation[2]);
		return matrix
	}

	function computePlaneMatrix(viewProjectionMatrix, translation, rotation, transformMatrix) {
		let matrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		matrix = m4.xRotate(matrix, rotation[0]);
		matrix = m4.yRotate(matrix, rotation[1]);
		matrix = m4.zRotate(matrix, rotation[2]);
		return m4.multiply(matrix, transformMatrix);
	}

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

		gl.enable(gl.CULL_FACE);
		gl.frontFace(gl.CCW);
		//gl.cullFace(gl.FRONT);
		gl.enable(gl.DEPTH_TEST);
		gl.colorMask(true, true, true, true);
		gl.depthMask(true);

		// Clear the canvas AND the depth buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		// Compute the projection matrix
		let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
		let projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

		// Compute the camera's matrix using look at.
		let cameraPosition = [20, 20, 50];
		let target = [0, 0, 0];
		let up = [0, 1, 0];
		let cameraMatrix = m4.lookAt(cameraPosition, target, up);
		let viewMatrix = m4.inverse(cameraMatrix);
		let viewNormalMatrix = m4.normalFromMat4(viewMatrix);
		let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		let objectRotation		=  [ 0,  time,  0];
		let frontObjRotation	=  [ 0,  0,  0];
		let backObjRotation		=  [ 0,  0,  0];

		if (!isClipped) {
			// 对每个物体计算矩阵
			objectUniforms.u_modelViewProjectionMatrix = 
				computeObjectMatrix(viewProjectionMatrix, objectTranslation, objectRotation);

			planeUniforms.u_modelViewProjectionMatrix = 
				computePlaneMatrix(viewProjectionMatrix, objectTranslation, objectRotation, planeTransformMatrix);
			planeInnerUniforms.u_modelViewProjectionMatrix = planeUniforms.u_modelViewProjectionMatrix
			let clippingBack	= m4.transformVector(m4.inverse(m4.transpose(planeTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
			clippingBack = m4.reverseVec4(clippingBack);

			objectClippedUniforms.u_modelMatrix = computeModelMatrix(objectTranslation, objectRotation);
			objectClippedUniforms.u_viewMatrix = viewMatrix;
			objectClippedUniforms.u_modelViewMatrix = m4.multiply(viewMatrix, objectClippedUniforms.u_modelMatrix);
			objectClippedUniforms.u_modelViewProjectionMatrix = m4.multiply(projectionMatrix, objectClippedUniforms.u_modelViewMatrix);
			objectClippedUniforms.u_viewNormalMatrix = viewNormalMatrix;
			objectClippedUniforms.u_clippingPlane = computeClipping(clippingBack, objectTranslation, objectRotation);
		} else {
			// 对每个物体计算矩阵
			// 对于需要clipping的物体
			frontObjectUniforms.u_modelMatrix = computeModelMatrix(frontObjectTranslation, frontObjRotation);
			frontObjectUniforms.u_viewMatrix = viewMatrix;
			frontObjectUniforms.u_modelViewMatrix = m4.multiply(viewMatrix, frontObjectUniforms.u_modelMatrix);
			frontObjectUniforms.u_modelViewProjectionMatrix = m4.multiply(projectionMatrix, frontObjectUniforms.u_modelViewMatrix);
			frontObjectUniforms.u_viewNormalMatrix = viewNormalMatrix;
			frontObjectUniforms.u_clippingPlane = computeClipping(clippingFront, frontObjectTranslation, frontObjRotation);

			backObjectUniforms.u_modelMatrix = computeModelMatrix(backObjectTranslation, backObjRotation);
			backObjectUniforms.u_viewMatrix = viewMatrix;
			backObjectUniforms.u_modelViewMatrix = m4.multiply(viewMatrix, backObjectUniforms.u_modelMatrix);
			backObjectUniforms.u_modelViewProjectionMatrix = m4.multiply(projectionMatrix, backObjectUniforms.u_modelViewMatrix);
			backObjectUniforms.u_viewNormalMatrix = viewNormalMatrix;
			backObjectUniforms.u_clippingPlane = computeClipping(clippingBack, backObjectTranslation, backObjRotation);

			// 对于不需要clipping的物体
			frontPlaneUniforms.u_modelViewProjectionMatrix	= 
				computeObjectMatrix(viewProjectionMatrix, frontObjectTranslation, frontObjRotation);
			backPlaneUniforms.u_modelViewProjectionMatrix	= 
				computeObjectMatrix(viewProjectionMatrix, backObjectTranslation, backObjRotation);
		}
		
		
		// 在这里画物体
		objectsToDraw.forEach(function(object) {
		const programInfo = object.programInfo;
		const bufferInfo = object.bufferInfo;
		const renderOption = object.renderOption || {};
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

		if (!isClipped) {
			if (programInfo === objectProgram) {
				gl.depthMask(true);
				//gl.disable(gl.BLEND);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			} else if (programInfo === planeProgram) {
				gl.depthMask(false);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			}
		} else {
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		if (renderOption.disableDepth) {
			gl.disable(gl.DEPTH_TEST);
		} else {
			gl.enable(gl.DEPTH_TEST);
		}
		if (renderOption.clearDepth) {
			gl.depthMask(true);
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}
		if (renderOption.disableDepthWrite) {
			gl.depthMask(false);
		} else {
			gl.depthMask(true);
		}
		if (renderOption.depthFunc) {
			gl.depthFunc(renderOption.depthFunc);
		} else {
			gl.depthMask(gl.LESS);
		}

		if (renderOption.disableColor) {
			gl.colorMask(false, false, false, false);
		} else {
			gl.colorMask(true, true, true, true);
		}

		if (renderOption.cullFace) {
			gl.enable(gl.CULL_FACE);
			gl.cullFace(renderOption.cullFace);
		} else {
			gl.disable(gl.CULL_FACE);
		}

		// Stencil 相关
		if (renderOption.useStencil) {
			gl.enable(gl.STENCIL_TEST);
		} else {
			gl.disable(gl.STENCIL_TEST);
		}
		if (renderOption.stencilClear) {
			gl.stencilMask(0xFF);
			gl.clear(gl.STENCIL_BUFFER_BIT);
		}
		if (renderOption.stencilWrite) {
			gl.stencilMask(0xFF);
		} else {
			gl.stencilMask(0);
		}
		if (renderOption.stencilOp) {
			gl.stencilOp(renderOption.stencilOp[0], renderOption.stencilOp[1], renderOption.stencilOp[2]);
		}
		if (renderOption.stencilFrontOp) {
			gl.stencilOpSeparate(gl.FRONT, renderOption.stencilFrontOp[0], renderOption.stencilFrontOp[1], renderOption.stencilFrontOp[2]);
		}
		if (renderOption.stencilBackOp) {
			gl.stencilOpSeparate(gl.BACK, renderOption.stencilBackOp[0], renderOption.stencilBackOp[1], renderOption.stencilBackOp[2]);
		}
		if (renderOption.stencilFunc) {
			gl.stencilFunc(renderOption.stencilFunc[0], renderOption.stencilFunc[1], renderOption.stencilFunc[2])
		}
		// 绘制3D图形
		gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
		});

		requestAnimationFrame(drawScene);
	}
}

main();
