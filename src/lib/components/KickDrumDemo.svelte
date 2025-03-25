<script>
    import { onMount, onDestroy } from 'svelte';
    import { audioContextStore, isAudioInitialized, initializeAudio, getAudioContext } from '$lib/stores/audioStore';
    // Make sure the path is correct
    import { KickEngine } from '$lib/audio/KickEngine.js'; // Updated path/name if necessary
  
    let kickEngine = null;
    // Initialize params state with default structure, will be overwritten
    let params = {
        tune: 50, decay: 0.5, punch: 150, pitchDecay: 0.05,
        drive: 40, clickLevel: 0.8, clickDecay: 0.02,
        clickFilterFreq: 3000, outputGain: 0.7
    };
    let initialized = false;
  
    const unsubscribeInitialized = isAudioInitialized.subscribe(value => {
      initialized = value;
      if (initialized && !kickEngine) {
          const ctx = getAudioContext();
          if (ctx) {
              kickEngine = new KickEngine(ctx); // Use the new engine
              params = { ...kickEngine.params }; // Load initial params
              console.log('808 KickEngine created.');
          }
      }
    });
  
    function triggerKick() {
      if (!initialized || !kickEngine) {
          if (!initialized) initializeAudio();
          return;
      }
      kickEngine.trigger(getAudioContext().currentTime);
    }
  
    // Update engine reactively
    $: if (kickEngine && initialized) {
        kickEngine.updateParams(params);
    }
  
    // Helper for slider binding
    function handleInput(paramName, event) {
        let value = parseFloat(event.target.value);
        // Add specific constraints if needed
        if (paramName === 'tune' || paramName === 'punch' || paramName === 'drive' || paramName === 'clickFilterFreq') {
            value = Math.max(0, value); // Ensure non-negative for certain params
        }
         if (paramName === 'clickLevel' || paramName === 'outputGain') {
            value = Math.max(0, Math.min(1, value)); // Clamp gain values 0-1
        }
        params = { ...params, [paramName]: value };
    }
  
    onMount(() => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'running' && !kickEngine) {
             kickEngine = new KickEngine(ctx);
             params = { ...kickEngine.params };
             initialized = true;
        }
    });
  
    onDestroy(() => {
      kickEngine?.disconnect();
      unsubscribeInitialized();
      console.log('KickDrumDemo destroyed, 808 engine disconnected.');
    });
  
  </script>
  
  <div class="kick-demo">
    <h2>808-Style Kick Drum</h2>
  
    {#if !initialized}
      <button on:click={initializeAudio}>Initialize Audio & Kick</button>
      <p>Click to enable audio.</p>
    {:else}
      <button class="trigger-button" on:click={triggerKick}>Trigger Kick</button>
  
      <div class="controls">
        <h4>Parameters</h4>
  
         <div class="control-grid">
             <div class="control-group">
                  <label for="tune">Tune (Hz): {params.tune.toFixed(0)}</label>
                  <input type="range" id="tune" min="20" max="100" step="1" value={params.tune} on:input={(e) => handleInput('tune', e)}>
              </div>
              <div class="control-group">
                  <label for="punch">Punch (Hz Sweep): {params.punch.toFixed(0)}</label>
                  <input type="range" id="punch" min="0" max="400" step="5" value={params.punch} on:input={(e) => handleInput('punch', e)}>
              </div>
  
              <div class="control-group">
                  <label for="shape">Shape/Drive: {params.drive.toFixed(0)}</label>
                   <input type="range" id="shape" min="0" max="150" step="1" value={params.drive} on:input={(e) => handleInput('drive', e)}>
              </div>
              <div class="control-group"> </div>
  
              <div class="control-group">
                  <label for="decay">Decay (s): {params.decay.toFixed(3)}</label>
                  <input type="range" id="decay" min="0.05" max="1.5" step="0.005" value={params.decay} on:input={(e) => handleInput('decay', e)}>
              </div>
  
               <div class="control-group">
                  <label for="click">Click Level: {params.clickLevel.toFixed(2)}</label>
                  <input type="range" id="click" min="0" max="1.5" step="0.01" value={params.clickLevel} on:input={(e) => handleInput('clickLevel', e)}> </div>
              <div class="control-group">
                  <label for="output">Output: {params.outputGain.toFixed(2)}</label>
                   <input type="range" id="output" min="0" max="1.0" step="0.01" value={params.outputGain} on:input={(e) => handleInput('outputGain', e)}>
              </div>
         </div>
  
  
          <h4>Fine Tuning</h4>
           <div class="control-grid-small">
              <div class="control-group">
                  <label for="pitchDecay">Pitch Decay (s): {params.pitchDecay.toFixed(3)}</label>
                  <input type="range" id="pitchDecay" min="0.005" max="0.15" step="0.001" value={params.pitchDecay} on:input={(e) => handleInput('pitchDecay', e)}>
              </div>
              <div class="control-group">
                  <label for="clickDecay">Click Decay (s): {params.clickDecay.toFixed(3)}</label>
                  <input type="range" id="clickDecay" min="0.002" max="0.05" step="0.001" value={params.clickDecay} on:input={(e) => handleInput('clickDecay', e)}>
              </div>
               <div class="control-group">
                  <label for="clickFilterFreq">Click Filter (Hz): {params.clickFilterFreq.toFixed(0)}</label>
                  <input type="range" id="clickFilterFreq" min="500" max="8000" step="50" value={params.clickFilterFreq} on:input={(e) => handleInput('clickFilterFreq', e)}>
              </div>
          </div>
      </div>
    {/if}
  </div>
  
  <style>
    /* Basic styles from previous example */
    .kick-demo {
      font-family: sans-serif;
      padding: 1em;
      background-color: #282c34;
      color: #abb2bf;
      border-radius: 8px;
      max-width: 450px; /* Slightly wider */
      margin: 2em auto;
    }
    h2, h4 { text-align: center; margin-bottom: 1em; }
    h2 { color: #61afef; }
    h4 { color: #98c379; margin-top: 1.5em; }
  
    button { /* Style as before */
        display: block; padding: 0.8em 1.5em; margin: 0 auto 1em auto; font-size: 1em; cursor: pointer; background-color: #61afef; color: #282c34; border: none; border-radius: 5px; transition: background-color 0.2s;
    }
    button.trigger-button { background-color: #e06c75; color: white; }
    button:hover:not(:disabled) { background-color: #528baf; }
    button.trigger-button:hover:not(:disabled) { background-color: #be5046; }
    button:disabled { background-color: #555; cursor: not-allowed; }
  
    .controls { margin-top: 1.5em; border-top: 1px solid #444; padding-top: 1em; }
    .control-group { margin-bottom: 0.8em; }
    label { display: block; font-size: 0.9em; margin-bottom: 0.3em; color: #abb2bf; }
    input[type="range"] { width: 100%; cursor: pointer; }
  
    /* Grid for V8 layout approximation */
    .control-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr); /* Two columns */
        gap: 1em 1.5em; /* Row gap, Column gap */
        align-items: start; /* Align items to the top of their grid cell */
    }
     .control-grid-small {
         display: grid;
         grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Responsive columns */
         gap: 1em 1.5em;
     }
  
     /* Place Output below Click */
     .control-grid .control-group:nth-child(7) { /* Output Gain */
         grid-column: 2; /* Force to second column */
         /* Adjust margin or grid row if needed for exact positioning */
     }
  
  
  </style>