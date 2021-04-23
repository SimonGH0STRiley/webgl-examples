function augmentedTypedArray(typedArray, numComponents) {
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
    return augmentedTypedArray;
}

function createAugmentedTypedArray (numComponents, numElements, opt_type) {
    const Type = opt_type || Float32Array;
    return augmentedTypedArray(new Type(numComponents * numElements), numComponents);
}