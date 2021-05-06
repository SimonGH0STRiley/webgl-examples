function createPlaneVertices(
	opt_width,
	opt_depth,
	opt_widthDivides,
	opt_depthDivides,) {
	//参数定义
	const width = opt_width || 2;
	const depth = opt_depth || 2;
	const widthDivides = opt_widthDivides || 1;
	const depthDivides = opt_depthDivides || 1;
	const numVertices = (widthDivides + 1) * (depthDivides + 1);
	
	const positions = utils.createAugmentedTypedArray(3, numVertices);
	const normals 	= utils.createAugmentedTypedArray(3, numVertices);
	const texCoords = utils.createAugmentedTypedArray(2, numVertices);
	const indices	= utils.createAugmentedTypedArray(3, widthDivides * depthDivides * 2, Uint16Array);

	for (let i = 0; i < depthDivides; i++) {
		for (let j = 0; j < widthDivides; j++) {
			const u = j / widthDivides;
			const v = i / depthDivides;
			positions.push(
				width * u - width * 0.5,
				0,
				depth * v - depth * 0.5
			);
			normals.push(0, 1, 0);
			texCoords.push(u, v);
			indices.push(
				(i + 0) * (widthDivides + 1) + j,
				(i + 0) * (widthDivides + 1) + j,
				(i + 1) * (widthDivides + 1) + j + 1
			);
			indices.push(
				(i + 1) * (widthDivides + 1) + j,
				(i + 0) * (widthDivides + 1) + j + 1,
				(i + 1) * (widthDivides + 1) + j + 1
			);
		}
	}

	return {
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices,
	}
}

function createXYQuadVertices(
	opt_size,
	opt_xOffset,
	opt_yOffset) {
	const size = opt_size || 2;
	const xOffset = opt_xOffset || 0;
	const yOffset = opt_yOffset || 0;
	size *= 0.5;
	return {
		position: {
			numComponents: 2,
			data: [
				xOffset + -1 * size, yOffset + -1 * size,
				xOffset +  1 * size, yOffset + -1 * size,
				xOffset + -1 * size, yOffset +  1 * size,
				xOffset +  1 * size, yOffset +  1 * size
			]
		},
		nromal: [
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1
		],
		texcoord: [
			0, 0,
			1, 0,
			0, 1,
			1, 1
		],
		indices: [0, 1, 2, 2, 1, 3]
	}
}

function createCubeVertices(size) {
	const k = size / 2;
	const cornerVertices = [
		[-k, -k, -k],
		[+k, -k, -k],
		[-k, +k, -k],
		[+k, +k, -k],
		[-k, -k, +k],
		[+k, -k, +k],
		[-k, +k, +k],
		[+k, +k, +k],
	];
	// 法向量
	const faceNormals = [
		[+1, +0, +0],	// right
		[-1, +0, +0],	// left
		[+0, +1, +0],	// top
		[+0, -1, +0],	// bottom
		[+0, +0, +1],	// front
		[+0, +0, -1],	// back
	];

	const uvCoords = [
		[1, 0],
		[0, 0],
		[0, 1],
		[1, 1],
	];

	const CUBE_FACE_INDICES = [
		[3, 7, 5, 1], // right
		[6, 2, 0, 4], // left
		[6, 7, 3, 2], // ??
		[0, 1, 5, 4], // ??
		[7, 6, 4, 5], // front
		[2, 3, 1, 0], // back
	  ];
  
	const numVertices = 6 * 4;
	const positions = utils.createAugmentedTypedArray(3, numVertices);
	const normals   = utils.createAugmentedTypedArray(3, numVertices);
	const texCoords = utils.createAugmentedTypedArray(2 , numVertices);
	const indices   = utils.createAugmentedTypedArray(3, 6 * 2, Uint16Array);
  
	for (let f = 0; f < 6; ++f) {
		const faceIndices = CUBE_FACE_INDICES[f];
		for (let v = 0; v < 4; ++v) {
			const position = cornerVertices[faceIndices[v]];
			const normal = faceNormals[f];
			const uv = uvCoords[v];
			// Each face needs all four vertices because the normals and texture
			// coordinates are not all the same.
			positions.push(position);
			normals.push(normal);
			texCoords.push(uv);
		}
		// Two triangles make a square face.
		const offset = 4 * f;
		indices.push(offset + 0, offset + 1, offset + 2);
		indices.push(offset + 0, offset + 2, offset + 3);
	}
	
	return {
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices,
	}
}

function createSphereVertices(
	radius,
	opt_warpDivides,
	opt_weftDivides,
	opt_startLatitude,
	opt_endLatitude,
	opt_startLongitude,
	opt_endLongitude) {
	// 参数定义
	const warpDivides = opt_warpDivides || 60;		// 经线分割数
	const weftDivides = opt_weftDivides || 30;		// 纬线分割数
	const startLatitude = opt_startLatitude || 0;
	const endLatitude = opt_endLatitude || Math.PI;
	const startLongitude = opt_startLongitude || 0;
	const endLongitude = opt_endLongitude || Math.PI;
	const latitudeRange = endLatitude - startLatitude;
	const longitutdeRange = endLongitude - startLongitude;
	const numVertices = (warpDivides + 1) * (weftDivides + 1);
	
	const positions = utils.createAugmentedTypedArray(3, numVertices);
	const normals   = utils.createAugmentedTypedArray(3, numVertices);
	const texCoords = utils.createAugmentedTypedArray(2, numVertices);
	const indices   = utils.createAugmentedTypedArray(3, warpDivides * weftDivides * 2, Uint16Array);
  
	for (let i = 0; i <= weftDivides; i++) {
		for (let j = 0; j <= warpDivides; j++) {
			const u = i / weftDivides;
			const v = j / warpDivides;
			const phi = latitudeRange * u + startLatitude;
			const theta = longitutdeRange * v + startLongitude;
			const sinPhi = Math.sin(phi);
			const cosPhi = Math.cos(phi);
			const sinTheta = Math.sin(theta);
			const cosTheta = Math.cos(theta);
			const unitX = cosTheta * sinPhi;
			const unitY = cosPhi;
			const unitZ = sinTheta * sinPhi;
			positions.push(radius * unitX, radius * unitY, radius * unitZ);
			normals.push(unitX, unitY, unitZ);
			texCoords.push(1 - v, u);
		}
	}

	for (let i = 0; i < warpDivides; i++) {
		for (let j = 0; j < weftDivides; j++) {
			indices.push(
				(j + 0) * (warpDivides + 1) + i,
				(j + 0) * (warpDivides + 1) + i + 1,
				(j + 1) * (warpDivides + 1) + i
			);
			indices.push(
				(j + 1) * (warpDivides + 1) + i,
				(j + 0) * (warpDivides + 1) + i + 1,
				(j + 1) * (warpDivides + 1) + i + 1
			);
		}
	}
	
	console.log('vertex: ', positions.length / 3);
	console.log('normals: ', normals.length / 3)
	console.log('texture coordiantes: ', texCoords.length / 2);
	console.log('indices: ', indices.length / 3);
	console.log(warpDivides * weftDivides * 2);

	return {
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices,
	}
}

function createTruncatedPyramidVertices(
	topLength,
	topWidth,
	bottomLength,
	bottomWidth,
	height) {
	const topX = topLength / 2;
	const topZ = topWidth / 2;
	const bottomX = bottomLength / 2;
	const bottomZ = bottomWidth / 2;
	const heightY = height / 2;
	const slantXY = Math.atan2(bottomX - topX, height);
	const sinSlantXY = Math.sin(slantXY);
	const cosSlantXY = Math.cos(slantXY);
	const slantYZ = Math.atan2(bottomZ - topZ, height);
	const sinSlantYZ = Math.sin(slantYZ);
	const cosSlantYZ = Math.cos(slantYZ);

	const cornerVertices = [
		[-bottomX,	-heightY,	-bottomZ],
		[+bottomX,	-heightY,	-bottomZ],
		[-topX,		+heightY,	-topZ],
		[+topX,		+heightY,	-topZ],
		[-bottomX,	-heightY,	+bottomZ],
		[+bottomX,	-heightY,	+bottomZ],
		[-topX,		+heightY,	+topZ],
		[+topX,		+heightY,	+topZ],
	];

	const faceNormals = [
		[+cosSlantXY, +sinSlantXY, +0],	// right
		[-cosSlantXY, +sinSlantXY, +0],	// left
		[+0, +1, +0],					// top
		[+0, -1, +0],					// bottom
		[+0, +sinSlantYZ, +cosSlantYZ],	// front
		[+0, +sinSlantYZ, -cosSlantYZ],	// back
	];

	const uvCoords = [
		[1, 0],
		[0, 0],
		[0, 1],
		[1, 1]
	];

	const PYRAMID_FACE_INDICES = [
		// The order of indices are in counter clockwise, such that
		// the directions of faces are all towards outside.
		[3, 7, 5, 1], // right
		[6, 2, 0, 4], // left
		[6, 7, 3, 2], // top
		[0, 1, 5, 4], // bottom
		[7, 6, 4, 5], // front
		[2, 3, 1, 0], // back
	  ];

	const numVertices = 6 * 4;
	const positions = utils.createAugmentedTypedArray(3, numVertices);
	const normals   = utils.createAugmentedTypedArray(3, numVertices);
	const texCoords = utils.createAugmentedTypedArray(2 , numVertices);
	const indices   = utils.createAugmentedTypedArray(3, 6 * 2, Uint16Array);

	for (let i = 0; i < 6; i++) {
		const faceIndices = PYRAMID_FACE_INDICES[i];
		for (let j = 0; j < 4; j++) {
			const position = cornerVertices[faceIndices[j]];
			const normal = faceNormals[i];
			const uv = uvCoords[j];
			positions.push(position);
			normals.push(normal);
			texCoords.push(uv)
		}
		const offset = 4 * i;
		indices.push(offset + 0, offset + 1, offset + 2);
		indices.push(offset + 0, offset + 2, offset + 3);
	}

	return{
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices
	}
}

function createTruncatedConeVertices(
	topRadius,
	bottomRadius,
	height,
	opt_radialDivides,
	opt_verticalDivides,
	opt_topCap,
	opt_bottomCap) {
	const radialDivides = (opt_radialDivides < 3) ? 60 : opt_radialDivides;
	const verticalDivides = (opt_verticalDivides < 1) ? 1 : opt_verticalDivides;
	const topCap = (opt_topCap === undefined) ? true : opt_topCap;
	const bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;
	const extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);
	const numVertices = (radialDivides + 1) * (verticalDivides + 1 + extra);

	const positions = utils.createAugmentedTypedArray(3, numVertices);
	const normals   = utils.createAugmentedTypedArray(3, numVertices);
	const texCoords = utils.createAugmentedTypedArray(2, numVertices);
	const indices   = utils.createAugmentedTypedArray(3, warpDivides * weftDivides * 2, Uint16Array);

	const start = topCap ? -2 : 0;
	const end = (bottomCap ? 2 : 0) + verticalDivides; 
	const slant = Math.atan2(bottomRadius - topRadius, height);
	const sinSlant = Math.sin(slant);
	const conSlant = Math.cos(slant);
	for (let i = start; i <= end; i++) {
		let u = i / verticalDivides;
		let v = height * u;
		let ringRadius;
		if (i < 0) {
			u = 1;
			v = 0;
			ringRadius = bottomRadius;
		} else if (i > verticalDivides) {
			u = 1;
			v = height;
			ringRadius = topRadius;
		} else {
			ringRadius = bottomRadius + (topRadius - bottomRadius) * (i / verticalDivides);
		}
		if (i === -2 || i == 2 + verticalDivides) {
			u = 0;
			ringRadius = 0;
		}
		y -= height / 2
		for (let j = 0 ; j < radialDivides + 1; j ++) {
			const theta = j * Math.PI * 2 / radialDivides
			const sinTheta = Math.sin(theta);
			const cosTheta = Math.cos(theta);
			positions.push(sinTheta * ringRadius, v, cosTheta * ringRadius);
			normal.push(
				(i < 0 || i > verticalDivides) ? 0 : (sinTheta * cosSlant),
				(i < 0) ? -1 : (i > verticalDivides ? 1 : sinSlant),
				(i < 0 || i > verticalDivides) ? 0 : (cosTheta * cosSlant)
			);
			texCoords.push(j / radialDivides, 1 - u);
		}
	}

	for (let i = 0; i < verticalDivides + extra; i++) {
		for (let j = 0; i < radialDivides; j++) {
			indices.push(
				(radialDivides + 1) * (i + 0) + i + 0,
				(radialDivides + 1) * (i + 0) + i + 1,
				(radialDivides + 1) * (i + 1) + i + 1
			);
			indices.push(
				(radialDivides + 1) * (i + 0) + i + 0,
				(radialDivides + 1) * (i + 1) + i + 1,
				(radialDivides + 1) * (i + 1) + i + 0
			);
		}
	}

	return {
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices,
	}
}

function deindexVertices(vertices) {
	const indices = vertices.indices;
	const newVertices = {};
	const numElements = indices.length;

	function allButIndices(name) {
		return name !== 'indices';
	}

	function expandToUnindexed(channel) {
		const srcBuffer = vertices[channel];
		const numComponents = srcBuffer.numComponents;
		const dstBuffer = utils.createAugmentedTypedArray(numComponents, numElements, srcBuffer.constructor);
		for (let i = 0; i < numElements; i++) {
			const ndx = indices[i];
			const offset = ndx * numComponents;
			for (let j = 0; j < numComponents; j++) {
				dstBuffer.push(srcBuffer[offset + j]);
			}
		}
		newVertices[channel] = dstBuffer;
	}

	Object.keys(vertices).filter(allButIndices).forEach(expandToUnindexed);

	return newVertices;
}

function makeRandomVertexColors(vertices, options) {
	options = options || {};
	const numElements = vertices.position.numElements;
	const vcolors = utils.createAugmentedTypedArray(4, numElements, Uint8Array);
	const rand = options.rand || function(ndx, channel) {
		return channel < 3 ? randInt(256) : 255;
	};
	vertices.color = vcolors;
	if (vertices.indices) {
		for (let i = 0; i < numElements; i++) {
			vcolors.push(rand(i, 0), rand(i, 1), rand(i, 2), rand(i, 3));
		}
	} else {
		const numVertsPerColor = options.vertsPerColor || 3;
		const numSets = numElements / numVertsPerColor;
		for (let i = 0; i < numSets; i++) {
			const color = [rand(i, 0), rand(i, 1), rand(i, 2), rand(i, 3)];
		for (let j = 0; j < numVertsPerColor; j++) {
			vcolors.push(color);
		}
		}
	}
    return vertices;
  }

// function createFlattenedFunc (verticesFunction) {
// 	return function(gl, ...args) {
// 		let vertices = verticesFunction(...args);
// 		vertices = deindexVertices(vertices);
// 		vertices = makeRandomVertexColors(vertices, {
// 			verticesPerColor: 6,
// 			rand: function (ndx, channel) {
// 				return channel < 3 ? ((128 + Math.random() * 128) | 0) : 255;
// 			}
// 		});
// 		return utils.createBuf
// 	};
// }



return {
	createPlaneVertices,
	createXYQuadVertice,
	createCubeVertices,
	createSphereVertices,
	createTruncatedPyramidVertices,
	createTruncatedConeVertices,
}