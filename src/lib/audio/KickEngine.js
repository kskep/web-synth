// src/lib/audio/KickEngine.js

export class KickEngine {
    /**
     * @param {AudioContext} audioContext
     */
    constructor(audioContext) {
      if (!audioContext) {
        throw new Error('AudioContext is required!');
      }
      this.audioContext = audioContext;
  
      // --- Default Parameters (Inspired by V8 Kick & 808) ---
      this.params = {
        tune: 50,         // Base frequency Hz (maps to pitchEnd)
        decay: 0.5,       // Amplitude decay Seconds
        punch: 150,       // Pitch sweep amount Hz (pitchStart = tune + punch)
        pitchDecay: 0.05, // Pitch sweep time Seconds (faster than before)
        drive: 40,        // Saturation amount
        clickLevel: 0.8,  // Click mix level (0-1)
        clickDecay: 0.02, // Very short decay for the click envelope Secs
        clickFilterFreq: 3000, // Frequency for click's low-pass filter Hz
        outputGain: 0.7   // Final output gain (0-1)
      };
  
      // --- Master Output Gain ---
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.params.outputGain;
      this.masterGain.connect(this.audioContext.destination);
  
      // --- Noise Buffer (for Click) ---
      this._noiseBuffer = this._createWhiteNoiseBuffer(0.5); // 0.5s is enough
  
      // --- WaveShaper Curve (for Body Tone) ---
      this._waveShaperCurve = this._createDistortionCurve(this.params.drive);
    }
  
    /** Creates a buffer filled with white noise. */
    _createWhiteNoiseBuffer(seconds = 0.5) {
      const bufferSize = this.audioContext.sampleRate * seconds;
      // Use createBuffer for better compatibility
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          // Generate random numbers between -1 and 1
          output[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }
  
    /** Creates a distortion curve for the WaveShaperNode. */
    _createDistortionCurve(amount) {
      const k = typeof amount === 'number' ? amount : 50;
      const numSamples = 44100;
      const curve = new Float32Array(numSamples);
      const deg = Math.PI / 180;
      let x;
      // Simple tanh-like curve, adjust multiplier (e.g., 20) and k for different flavors
      for (let i = 0; i < numSamples; ++i) {
        x = (i * 2) / numSamples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      // Basic normalization (optional, adjust gain later if needed)
      const max = Math.max(...curve.map(Math.abs));
      if (max > 0) {
           for (let i = 0; i < numSamples; ++i) { curve[i] /= max; }
      }
      return curve;
    }
  
    /**
     * Update parameters.
     * @param {Partial<typeof this.params>} newParams
     */
    updateParams(newParams) {
       const needsCurveUpdate = newParams.drive !== undefined && newParams.drive !== this.params.drive;
       this.params = { ...this.params, ...newParams };
  
       this.masterGain.gain.setTargetAtTime(
         this.params.outputGain,
         this.audioContext.currentTime,
         0.01
       );
  
       if (needsCurveUpdate) {
          this._waveShaperCurve = this._createDistortionCurve(this.params.drive);
       }
    }
  
    /**
     * Trigger the kick sound.
     * @param {number} [time] - Optional: Schedule time (defaults to now)
     */
    trigger(time) {
      const t = time !== undefined ? time : this.audioContext.currentTime;
      const p = this.params; // Shorthand
  
      // === NODES ===
      // --- Body Tone ---
      const bodyOsc = this.audioContext.createOscillator();
      const bodyAmpEnv = this.audioContext.createGain();
      const bodyWaveShaper = this.audioContext.createWaveShaper();
      const bodyGain = this.audioContext.createGain(); // Gain control for body before mixing
  
      // --- Click ---
      const clickSource = this.audioContext.createBufferSource();
      const clickFilter = this.audioContext.createBiquadFilter();
      const clickEnv = this.audioContext.createGain();
  
      // === CONNECTIONS ===
      // Body: Osc -> Amp Env -> WaveShaper -> Body Gain -> Master Gain
      bodyOsc.connect(bodyAmpEnv);
      bodyAmpEnv.connect(bodyWaveShaper);
      bodyWaveShaper.connect(bodyGain);
      bodyGain.connect(this.masterGain);
  
      // Click: Noise Buffer Source -> Filter -> Click Env (Gain) -> Master Gain
      clickSource.connect(clickFilter);
      clickFilter.connect(clickEnv);
      clickEnv.connect(this.masterGain);
  
      // === CONFIG & SCHEDULING ===
  
      // --- Body Tone ---
      bodyOsc.type = 'sine'; // Or 'triangle' for a slightly different 808 flavor
      bodyWaveShaper.curve = this._waveShaperCurve;
      bodyWaveShaper.oversample = '4x';
      bodyGain.gain.value = 1.0; // Start with full body volume relative to click
  
      // Pitch Envelope (Body)
      const startFreq = p.tune + p.punch;
      const endFreq = p.tune;
      bodyOsc.frequency.setValueAtTime(startFreq, t);
      bodyOsc.frequency.exponentialRampToValueAtTime(endFreq, t + p.pitchDecay);
  
      // Amplitude Envelope (Body)
      bodyAmpEnv.gain.setValueAtTime(0, t);
      bodyAmpEnv.gain.linearRampToValueAtTime(1.0, t + 0.005); // Very fast attack
      bodyAmpEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
  
      bodyOsc.start(t);
      bodyOsc.stop(t + p.decay + 0.1); // Stop after decay finishes
  
      // --- Click ---
      clickSource.buffer = this._noiseBuffer;
      clickSource.loop = true; // Loop noise buffer in case duration is very short
  
      clickFilter.type = 'lowpass'; // Filter the noise
      clickFilter.frequency.setValueAtTime(p.clickFilterFreq, t);
      clickFilter.Q.setValueAtTime(1, t); // Moderate Q
  
      // Click Envelope (Gain) - VERY short
      clickEnv.gain.setValueAtTime(0, t);
      clickEnv.gain.linearRampToValueAtTime(p.clickLevel, t + 0.002); // Extremely fast attack
      clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.clickDecay);
  
      clickSource.start(t);
      // Stop the noise source shortly after its envelope closes
      clickSource.stop(t + p.clickDecay + 0.05);
  
      // --- Auto Cleanup ---
      const cleanup = () => {
          try { bodyOsc.disconnect(); } catch (e) {}
          try { bodyAmpEnv.disconnect(); } catch (e) {}
          try { bodyWaveShaper.disconnect(); } catch (e) {}
          try { bodyGain.disconnect(); } catch (e) {}
          try { clickSource.disconnect(); } catch (e) {}
          try { clickFilter.disconnect(); } catch (e) {}
          try { clickEnv.disconnect(); } catch (e) {}
          // console.log("808 Kick nodes disconnected");
      };
      // Use the 'ended' event of the longer sound (body oscillator)
      bodyOsc.onended = cleanup;
      // Safety net in case bodyOsc stops early or fails
      clickSource.onended = () => {
         // If body is still playing, don't cleanup yet.
         // If body already finished, cleanup might have run.
         // A more robust system might use timeouts or track node states.
         // For simplicity, we rely mainly on bodyOsc.onended.
      };
    }
  
    // Connect/Disconnect methods remain the same
    connect(destination) { this.masterGain.connect(destination); }
    disconnect() { this.masterGain.disconnect(); }
  }