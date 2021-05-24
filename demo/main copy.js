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
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		uniform mat3 u_normalMatrix;
		
		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_normal = u_normalMatrix * a_normal;
			v_color = a_color;
		}
	`;

	// Object fragment shader program 片段着色器
	const objectFS = `
		precision highp float;
		
		uniform vec4 u_colorMult;
		uniform vec3 u_lightPosition;

		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			vec3 normal = normalize(v_normal);
			float light = dot(normal, u_lightPosition);
			gl_FragColor = v_color * u_colorMult;
			gl_FragColor.xyz *= light;
		}
	`;

	// Plane vertex shader program 顶点着色器
	const planeVS = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_color = a_color;
		}
	`;

	// Planefragment shader program 片段着色器
	const planeFS = `
		precision highp float;
		
		uniform vec4 u_colorMult;

		varying lowp vec4 v_color;
		
		void main() {
			gl_FragColor = v_color * u_colorMult;
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
	const planeProgram		= webglUtils.createProgramInfo(gl, [planeVS,	planeFS]);
	const clippedProgram	= webglUtils.createProgramInfo(gl, [clippingVS,	clippingFS]);
	
	const objectBufferInfo	= new Map ([
		['default',		primitives.createCubeWithVertexColorsBufferInfo(gl, 10)],
		['cube',		primitives.createCubeWithVertexColorsBufferInfo(gl, 10)],
		['sphere',		primitives.createSphereWithVertexColorsBufferInfo(gl, 5)],
		['prism',		primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 8, 10, 8, 10, 10)],
		['tri-prism',	primitives.createTruncatedRegularTriangularPyramidWithVertexColorsBufferInfo(gl, 10, 10, 10)],
		['pyramid',		primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 0, 0, 10, 10, 10)],
		['tri-pyramid',	primitives.createTruncatedRegularTriangularPyramidWithVertexColorsBufferInfo(gl, 0, 15, 10)],
		['slinder',		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 5, 5, 10)],
		['cone',		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 0, 5, 10)],
	]);
	document.getElementById("objectList").addEventListener("change", () => {
		const objectTypeList = document.getElementsByName("objectType");
		objectTypeList.forEach((currObject) => {
			if (currObject.checked) {
				objectsToDraw[0].bufferInfo = objectBufferInfo.get(currObject.id);
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
		isClipped = true;
		document.getElementById("objectList").style.display = "none";
		document.getElementById("sliderList").style.display = "none";

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
			programInfo: planeProgram,
			bufferInfo: clippingFrontBufferInfo,
			uniforms: frontPlaneUniforms
		}, {
			programInfo: clippedProgram,
			bufferInfo: backObjBufferInfo,
			uniforms: backObjectUniforms
		}, {
			programInfo: planeProgram,
			bufferInfo: clippingBackBufferInfo,
			uniforms: backPlaneUniforms
		}
		];
	});
	document.getElementById("reset").addEventListener("click", () => {
		// location.reload();
		isClipped = false;
		document.getElementById("objectList").style.display = "block";
		document.getElementById("sliderList").style.display = "block";

		objectsToDraw.splice(2, 2);
		objectsToDraw = [{
			programInfo: objectProgram,
			bufferInfo: objectsToDraw[0].bufferInfo,
			uniforms: objectUniforms
		}, {
			programInfo: planeProgram,
			bufferInfo: planeBufferInfo,
			uniforms: planeUniforms
		}
		];
	});

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	const lightPosition = m4.normalize([10, 20, 20]);
	let isClipped = false;

	let objectUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0.2, 1, 0.2, 1],
		u_normalMatrix: null,
		u_lightPosition: null
	};
	let planeUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0, 0, 1, 0.5]
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

	let objectsToDraw = [{
		programInfo: objectProgram,
		bufferInfo: objectBufferInfo.get('default'),
		uniforms: objectUniforms
	}, {
		programInfo: planeProgram,
		bufferInfo: planeBufferInfo,
		uniforms: planeUniforms
	}
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

		// gl.enable(gl.CULL_FACE);
		// gl.frontFace(gl.CW);
		// gl.cullFace(gl.FRONT);
		gl.enable(gl.DEPTH_TEST);

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
		let frontObjRotation	=  [ 0,  time,  0];
		let backObjRotation		=  [ 0,  time,  0];

		if (!isClipped) {
			// 对每个物体计算矩阵
			objectUniforms.u_modelViewProjectionMatrix = 
				computeObjectMatrix(viewProjectionMatrix, objectTranslation, objectRotation);
			objectUniforms.u_normalMatrix = m4.normalFromMat4(computeModelMatrix(objectTranslation, objectRotation));
			objectUniforms.u_lightPosition = lightPosition;

			planeUniforms.u_modelViewProjectionMatrix = 
				computePlaneMatrix(viewProjectionMatrix, objectTranslation, objectRotation, planeTransformMatrix);
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

		if (!isClipped) {
			if (programInfo === objectProgram) {
				gl.depthMask(true);
				gl.disable(gl.BLEND);
			} else if (programInfo === planeProgram) {
				gl.depthMask(false);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			}
		} else {
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}


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
