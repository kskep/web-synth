// src/lib/audio/KickEngine.js

export class KickEngine {
    /** @type {AudioContext} */
    audioContext;
    /** @type {boolean} */
    isReady = false;
    /** @type {AudioWorkletNode | null} */
    customDistortionNode = null;
    /** @type {boolean} */
    workletsLoaded = false;
    /** @type {Map<string, AudioParam>} */
    _paramMap = new Map();
    /** @type {Set<AudioNode>} */
    activeNodes = new Set();
    /** @type {GainNode | null} */
    masterGain = null;
    /** @type {AudioBuffer | null} */
    _noiseBuffer = null;

    /**
     * @param {AudioContext} audioContext
     */
    constructor(audioContext) {
        if (!audioContext) {
            throw new Error('AudioContext is required!');
        }
        this.audioContext = audioContext;
        this._loadResources();
    }

    /** Get the output node for connecting to other nodes
     * @returns {AudioNode | null}
     */
    get outputNode() {
        return this.masterGain;
    }

    /**
     * Connect the engine's output to a destination
     * @param {AudioNode} destination - The destination node to connect to
     */
    connect(destination) {
        if (this.outputNode && destination instanceof AudioNode) {
            console.log("KickEngine: Connecting output to", destination);
            this.outputNode.connect(destination);
        } else {
            console.error("KickEngine: Cannot connect output.", { output: this.outputNode, dest: destination });
        }
    }

    /**
     * Disconnect the engine's output from a specific destination or all destinations
     * @param {AudioNode} [destination] - Optional specific destination to disconnect from
     */
    disconnect(destination) {
        if (!this.outputNode) return;
        try {
            if (destination instanceof AudioNode) {
                console.log("KickEngine: Disconnecting output from", destination);
                this.outputNode.disconnect(destination);
            } else {
                console.log("KickEngine: Disconnecting output from all.");
                this.outputNode.disconnect();
            }
        } catch (e) {
            console.warn("Error during KickEngine disconnect:", e);
        }
        this.cleanupAllNodes();
    }

    async _loadResources() {
        try {
            await this.audioContext.audioWorklet.addModule('/src/lib/audio/custom-distortion-processor.js');
            console.log('CustomDistortionProcessor loaded.');
            this.workletsLoaded = true;

            this._createBaseGraph();
            this._createCustomNodes();
            this._connectGraph();

            this.isReady = true;
            console.log('KickEngine ready with custom distortion.');
        } catch (e) {
            console.error('Error loading resources for KickEngine:', e);
            this.isReady = false;
        }
    }

    _createBaseGraph() {
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.params.outputGain;
        this._noiseBuffer = this._createNoiseBuffer('white');
    }

    _createCustomNodes() {
        if (!this.workletsLoaded) return;
        
        this.customDistortionNode = new AudioWorkletNode(
            this.audioContext,
            'custom-distortion-processor'
        );

        // Map custom parameters
        const params = this.customDistortionNode.parameters;
        if (!params) return;

        const preGain = params.get('preGain');
        const mix = params.get('mix');
        const algoType = params.get('algoType');
        const character = params.get('character');

        if (preGain) this._paramMap.set('distPreGain', preGain);
        if (mix) this._paramMap.set('distMix', mix);
        if (algoType) this._paramMap.set('distAlgo', algoType);
        if (character) this._paramMap.set('distChar', character);
    }

    _connectGraph() {
        // Internal connections only - do not connect to destination
        // The parent component will handle final output routing
    }

    /**
     * @param {Partial<typeof this.params>} newParams
     */
    updateParams(newParams) {
        if (!this.isReady || !this.masterGain) return;
        
        const t = this.audioContext.currentTime;
        const smoothingTime = 0.01;

        // Update standard parameters
        if (newParams.outputGain !== undefined) {
            this.masterGain.gain.setTargetAtTime(newParams.outputGain, t, smoothingTime);
        }

        // Update custom distortion parameters
        if (newParams.distPreGain !== undefined) {
            const param = this._paramMap.get('distPreGain');
            if (param) param.setTargetAtTime(newParams.distPreGain, t, smoothingTime);
        }
        if (newParams.distMix !== undefined) {
            const param = this._paramMap.get('distMix');
            if (param) param.setTargetAtTime(newParams.distMix, t, smoothingTime);
        }
        if (newParams.distAlgo !== undefined) {
            const param = this._paramMap.get('distAlgo');
            if (param) param.setTargetAtTime(newParams.distAlgo, t, smoothingTime);
        }
        if (newParams.distChar !== undefined) {
            const param = this._paramMap.get('distChar');
            if (param) param.setTargetAtTime(newParams.distChar, t, smoothingTime);
        }

        this.params = { ...this.params, ...newParams };
    }

    /**
     * @param {number} [time]
     */
    trigger(time) {
        if (!this.isReady || !this.customDistortionNode || !this.masterGain || !this._noiseBuffer) {
            console.warn('KickEngine not ready');
            return;
        }

        const t = time !== undefined ? time : this.audioContext.currentTime;
        const p = this.params;
        const ctx = this.audioContext;

        // Create trigger-specific nodes
        const bodyOsc = ctx.createOscillator();
        const bodyAmpEnv = ctx.createGain();
        const clickSource = ctx.createBufferSource();
        const clickLowPass = ctx.createBiquadFilter();
        const clickHighPass = ctx.createBiquadFilter();
        const clickEnv = ctx.createGain();

        // Track nodes for cleanup
        const triggerNodes = [bodyOsc, bodyAmpEnv, clickSource, clickLowPass, clickHighPass, clickEnv];
        triggerNodes.forEach(node => this.activeNodes.add(node));

        // Body signal path
        bodyOsc.connect(bodyAmpEnv);
        bodyAmpEnv.connect(this.customDistortionNode);
        this.customDistortionNode.connect(this.masterGain);

        // Click signal path
        clickSource.connect(clickHighPass);
        clickHighPass.connect(clickLowPass);
        clickLowPass.connect(clickEnv);
        clickEnv.connect(this.masterGain);

        // Configure body oscillator
        /** @type {OscillatorType} */
        const oscType = p.oscType === 'triangle' ? 'triangle' : 'sine';
        bodyOsc.type = oscType;
        bodyOsc.frequency.setValueAtTime(p.tune + p.punch, t);
        bodyOsc.frequency.exponentialRampToValueAtTime(p.tune, t + p.pitchDecay);

        // Configure body envelope
        bodyAmpEnv.gain.setValueAtTime(0, t);
        bodyAmpEnv.gain.linearRampToValueAtTime(1.0, t + 0.005);
        bodyAmpEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);

        // Configure click
        clickSource.buffer = this._noiseBuffer;
        
        clickLowPass.type = 'lowpass';
        clickLowPass.frequency.setValueAtTime(p.clickFilterFreq, t);
        
        clickHighPass.type = 'highpass';
        clickHighPass.frequency.setValueAtTime(p.clickHighPassFreq, t);

        clickEnv.gain.setValueAtTime(0, t);
        clickEnv.gain.linearRampToValueAtTime(p.clickLevel, t + 0.001);
        clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.clickDecay);

        // Start and stop nodes
        bodyOsc.start(t);
        bodyOsc.stop(t + p.decay + 0.1);
        clickSource.start(t);
        clickSource.stop(t + p.clickDecay + 0.05);

        // Cleanup on completion
        bodyOsc.onended = () => {
            triggerNodes.forEach(node => {
                try {
                    node.disconnect();
                    this.activeNodes.delete(node);
                } catch (e) {
                    console.warn('Error cleaning up node:', e);
                }
            });
        };

        // Safety cleanup after max duration
        setTimeout(() => {
            triggerNodes.forEach(node => {
                if (this.activeNodes.has(node)) {
                    try {
                        node.disconnect();
                        this.activeNodes.delete(node);
                    } catch (e) {}
                }
            });
        }, (p.decay + 1) * 1000);
    }

    cleanupAllNodes() {
        this.activeNodes.forEach(node => {
            try {
                node.disconnect();
            } catch (e) {}
        });
        this.activeNodes.clear();
    }

    /**
     * Creates a buffer filled with noise of specified type.
     * @param {'white'|'pink'} type - Type of noise to generate
     * @param {number} [seconds] - Duration of noise buffer
     * @returns {AudioBuffer} The generated noise buffer
     */
    _createNoiseBuffer(type = 'white', seconds = 0.5) {
        const bufferSize = this.audioContext.sampleRate * seconds;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            // Pink noise generation using Voss algorithm
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, b7 = 0;
            for (let i = 0; i < bufferSize; i++) {
                // White noise
                const white = Math.random() * 2 - 1;
                
                // Pink noise approximation
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + b7) * 0.11;
                output[i] = pink * 2; // Normalize
            }
        }
        return buffer;
    }

    // Default parameters
    params = {
        // Main
        tune: 50,
        decay: 0.5,
        punch: 150,
        pitchDecay: 0.05,
        // Click
        clickLevel: 0.8,
        clickDecay: 0.02,
        clickFilterFreq: 3000,
        clickHighPassFreq: 100,
        /** @type {'white'|'pink'} */
        clickNoiseType: 'white',
        // Oscillator
        /** @type {'sine'|'triangle'} */
        oscType: 'sine',
        // Distortion
        distPreGain: 1.0,
        distMix: 1.0,
        distAlgo: 0,
        distChar: 0.5,
        // Output
        outputGain: 0.7
    };
}