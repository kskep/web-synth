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
      this.activeNodes = new Set(); // Keep track of nodes created in trigger

      // --- Default Parameters (Updated) ---
      this.params = {
          // Main
          tune: 50,         // Base frequency Hz
          decay: 0.5,       // Amplitude decay Seconds
          punch: 150,       // Pitch sweep amount Hz
          pitchDecay: 0.05, // Pitch sweep time Seconds
          // Click
          clickLevel: 0.8,      // Click mix level (0-1.5)
          clickDecay: 0.02,     // Click envelope decay Secs
          clickFilterFreq: 3000,// Click low-pass filter Hz
          // Shape / Distortion (NEW)
          drive: 50,            // Input gain into shaping stage (0-150+)
          shapeCharacter: 0.5,  // Distortion curve shape (0-1)
          distortionAmount: 0.7,// Intensity of shaping (0-1)
          mix: 1.0,             // Dry/Wet mix for shaping stage (0-1)
          // Output
          outputGain: 0.7       // Final output gain (0-1)
      };

      // --- Master Output Gain ---
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.params.outputGain;
      this.masterGain.connect(this.audioContext.destination);

      // --- Noise Buffer (for Click) ---
      this._noiseBuffer = this._createWhiteNoiseBuffer(0.5); // 0.5s is enough

      // --- Pre-calculate WaveShaper Curve ---
      this._waveShaperCurve = this._createDistortionCurve(
          this.params.shapeCharacter,
          this.params.distortionAmount
      );
  }

  /** Creates a buffer filled with white noise. */
  _createWhiteNoiseBuffer(seconds = 0.5) {
      const bufferSize = this.audioContext.sampleRate * seconds;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }
      return buffer;
  }

  /**
   * Creates a distortion curve for the WaveShaperNode.
   * @param {number} character - Controls the curve shape (0-1). 0=linear, 0.5=tanh-like, 1=harder clip.
   * @param {number} amount - Scales the input signal before applying the curve (0-1), affects intensity.
   * @param {number} samples - Number of samples in the curve array.
   */
  _createDistortionCurve(character = 0.5, amount = 0.7, samples = 4096) {
      const curve = new Float32Array(samples);
      const k = amount * 100; // Scale amount to affect intensity (0 to 100)
      const c = Math.max(0, Math.min(1, character)); // Clamp character [0, 1]

      // Linear interpolation factor based on character
      // Mix between a linear function (y=x) and a non-linear function
      const mixFactor = c;

      // Non-linear function (tanh-like, gets harder with higher 'k')
      const nonLinearFn = (x) => {
          // Apply 'amount' scaling to input x
          const scaledX = x * (1 + k / 5); // Increase input range based on amount
          // Simple tanh approximation that gets steeper
          return Math.tanh(scaledX * (1 + c * 2)); // Character makes tanh steeper
      };

      let maxAbsValue = 0;
      for (let i = 0; i < samples; ++i) {
          // Map i to input range [-1, 1]
          const x = (i * 2) / samples - 1;

          // Calculate linear and non-linear components
          const linearVal = x;
          const nonLinearVal = nonLinearFn(x);

          // Interpolate between linear and non-linear based on 'character'
          curve[i] = linearVal * (1 - mixFactor) + nonLinearVal * mixFactor;

          if (Math.abs(curve[i]) > maxAbsValue) {
              maxAbsValue = Math.abs(curve[i]);
          }
      }

      // Normalize the curve to prevent excessive gain increase from shaper itself
      // (Drive/Mix controls overall level better)
      if (maxAbsValue > 0) {
           // Avoid division by zero
           // Normalize slightly less than 1 to prevent hard digital clipping within shaper if input is exactly 1
           const normFactor = 0.98 / maxAbsValue;
          for (let i = 0; i < samples; ++i) {
              curve[i] *= normFactor;
          }
      }


      return curve;
  }

  /**
   * Maps the drive parameter (0-150+) to an actual gain multiplier.
   * Uses a curve that ramps up gain more significantly at higher drive values.
   * @param {number} driveValue - The drive parameter value.
   * @returns {number} - The calculated gain multiplier.
   */
  _getDriveGain(driveValue) {
      const normalizedDrive = Math.max(0, driveValue) / 100; // Normalize roughly to 0-1.5+
      // Apply a power curve (e.g., x^2 or x^3) to make high values more impactful
      const gain = 1 + Math.pow(normalizedDrive, 2) * 5; // Example: 0->1, 100->6, 150->~12
      return Math.max(1, gain); // Ensure minimum gain of 1
  }


  /**
   * Update parameters.
   * @param {Partial<typeof this.params>} newParams
   */
  updateParams(newParams) {
      const needsCurveUpdate = (newParams.shapeCharacter !== undefined && newParams.shapeCharacter !== this.params.shapeCharacter) ||
                             (newParams.distortionAmount !== undefined && newParams.distortionAmount !== this.params.distortionAmount);

      this.params = { ...this.params, ...newParams };

      // Update master gain smoothly
      this.masterGain.gain.setTargetAtTime(
          this.params.outputGain,
          this.audioContext.currentTime,
          0.01 // Short time constant for smooth updates
      );

      // Recalculate shaper curve if relevant params changed
      if (needsCurveUpdate) {
          this._waveShaperCurve = this._createDistortionCurve(
              this.params.shapeCharacter,
              this.params.distortionAmount
          );
      }
  }

  /**
   * Trigger the kick sound.
   * @param {number} [time] - Optional: Schedule time (defaults to now)
   */
  trigger(time) {
      const t = time !== undefined ? time : this.audioContext.currentTime;
      const p = this.params; // Shorthand
      const ctx = this.audioContext;

      // === NODES ===
      // --- Body Tone ---
      const bodyOsc = ctx.createOscillator();
      const bodyAmpEnv = ctx.createGain(); // Controls amplitude BEFORE shaping
      const driveGain = ctx.createGain();   // Controlled by 'drive' param
      const shaper = ctx.createWaveShaper();
      const wetGain = ctx.createGain();     // Controls shaped signal level for mix
      const dryGain = ctx.createGain();     // Controls unshaped signal level for mix
      const mixNode = ctx.createGain();     // Combines dry and wet signals

      // --- Click ---
      const clickSource = ctx.createBufferSource();
      const clickFilter = ctx.createBiquadFilter();
      const clickEnv = ctx.createGain(); // Gain envelope for click

      // Keep track of nodes to disconnect later
      const currentNodes = [
           bodyOsc, bodyAmpEnv, driveGain, shaper, wetGain, dryGain, mixNode,
           clickSource, clickFilter, clickEnv
      ];
      currentNodes.forEach(node => this.activeNodes.add(node));

      // === CONNECTIONS ===
      // Body Path (Dry): Osc -> Amp Env -> Dry Gain -> Mix Node -> Master Gain
      bodyOsc.connect(bodyAmpEnv);
      bodyAmpEnv.connect(dryGain);
      dryGain.connect(mixNode);

      // Body Path (Wet): Osc -> Amp Env -> Drive Gain -> Shaper -> Wet Gain -> Mix Node -> Master Gain
      // Note: bodyAmpEnv already connected to dryGain, connect it also to driveGain
      bodyAmpEnv.connect(driveGain);
      driveGain.connect(shaper);
      shaper.connect(wetGain);
      wetGain.connect(mixNode);

      // Combined Body signal to Master
      mixNode.connect(this.masterGain);

      // Click Path: Noise Source -> Filter -> Click Env -> Master Gain
      clickSource.connect(clickFilter);
      clickFilter.connect(clickEnv);
      clickEnv.connect(this.masterGain);

      // === CONFIG & SCHEDULING ===

      // --- Body Tone ---
      bodyOsc.type = 'sine'; // Or triangle
      bodyOsc.frequency.setValueAtTime(p.tune + p.punch, t); // Start pitch
      bodyOsc.frequency.exponentialRampToValueAtTime(p.tune, t + p.pitchDecay); // Pitch drop

      bodyAmpEnv.gain.setValueAtTime(0, t); // Start silent
      bodyAmpEnv.gain.linearRampToValueAtTime(1.0, t + 0.005); // Fast attack
      bodyAmpEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.decay); // Main decay

      // Shaping Stage Config
      driveGain.gain.setValueAtTime(this._getDriveGain(p.drive), t); // Apply drive gain mapping
      shaper.curve = this._waveShaperCurve; // Use pre-calculated curve
      shaper.oversample = '4x'; // Helps reduce aliasing

      // Mix Config (Linear crossfade)
      const wetLevel = p.mix;
      const dryLevel = 1.0 - p.mix;
      wetGain.gain.setValueAtTime(wetLevel, t);
      dryGain.gain.setValueAtTime(dryLevel, t);
      mixNode.gain.setValueAtTime(1.0, t); // Keep mix node at unity gain

      bodyOsc.start(t);
      bodyOsc.stop(t + p.decay + 0.1); // Stop slightly after envelope finishes

      // --- Click ---
      clickSource.buffer = this._noiseBuffer;
      clickSource.loop = false; // No need to loop if buffer is long enough

      clickFilter.type = 'lowpass';
      clickFilter.frequency.setValueAtTime(p.clickFilterFreq, t);
      clickFilter.Q.setValueAtTime(1, t); // Adjust Q if needed

      clickEnv.gain.setValueAtTime(0, t); // Start silent
      // Use clickLevel directly here. Range 0 to 1.5 gives some boost potential.
      clickEnv.gain.linearRampToValueAtTime(Math.max(0, p.clickLevel), t + 0.002); // Very fast attack
      clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + p.clickDecay); // Short decay

      clickSource.start(t);
      clickSource.stop(t + p.clickDecay + 0.05); // Stop shortly after click decay

      // --- Auto Cleanup ---
      const cleanup = () => {
          currentNodes.forEach(node => {
              try {
                  node.disconnect();
              } catch (e) {
                  // Ignore errors if already disconnected
              }
              this.activeNodes.delete(node); // Remove from active set
          });
          // console.log("808 Kick nodes disconnected");
      };

      // Use the 'ended' event of the longest sound component (body oscillator)
      // Check if the node still exists before setting onended
       if (this.activeNodes.has(bodyOsc)) {
          bodyOsc.onended = cleanup;
       } else {
           // Fallback cleanup if bodyOsc might be gone before onended is set (unlikely but safe)
           setTimeout(cleanup, (p.decay + 0.15) * 1000);
       }
  }

  // Connect master output gain
  connect(destination) {
      if (destination instanceof AudioNode) {
          this.masterGain.connect(destination);
      } else {
          console.error("Invalid destination node provided to KickEngine connect");
      }
  }

  // Disconnect master output gain
  disconnect(destination) {
      try {
          if (destination instanceof AudioNode) {
               this.masterGain.disconnect(destination);
          } else {
              // Disconnect from all if no specific destination provided
               this.masterGain.disconnect();
          }
      } catch (e) {
           console.warn("Error during KickEngine disconnect:", e);
      }
       // Also ensure any remaining active trigger nodes are cleaned up
       this.cleanupAllNodes();
  }

   // Method to forcefully disconnect all trigger-created nodes
   cleanupAllNodes() {
       this.activeNodes.forEach(node => {
           try {
               node.disconnect();
           } catch (e) {}
       });
       this.activeNodes.clear();
       // console.log("Forced cleanup of all active KickEngine nodes.");
   }
}