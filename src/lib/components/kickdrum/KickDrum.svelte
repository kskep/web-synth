<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Props for shared audio context
  export let audioContext: AudioContext;
  export let gainNode: GainNode;

  // Kick drum parameters
  let frequency = 60; // Base frequency in Hz
  let attack = 0.001; // Very short attack for punch
  let decay = 0.5; // Decay time in seconds
  let tone = 0.7; // Tone control (distortion amount)
  let impact = 0.8; // Impact control (initial pitch height)

  // UI state
  let isPlaying = false;
  let autoTrigger = false;
  let triggerInterval: number | null = null;

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
    if (triggerInterval) {
      clearInterval(triggerInterval);
    }
  });

  function setupAudioNodes() {
    // Create worklet node for custom kick drum processing
    workletNode = new AudioWorkletNode(audioContext, 'kick-drum-processor', {
      outputChannelCount: [1]
    });
    
    // Set initial parameter values
    updateParameters();
    
    // Connect to gain node
    workletNode.connect(gainNode);
  }

  function triggerKick() {
    if (workletNode) {
      // Trigger the kick drum
      const triggerParam = workletNode.parameters.get('trigger');
      if (triggerParam) {
        // Set trigger to 1 then back to 0 to create a trigger pulse
        triggerParam.setValueAtTime(1, audioContext.currentTime);
        triggerParam.setValueAtTime(0, audioContext.currentTime + 0.01);
      }
    }
  }

  function toggleAutoTrigger() {
    autoTrigger = !autoTrigger;
    
    if (autoTrigger) {
      // Start auto-triggering at 120 BPM (2 beats per second)
      triggerInterval = setInterval(triggerKick, 500);
    } else {
      // Stop auto-triggering
      if (triggerInterval) {
        clearInterval(triggerInterval);
        triggerInterval = null;
      }
    }
  }

  function updateParameters() {
    if (workletNode) {
      // Update all parameters
      const params = workletNode.parameters;
      params.get('frequency')?.setValueAtTime(frequency, audioContext.currentTime);
      params.get('attack')?.setValueAtTime(attack, audioContext.currentTime);
      params.get('decay')?.setValueAtTime(decay, audioContext.currentTime);
      params.get('tone')?.setValueAtTime(tone, audioContext.currentTime);
      params.get('impact')?.setValueAtTime(impact, audioContext.currentTime);
    }
  }

  // Update handlers for parameters
  function updateFrequency() {
    updateParameters();
  }

  function updateAttack() {
    updateParameters();
  }

  function updateDecay() {
    updateParameters();
  }

  function updateTone() {
    updateParameters();
  }

  function updateImpact() {
    updateParameters();
  }
</script>

<div class="kickdrum-module">
  <div class="module-header">
    <h2>Kick Drum</h2>
    <div class="button-group">
      <button class="trigger-button" on:click={triggerKick}>Trigger</button>
      <button class={`auto-button ${autoTrigger ? 'active' : ''}`} on:click={toggleAutoTrigger}>
        {autoTrigger ? 'Stop' : 'Auto'}
      </button>
    </div>
  </div>
  
  <div class="controls-container">
    <div class="control-group">
      <h3>Kick Parameters</h3>
      
      <div class="control">
        <label for="frequency">Frequency</label>
        <div class="slider-container">
          <input
            id="frequency"
            type="range"
            min="20"
            max="200"
            bind:value={frequency}
            on:input={updateFrequency}
          />
          <div class="value-display">{frequency.toFixed(1)} Hz</div>
        </div>
      </div>
      
      <div class="control">
        <label for="decay">Decay</label>
        <div class="slider-container">
          <input
            id="decay"
            type="range"
            min="0.1"
            max="2"
            step="0.01"
            bind:value={decay}
            on:input={updateDecay}
          />
          <div class="value-display">{decay.toFixed(2)}s</div>
        </div>
      </div>
      
      <div class="control">
        <label for="attack">Attack</label>
        <div class="slider-container">
          <input
            id="attack"
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            bind:value={attack}
            on:input={updateAttack}
          />
          <div class="value-display">{attack.toFixed(3)}s</div>
        </div>
      </div>
      
      <div class="control">
        <label for="tone">Tone</label>
        <div class="slider-container">
          <input
            id="tone"
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            bind:value={tone}
            on:input={updateTone}
          />
          <div class="value-display">{tone.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="control">
        <label for="impact">Impact</label>
        <div class="slider-container">
          <input
            id="impact"
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            bind:value={impact}
            on:input={updateImpact}
          />
          <div class="value-display">{impact.toFixed(2)}</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .kickdrum-module {
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

  .button-group {
    display: flex;
    gap: 10px;
  }

  .trigger-button {
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 16px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .trigger-button:hover {
    background-color: #c0392b;
    transform: scale(1.05);
  }

  .auto-button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 16px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auto-button:hover {
    background-color: #2980b9;
    transform: scale(1.05);
  }

  .auto-button.active {
    background-color: #e67e22;
  }

  .auto-button.active:hover {
    background-color: #d35400;
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
    background: linear-gradient(to right, #e74c3c, #f39c12);
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

  @media (max-width: 768px) {
    .controls-container {
      flex-direction: column;
    }
  }
</style>
