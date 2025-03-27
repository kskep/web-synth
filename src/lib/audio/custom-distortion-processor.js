/// <reference lib="dom" />
/// <reference lib="webworker" />

class CustomDistortionProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'preGain', defaultValue: 1.0, minValue: 0.0, maxValue: 10.0 }, // Input gain
            { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }, // Dry/Wet mix
            { name: 'algoType', defaultValue: 0, minValue: 0, maxValue: 2 }, // 0: Soft Clip, 1: Hard Clip, 2: Foldback
            { name: 'character', defaultValue: 0.5, minValue: 0.01, maxValue: 5.0 } // Algorithm-specific control
        ];
    }

    /**
     * Apply distortion to a sample
     * @param {number} sample - Input sample
     * @param {number} type - Distortion type (0: Soft Clip, 1: Hard Clip, 2: Foldback)
     * @param {number} character - Character parameter
     * @returns {number} - Processed sample
     */
    _distort(sample, type, character) {
        switch (Math.round(type)) {
            case 0: // Soft Clipping (tanh)
                return Math.tanh(sample * character);
            case 1: // Hard Clipping
                const threshold = 1.0 / Math.max(0.1, character);
                return Math.max(-threshold, Math.min(threshold, sample));
            case 2: // Foldback Distortion
                const foldThreshold = 1.0;
                if (sample > foldThreshold || sample < -foldThreshold) {
                    sample = Math.abs(Math.abs(sample) - foldThreshold * 2 * character) - foldThreshold;
                }
                return sample;
            default:
                return sample;
        }
    }

    /**
     * Process audio
     * @param {Float32Array[][]} inputs - Input audio buffers
     * @param {Float32Array[][]} outputs - Output audio buffers
     * @param {Record<string, Float32Array>} parameters - Audio parameters
     * @returns {boolean} - Keep processor alive
     */
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const inputChannel = input[0];
        const outputChannel = output[0];
        const blockSize = inputChannel?.length ?? outputs[0]?.[0]?.length ?? 128;

        // Get parameter values
        const preGain = parameters.preGain;
        const mix = parameters.mix;
        const algoType = parameters.algoType;
        const character = parameters.character;

        for (let i = 0; i < blockSize; ++i) {
            const currentPreGain = preGain.length > 1 ? preGain[i] : preGain[0];
            const currentMix = mix.length > 1 ? mix[i] : mix[0];
            const currentAlgoType = algoType.length > 1 ? algoType[i] : algoType[0];
            const currentChar = character.length > 1 ? character[i] : character[0];

            const drySample = inputChannel ? inputChannel[i] : 0;
            const gainedSample = drySample * currentPreGain;
            const wetSample = this._distort(gainedSample, currentAlgoType, currentChar);
            const mixedSample = drySample * (1.0 - currentMix) + wetSample * currentMix;

            outputChannel[i] = Math.max(-1.0, Math.min(1.0, mixedSample));
        }

        return true;
    }
}

// @ts-ignore
registerProcessor('custom-distortion-processor', CustomDistortionProcessor);
