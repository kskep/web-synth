<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Accept the audio context and gain node as props
  export let audioContext: AudioContext;
  export let gainNode: GainNode;

  let gain = 1;
  let workletNode: AudioWorkletNode | null = null;

  onMount(async () => {
    try {
      // Ensure the audio worklet is loaded
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
    // Create worklet node for custom gain processing
    workletNode = new AudioWorkletNode(audioContext, 'gain-processor', {
      outputChannelCount: [1]
    });
    
    // Set initial gain value
    updateGain();
    
    // Connect the main gain node to our worklet node
    gainNode.disconnect();
    gainNode.connect(workletNode);
    
    // Connect our worklet to the destination
    workletNode.connect(audioContext.destination);
  }

  function updateGain() {
    if (workletNode) {
      const gainParam = workletNode.parameters.get('gain');
      if (gainParam) {
        gainParam.setValueAtTime(gain, audioContext.currentTime);
      }
    }
  }
</script>

<div class="gain-module">
  <div class="module-header">
    <h2>Gain</h2>
  </div>
  
  <div class="control">
    <label for="gain">Gain</label>
    <div class="slider-container">
      <input
        id="gain"
        type="range"
        min="0"
        max="2"
        step="0.01"
        bind:value={gain}
        on:input={updateGain}
      />
      <div class="value-display">{gain.toFixed(2)}</div>
    </div>
  </div>
</div>

<style>
  .gain-module {
    background: linear-gradient(to bottom, #2c3e50, #1a2533);
    border-radius: 10px;
    padding: 20px;
    color: #ecf0f1;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    margin-bottom: 20px;
    font-family: 'Arial', sans-serif;
  }

  .module-header {
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
</style>