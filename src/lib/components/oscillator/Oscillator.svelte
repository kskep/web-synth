<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Props for shared audio context
  export let audioContext: AudioContext;
  export let gainNode: GainNode;

  // Oscillator parameters
  let frequency = 440;
  let amplitude = 0.5;
  
  // ADSR envelope parameters
  let attack = 0.1;
  let decay = 0.2;
  let sustain = 0.7;
  let release = 0.5;
  let isPlaying = false;

  // Web Audio API nodes
  let workletNode: AudioWorkletNode | null = null;

  onMount(async () => {
    try {
      // Load and register the audio worklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      setupAudioNodes();
    } catch (error) {
      console.error('Failed to load audio worklet:', error);
    }
  });

  onDestroy(() => {
    if (workletNode) {
      workletNode.disconnect();
    }
  });

  function setupAudioNodes() {
    // Create worklet node for custom oscillator processing
    workletNode = new AudioWorkletNode(audioContext, 'oscillator-processor', {
      outputChannelCount: [1]
    });
    
    // Set initial parameter values
    updateParameters();
    
    // Connect to gain node
    workletNode.connect(gainNode);
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    
    if (workletNode) {
      // Control the gate parameter to start/stop the oscillator
      const gateParam = workletNode.parameters.get('gate');
      if (gateParam) {
        gateParam.setValueAtTime(isPlaying ? 1 : 0, audioContext.currentTime);
      }
    }
  }

  function updateParameters() {
    if (workletNode) {
      // Update all parameters
      const params = workletNode.parameters;
      params.get('frequency')?.setValueAtTime(frequency, audioContext.currentTime);
      params.get('amplitude')?.setValueAtTime(amplitude, audioContext.currentTime);
      params.get('attack')?.setValueAtTime(attack, audioContext.currentTime);
      params.get('decay')?.setValueAtTime(decay, audioContext.currentTime);
      params.get('sustain')?.setValueAtTime(sustain, audioContext.currentTime);
      params.get('release')?.setValueAtTime(release, audioContext.currentTime);
    }
  }

  // Frequency to note conversion for display
  function frequencyToNote(freq: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const a4Index = 69; // MIDI note number for A4
    
    if (freq <= 0) return 'N/A';
    
    const noteIndex = Math.round(12 * Math.log2(freq / a4) + a4Index);
    const octave = Math.floor(noteIndex / 12) - 1;
    const noteName = noteNames[noteIndex % 12];
    
    return `${noteName}${octave}`;
  }

  // Update handlers for parameters
  function updateFrequency() {
    updateParameters();
  }

  function updateAmplitude() {
    updateParameters();
  }

  function updateAttack() {
    updateParameters();
  }

  function updateDecay() {
    updateParameters();
  }

  function updateSustain() {
    updateParameters();
  }

  function updateRelease() {
    updateParameters();
  }
</script>

<div class="oscillator-module">
  <div class="module-header">
    <h2>Oscillator</h2>
    <button class={`play-button ${isPlaying ? 'active' : ''}`} on:click={togglePlay}>
      {isPlaying ? 'Stop' : 'Play'}
    </button>
  </div>
  
  <div class="controls-container">
    <div class="control-group">
      <h3>Oscillator</h3>
      <div class="control">
        <label for="frequency">Frequency</label>
        <div class="slider-container">
          <input
            id="frequency"
            type="range"
            min="20"
            max="2000"
            bind:value={frequency}
            on:input={updateFrequency}
          />
          <div class="value-display">
            <span>{frequency.toFixed(1)} Hz</span>
            <span class="note-name">{frequencyToNote(frequency)}</span>
          </div>
        </div>
      </div>
      
      <div class="control">
        <label for="amplitude">Amplitude</label>
        <div class="slider-container">
          <input
            id="amplitude"
            type="range"
            min="0"
            max="1"
            step="0.01"
            bind:value={amplitude}
            on:input={updateAmplitude}
          />
          <div class="value-display">{amplitude.toFixed(2)}</div>
        </div>
      </div>
    </div>
    
    <div class="control-group">
      <h3>ADSR Envelope</h3>
      <div class="adsr-controls">
        <div class="control">
          <label for="attack">Attack</label>
          <div class="slider-container">
            <input
              id="attack"
              type="range"
              min="0.001"
              max="2"
              step="0.001"
              bind:value={attack}
              on:input={updateAttack}
            />
            <div class="value-display">{attack.toFixed(2)}s</div>
          </div>
        </div>
        
        <div class="control">
          <label for="decay">Decay</label>
          <div class="slider-container">
            <input
              id="decay"
              type="range"
              min="0.001"
              max="2"
              step="0.001"
              bind:value={decay}
              on:input={updateDecay}
            />
            <div class="value-display">{decay.toFixed(2)}s</div>
          </div>
        </div>
        
        <div class="control">
          <label for="sustain">Sustain</label>
          <div class="slider-container">
            <input
              id="sustain"
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={sustain}
              on:input={updateSustain}
            />
            <div class="value-display">{sustain.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="control">
          <label for="release">Release</label>
          <div class="slider-container">
            <input
              id="release"
              type="range"
              min="0.001"
              max="5"
              step="0.001"
              bind:value={release}
              on:input={updateRelease}
            />
            <div class="value-display">{release.toFixed(2)}s</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .oscillator-module {
    background: linear-gradient(to bottom, #2c3e50, #1a2533);
    border-radius: 10px;
    padding: 20px;
    color: #ecf0f1;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    margin-bottom: 20px;
    font-family: 'Arial', sans-serif;
  }

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 10px;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #3498db;
  }

  h3 {
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: #e74c3c;
  }

  .play-button {
    background-color: #2ecc71;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 16px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .play-button:hover {
    background-color: #27ae60;
    transform: scale(1.05);
  }

  .play-button.active {
    background-color: #e74c3c;
  }

  .play-button.active:hover {
    background-color: #c0392b;
  }

  .controls-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .control-group {
    flex: 1;
    min-width: 280px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 15px;
  }

  .control {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 0.9rem;
    color: #bdc3c7;
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: linear-gradient(to right, #3498db, #9b59b6);
    border-radius: 4px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #ecf0f1;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: #ffffff;
  }

  .value-display {
    min-width: 60px;
    text-align: right;
    font-size: 0.9rem;
    color: #ecf0f1;
  }

  .note-name {
    display: block;
    font-size: 0.8rem;
    color: #9b59b6;
    margin-top: 2px;
  }

  .adsr-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  @media (max-width: 768px) {
    .controls-container {
      flex-direction: column;
    }
    
    .adsr-controls {
      grid-template-columns: 1fr;
    }
  }
</style>