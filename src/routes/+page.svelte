<script lang="ts">
  import { onMount } from 'svelte';
  import Oscillator from '$lib/components/oscillator/Oscillator.svelte';
  import Gain from '$lib/components/gain/Gain.svelte';
  import KickDrum from '$lib/components/kickdrum/KickDrum.svelte';

  // Create a shared audio context
  let audioContext: AudioContext;
  let oscillatorNode: OscillatorNode;
  let gainNode: GainNode;
  let audioInitialized = false;

  // Initialize audio on user interaction
  function initAudio() {
    if (!audioContext) {
      audioContext = new AudioContext();
      
      // Create gain node
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      gainNode.connect(audioContext.destination);
      
      audioInitialized = true;
    }
  }
</script>

<main>
  <h1>Web Synth</h1>
  
  {#if !audioInitialized}
    <div class="init-container">
      <p>Click the button below to start audio</p>
      <button on:click={initAudio} class="start-button">Start Audio</button>
    </div>
  {:else}
    <div class="modules-container">
      <Oscillator {audioContext} {gainNode} />
      <KickDrum {audioContext} {gainNode} />
      <Gain {audioContext} {gainNode} />
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Arial', sans-serif;
    background-color: #121212;
    color: #ffffff;
    min-height: 100vh;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #3498db;
    font-size: 2.5rem;
  }

  .modules-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .init-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 300px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    font-size: 1.2rem;
    text-align: center;
    padding: 2rem;
  }

  .start-button {
    margin-top: 1.5rem;
    background-color: #2ecc71;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 12px 24px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .start-button:hover {
    background-color: #27ae60;
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }
  }
</style>