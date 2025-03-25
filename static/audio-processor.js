// @ts-nocheck
/* global AudioWorkletProcessor, registerProcessor */

class OscillatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 440, minValue: 20, maxValue: 20000 },
      { name: 'amplitude', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'attack', defaultValue: 0.1, minValue: 0.001, maxValue: 2.0 },
      { name: 'decay', defaultValue: 0.2, minValue: 0.001, maxValue: 2.0 },
      { name: 'sustain', defaultValue: 0.7, minValue: 0, maxValue: 1.0 },
      { name: 'release', defaultValue: 0.5, minValue: 0.001, maxValue: 5.0 },
      { name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1 },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.envelopeValue = 0;
    this.envelopeState = 'idle'; // idle, attack, decay, sustain, release
    this.releaseStartTime = 0;
    this.gateWasOn = false;
    this.currentTime = 0;
    this.attackStartTime = 0;
    this.decayStartTime = 0;
    this.releaseStartValue = 0;
    this.sampleRate = 44100; // Default, will be updated in process
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0][0];
    const frequency = parameters['frequency'];
    const amplitude = parameters['amplitude'];
    const attack = parameters['attack'][0];
    const decay = parameters['decay'][0];
    const sustain = parameters['sustain'][0];
    const release = parameters['release'][0];
    const gate = parameters['gate'][0];
    
    // Gate transition detection
    const gateIsOn = gate > 0.5;
    if (gateIsOn && !this.gateWasOn) {
      // Note on - start attack phase
      this.envelopeState = 'attack';
      this.attackStartTime = this.currentTime;
    } else if (!gateIsOn && this.gateWasOn) {
      // Note off - start release phase
      this.envelopeState = 'release';
      this.releaseStartTime = this.currentTime;
      this.releaseStartValue = this.envelopeValue;
    }
    this.gateWasOn = gateIsOn;

    for (let i = 0; i < output.length; i++) {
      // Update envelope
      const timeDelta = 1 / this.sampleRate;
      this.currentTime += timeDelta;
      
      // ADSR envelope state machine
      switch (this.envelopeState) {
        case 'idle':
          this.envelopeValue = 0;
          break;
        case 'attack':
          const attackTime = this.currentTime - this.attackStartTime;
          if (attackTime < attack) {
            this.envelopeValue = attackTime / attack;
          } else {
            this.envelopeState = 'decay';
            this.decayStartTime = this.currentTime;
          }
          break;
        case 'decay':
          const decayTime = this.currentTime - this.decayStartTime;
          if (decayTime < decay) {
            this.envelopeValue = 1.0 - (1.0 - sustain) * (decayTime / decay);
          } else {
            this.envelopeState = 'sustain';
          }
          break;
        case 'sustain':
          this.envelopeValue = sustain;
          break;
        case 'release':
          const releaseTime = this.currentTime - this.releaseStartTime;
          if (releaseTime < release) {
            this.envelopeValue = this.releaseStartValue * (1 - releaseTime / release);
          } else {
            this.envelopeValue = 0;
            this.envelopeState = 'idle';
          }
          break;
      }

      // Custom oscillator implementation
      const freq = frequency.length > 1 ? frequency[i] : frequency[0];
      const amp = amplitude.length > 1 ? amplitude[i] : amplitude[0];
      
      // Generate sine wave and apply envelope
      output[i] = amp * this.envelopeValue * Math.sin(this.phase);
      
      // Update phase
      this.phase += (2 * Math.PI * freq) / this.sampleRate;
      if (this.phase >= 2 * Math.PI) this.phase -= 2 * Math.PI;
    }
    return true;
  }
}

registerProcessor('oscillator-processor', OscillatorProcessor);

class KickDrumProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 60, minValue: 20, maxValue: 500 },
      { name: 'attack', defaultValue: 0.001, minValue: 0.001, maxValue: 1.0 },
      { name: 'decay', defaultValue: 0.5, minValue: 0.01, maxValue: 5.0 },
      { name: 'tone', defaultValue: 0.7, minValue: 0.1, maxValue: 1.0 },
      { name: 'impact', defaultValue: 0.8, minValue: 0.1, maxValue: 1.0 },
      { name: 'trigger', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'pitchEnvEnabled', defaultValue: 1, minValue: 0, maxValue: 1 },
      { name: 'pitchEnvAmount', defaultValue: 5, minValue: 1, maxValue: 10 },
      { name: 'pitchEnvDecay', defaultValue: 0.15, minValue: 0.01, maxValue: 1.0 }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastTriggerValue = 0;
    this.triggerTime = 0;
    this.isActive = false;
    this.frequencyEnvValue = 0;
    this.sampleRate = 44100; // Default, will be updated
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    
    // Get parameters
    const baseFreq = parameters.frequency[0];
    const attack = parameters.attack[0];
    const decay = parameters.decay[0];
    const tone = parameters.tone[0];
    const impact = parameters.impact[0];
    const trigger = parameters.trigger[0];
    const pitchEnvEnabled = parameters.pitchEnvEnabled[0];
    const pitchEnvAmount = parameters.pitchEnvAmount[0];
    const pitchEnvDecay = parameters.pitchEnvDecay[0];
    
    // Update sample rate if needed
    this.sampleRate = sampleRate;
    
    // Detect trigger
    if (trigger > 0.5 && this.lastTriggerValue <= 0.5) {
      this.triggerTime = currentTime;
      this.isActive = true;
      this.phase = 0; // Reset phase
    }
    this.lastTriggerValue = trigger;
    
    // Process audio if active
    if (this.isActive) {
      const timeSinceTrigger = currentTime - this.triggerTime;
      
      // Amplitude envelope
      let amplitude = 0;
      if (timeSinceTrigger < attack) {
        // Attack phase - linear ramp up
        amplitude = timeSinceTrigger / attack;
      } else if (timeSinceTrigger < attack + decay) {
        // Decay phase - quadratic curve for more natural decay
        const decayPhase = (timeSinceTrigger - attack) / decay;
        amplitude = 1.0 - (decayPhase * decayPhase);
      } else {
        // End of envelope
        this.isActive = false;
      }
      
      // Frequency envelope (pitch drop for kick drum)
      // Only apply if pitch envelope is enabled
      if (pitchEnvEnabled > 0.5) {
        const freqDecayTime = pitchEnvDecay; // Use the dedicated parameter
        if (timeSinceTrigger < freqDecayTime) {
          // Exponential frequency drop
          const freqEnvPhase = timeSinceTrigger / freqDecayTime;
          this.frequencyEnvValue = Math.exp(-4 * freqEnvPhase);
        } else {
          this.frequencyEnvValue = 0;
        }
      } else {
        // No pitch envelope when disabled
        this.frequencyEnvValue = 0;
      }
      
      // Calculate current frequency with pitch envelope
      let currentFreq = baseFreq;
      if (pitchEnvEnabled > 0.5) {
        // Apply pitch envelope only when enabled
        const startFreq = baseFreq * pitchEnvAmount * impact;
        currentFreq = baseFreq + (startFreq - baseFreq) * this.frequencyEnvValue;
      }
      
      // Generate sine wave
      for (let i = 0; i < channel.length; i++) {
        // Update phase based on current frequency
        const phaseIncrement = currentFreq / this.sampleRate;
        this.phase += phaseIncrement;
        if (this.phase > 1) this.phase -= 1;
        
        // Generate sine wave
        let sample = Math.sin(2 * Math.PI * this.phase);
        
        // Apply tone (distortion)
        if (tone > 0.1) {
          // Simple waveshaping distortion
          const distAmount = tone * 4;
          sample = Math.tanh(sample * distAmount) / Math.tanh(distAmount);
        }
        
        // Apply amplitude envelope
        channel[i] = sample * amplitude;
      }
    } else {
      // Silence when not active
      for (let i = 0; i < channel.length; i++) {
        channel[i] = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('kick-drum-processor', KickDrumProcessor);

class GainProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'gain', defaultValue: 1, minValue: 0, maxValue: 2 }];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    const gain = parameters['gain'];

    if (input) {
      for (let i = 0; i < output.length; i++) {
        const g = gain.length > 1 ? gain[i] : gain[0];
        output[i] = input[i] * g;
      }
    } else {
      output.fill(0);
    }
    return true;
  }
}

registerProcessor('gain-processor', GainProcessor);