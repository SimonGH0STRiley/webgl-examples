"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	ui.setupSlider("#translate-x",	{
		slide:	updateClippingTransformMatrix('translateX'),
		value:	0,
		min:	-5,
		max:	5,
		step:	0.1,
		precision: 1
	});
	ui.setupSlider("#translate-y",	{
		slide:	updateClippingTransformMatrix('translateY'),
		value:	0,
		min:	-5,
		max:	5,
		step:	0.1,
		precision: 1
	});
	ui.setupSlider("#translate-z",	{
		slide:	updateClippingTransformMatrix('translateZ'),
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
	ui.setupSlider("#rotate-z", {
		slide: updateClippingTransformMatrix('rotateZ'),
		value: 0,
		min: 0,
		max: 90
	}); 

	// Vertex shader program 顶点着色器
	const vsSource = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
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

	const objectProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);
	const planeProgram	= webglUtils.createProgramInfo(gl, [vsSource, fsSource]);

	const objectBufferInfo	= primitives.createCubeWithVertexColorsBufferInfo(gl, 10);
	// objectBufferInfo.useStencil		= true;
	// objectBufferInfo.stencilClear	= true;
	// objectBufferInfo.stencilWrite	= true;
	// objectBufferInfo.stencilFrontOp	= [gl.KEEP, gl.KEEP, gl.DECR];
	// objectBufferInfo.stencilBackOp	= [gl.KEEP, gl.KEEP, gl.INCR];
	// objectBufferInfo.stencilFunc	= [gl.ALWAYS, 1, 0xFF];
	
	let planeTransformMatrix = m4.identity();
	let recentTranslate = [0, 0, 0, 0];
	let recentRotate = [0, 0];

	let planeBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 30, 30, 1, 1, planeTransformMatrix);
	// planeBufferInfo.useStencil	= true;
	// planeBufferInfo.stencilOp	= [gl.KEEP, gl.KEEP, gl.KEEP];
	// planeBufferInfo.stencilFunc	= [gl.EQUAL, 1, 0xFF];

	function updateClippingTransformMatrix(method) {
		return function (event, ui) {
			if (method === 'translateX') {
				planeTransformMatrix = m4.translate(planeTransformMatrix, ui.value - recentTranslate[0], 0, 0);
				recentTranslate[0] = ui.value;
			} else if (method === 'translateY') {
				planeTransformMatrix = m4.translate(planeTransformMatrix, 0, ui.value - recentTranslate[1], 0);
				recentTranslate[1] = ui.value;
			} else if (method === 'translateZ') {
				planeTransformMatrix = m4.translate(planeTransformMatrix, 0, 0, ui.value - recentTranslate[2]);
				recentTranslate[2] = ui.value;
			} else if (method === 'rotateX') {
				planeTransformMatrix = m4.xRotate(planeTransformMatrix, degToRad(ui.value - recentRotate[0]));
				recentRotate[0] = ui.value;
			} else if (method === 'rotateZ') {
				planeTransformMatrix = m4.zRotate(planeTransformMatrix, degToRad(ui.value - recentRotate[1]));
				recentRotate[1] = ui.value;
			}
		}
	}

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	let cameraAngleRadians = degToRad(0);
	let fieldOfViewRadians = degToRad(60);
	let cameraHeight = 50;

	let objectUniforms = {
		u_colorMult: [0.5, 1, 0.5, 1]
	};
	let planeUniforms = {
		u_colorMult: [0, 0, 1, 0.4]
	};

	let objectTranslation 	= [  0,  0,  0];

	let objectsToDraw = [{
		programInfo: objectProgram,
		bufferInfo: objectBufferInfo,
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
		let cameraPosition = [20, 20, 50];
		let target = [0, 0, 0];
		let up = [0, 1, 0];
		let cameraMatrix = m4.lookAt(cameraPosition, target, up);
		let viewMatrix = m4.inverse(cameraMatrix);
		let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

		let objectRotation	=  [ 0,  0,  0];

		// 对每个物体计算矩阵
		objectUniforms.u_modelViewProjectionMatrix = 
			computeObjectMatrix(viewProjectionMatrix, objectTranslation, objectRotation);

		planeUniforms.mM = m4.identity();
		// planeUniforms.mM = m4.multiply(m4.identity(), planeTransformMatrix);
		planeUniforms.vM = viewMatrix;
		// planeUniforms.vM = m4.multiply(viewMatrix, planeTransformMatrix);
		planeUniforms.pM = projectionMatrix;	
		// planeUniforms.pvM = m4.multiply(planeUniforms.pM, planeUniforms.vM);
		planeUniforms.pvM = m4.multiply(planeUniforms.pM, planeUniforms.vM);
		planeUniforms.u_modelViewProjectionMatrix = m4.multiply(planeUniforms.pvM, planeUniforms.mM);
		planeUniforms.u_modelViewProjectionMatrix = m4.multiply(planeTransformMatrix, planeUniforms.u_modelViewProjectionMatrix)
		// planeUniforms.u_modelViewProjectionMatrix = 
		// computePlaneMatrix(viewProjectionMatrix, objectTranslation, objectRotation, planeTransformMatrix);

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

		if (programInfo === objectProgram) {
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		} else if (programInfo === planeProgram) {
			gl.depthMask(false);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		}

		// // Stencil 相关
		// if (bufferInfo.useStencil) {
		// 	gl.enable(gl.STENCIL_TEST);
		// } else {
		// 	gl.disable(gl.STENCIL_TEST);
		// }
		// if (bufferInfo.stencilClear) {
		// 	gl.stencilMask(0xFF);
		// 	gl.clear(gl.STENCIL_BUFFER_BIT);
		// }
		// if (bufferInfo.stencilWrite) {
		// 	gl.stencilMask(0xFF);
		// } else {
		// 	gl.stencilMask(0);
		// }
		// if (bufferInfo.stencilOp) {
		// 	gl.stencilOp(bufferInfo.stencilOp[0], bufferInfo.stencilOp[1], bufferInfo.stencilOp[2]);
		// }
		// if (bufferInfo.stencilFrontOp) {
		// 	gl.stencilOpSeparate(gl.FRONT, bufferInfo.stencilFrontOp[0], bufferInfo.stencilFrontOp[1], bufferInfo.stencilFrontOp[2]);
		// }
		// if (bufferInfo.stencilBackOp) {
		// 	gl.stencilOpSeparate(gl.BACK, bufferInfo.stencilBackOp[0], bufferInfo.stencilBackOp[1], bufferInfo.stencilBackOp[2]);
		// }
		// if (bufferInfo.stencilFunc) {
		// 	gl.stencilFunc(bufferInfo.stencilFunc[0], bufferInfo.stencilFunc[1], bufferInfo.stencilFunc[2])
		// }
		// 绘制3D图形
		gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
		});

		requestAnimationFrame(drawScene);
	}
}

main();
