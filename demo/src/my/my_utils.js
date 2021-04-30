function augmentTypedArray(typedArray, numComponents) {
	let pointer = 0;
	typedArray.push = function() {
		for (let i = 0; i < arguments.length; i++) {
			const value = arguments[i];
			if (value instanceof Array || (value.buffer && value.buffer instanceof ArrayBuffer)) {
				for (let j = 0; j < arguments.length; j++) {
					typedArray[pointer++] = value[j];
				}
			} else {
				typedArray[pointer++] = value;
			}
		}
	}
	typedArray.reset = function(opt_index) {
		pointer = opt_index || 0;
	}
	typedArray.numComponents = numComponents;
	Object.defineProperty(typedArray, 'numElements', {
		get: function() {
			return this.length / this.numComponents | 0;
		}
	});
	return typedArray;
}

function createAugmentedTypedArray (numComponents, numElements, opt_type) {
	const Type = opt_type || Float32Array;
	return augmentTypedArray(new Type(numComponents * numElements), numComponents);
}

function makeTypedArray(array, name) {
	if (isArrayBuffer(array)) {
		return array;
	}

	if (array.data && isArrayBuffer(array.data)) {
		return array.data;
	}

	if (Array.isArray(array)) {
		array = {
			data: array,
		};
	}

	if (!array.numComponents) {
		array.numComponents = guessNumComponentsFromName(name, array.length);
	}

	let type = array.type;
	if (!type) {
		if (name === 'indices') {
			type = Uint16Array;
		}
	}
	const typedArray = createAugmentedTypedArray(array.numComponents, array.data.length / array.numComponents | 0, type);
	typedArray.push(array.data);
	return typedArray;
  }

function createBufferFromTypedArray (gl, array, opt_type, opt_drawType) {
	const type = opt_type || gl.ARRAY_BUFFER;
	const drawType = opt_drawType || gl.STATIC_DRAW;
	const buffer = gl.createBuffer();
	gl.bindBuffer(type, buffer);
	gl.bufferData(type, array, drawType);
	return buffer;
}

function createMapping (obj) {
	function allButIndices(name) {
		return name !== 'indices';
	}
	const mapping = {};
	Object.keys(obj).filter(allButIndices).forEach(function(key) {
		mapping['a_' + key] = key;
	})
	return mapping;
}

// function createAttribsFromArrays (gl, arrays, opt_mapping) {
// 	const mapping = opt_mapping | createMapping(arrays);
// 	const attribs = {};
// 	Object.keys(mapping).forEach(function(attribName) {
// 		const bufferName = mapping[attribName];
// 		const originArray = arrays[bufferName];
// 		if (originArray.value) {
// 			attribs[attribName] = {
// 				value: originArray.value
// 			};
// 		} else {
// 			const array = makeTypedArray(originArray, bufferName);
// 			attribs[attribName] = {
// 				buffer:		createBufferF
// 			}
// 		}
// 	})
// }

// function createBufferInfoFromArrays (gl, arrays, opt_mapping) {
// 	const bufferInfo = {
// 		attribs: createAttri
// 	}
// }

return {
	createAugmentedTypedArray:createAugmentedTypedArray,
}