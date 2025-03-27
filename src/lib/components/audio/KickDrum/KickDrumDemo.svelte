<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { audioContextStore, isAudioInitialized, initializeAudio, getAudioContext } from '$lib/stores/audioStore';
    import { KickEngine } from '$lib/audio/KickEngine.js'; // Ensure path is correct

    // Export outputNode for FX routing
    export let inputNode: AudioNode | undefined = undefined;
    export let outputNode: AudioNode | null = null;


    let kickEngine: KickEngine | null = null;
    let initialized = false;
    let isEngineReady = false;
    let activeTab = 'Main'; // State for currently active tab

    interface KickParams {
        tune: number;
        decay: number;
        punch: number;
        pitchDecay: number;
        clickLevel: number;
        clickDecay: number;
        clickFilterFreq: number;
        clickHighPassFreq: number;
        clickNoiseType: 'white' | 'pink';
        oscType: 'sine' | 'triangle';
        distPreGain: number;
        distMix: number;
        distAlgo: number;
        distChar: number;
        outputGain: number;
    }

    let params: KickParams = {
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
        clickNoiseType: 'white',
        // Oscillator
        oscType: 'sine',
        // Distortion
        distPreGain: 1.0,
        distMix: 1.0,
        distAlgo: 0,
        distChar: 0.5,
        // Output
        outputGain: 0.7
    };

    const unsubscribeInitialized = isAudioInitialized.subscribe(value => {
        initialized = value;
        if (initialized && !kickEngine) {
            const maybeCtx = getAudioContext();
            if (maybeCtx) {
                const ctx = maybeCtx as AudioContext;
                kickEngine = new KickEngine(ctx);
                // Wait for engine to be ready
                const checkReady = setInterval(() => {
                    if (kickEngine?.isReady) {
                        isEngineReady = true;
                        outputNode = kickEngine.outputNode;
                        // Connect to provided destination or default to audioContext.destination
                        
                        if (inputNode) {
                          inputNode.connect(kickEngine.inputNode);
                        }else{
                          kickEngine.connect(ctx.destination)
                        }
                        if (!inputNode){
                          kickEngine.connect(ctx.destination);
                        }
                        
                        clearInterval(checkReady);
                        // Merge component defaults with engine defaults
                        if (kickEngine.params) {
                            params = { ...params, ...kickEngine.params };
                        }
                    }
                }, 100);
                console.log('808 KickEngine created.');
            }
        }
    });

    function triggerKick() {
        if (!initialized || !kickEngine || !isEngineReady) {
            if (!initialized) initializeAudio();
            return;
        }
        const maybeCtx = getAudioContext();
        if (maybeCtx) {
            const ctx = maybeCtx as AudioContext;
            kickEngine.trigger(ctx.currentTime);
        }
    }

    // Update engine reactively when params change
    $: if (kickEngine && initialized && isEngineReady) {
        kickEngine.updateParams(params);
    }

    // Helper for slider binding
    function handleInput(paramName: keyof KickParams, event: Event) {
        const target = event.target as HTMLInputElement;
        let value = parseFloat(target.value);
        // Add specific constraints
        if (['clickLevel', 'outputGain', 'distMix'].includes(paramName)) {
            value = Math.max(0, Math.min(1, value)); // Clamp 0-1
        }
        if (['tune', 'punch', 'clickFilterFreq', 'clickHighPassFreq', 'distPreGain'].includes(paramName)) {
            value = Math.max(0, value); // Ensure non-negative
        }
        if (paramName === 'distAlgo') {
            value = Math.round(value); // Ensure integer for algorithm type
        }
        // Update the reactive params object
        params = { ...params, [paramName]: value };
    }

    onMount(() => {
        const maybeCtx = getAudioContext();
        if (maybeCtx && !kickEngine && !initialized) {
            const ctx = maybeCtx as AudioContext;
            kickEngine = new KickEngine(ctx);
            const checkReady = setInterval(() => {
                if (kickEngine?.isReady) {
                    isEngineReady = true;
                    outputNode = kickEngine.outputNode;
                    
                    if (inputNode) {
                        inputNode.connect(kickEngine.inputNode);
                    }else{
                        kickEngine.connect(ctx.destination)
                    }
                    if (!inputNode){
                        kickEngine.connect(ctx.destination);
                    }
                    clearInterval(checkReady);
                    if (kickEngine.params) {
                        params = { ...params, ...kickEngine.params };
                    }
                    initialized = true;
                }
            }, 100);
            console.log('808 KickEngine created onMount.');
        }
        else if (kickEngine && initialized && isEngineReady) {
            kickEngine.updateParams(params);
        }
    });

    onDestroy(() => {
        if (kickEngine) {
           
            kickEngine.disconnect();
            
        }
        unsubscribeInitialized();
        console.log('KickDrumDemo destroyed, 808 engine disconnected.');
    });
</script>

<div class="kick-demo compact">
    <h2>808-Style Kick</h2>

    {#if !initialized || !isEngineReady}
        <button on:click={initializeAudio}>Initialize Audio & Kick</button>
        <p>Click to enable audio{#if initialized && !isEngineReady}... Loading engine{/if}</p>
    {:else}
        <button class="trigger-button" on:click={triggerKick}>Trigger Kick</button>

        <div class="tabs">
            <button class:active={activeTab === 'Main'} on:click={() => activeTab = 'Main'}>Main</button>
            <button class:active={activeTab === 'Click'} on:click={() => activeTab = 'Click'}>Click</button>
            <button class:active={activeTab === 'Shape'} on:click={() => activeTab = 'Shape'}>Shape</button>
            <button class:active={activeTab === 'Output'} on:click={() => activeTab = 'Output'}>Output</button>
        </div>

        <div class="tab-content">
            {#if activeTab === 'Main'}
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
                        <label for="decay">Decay (s): {params.decay.toFixed(3)}</label>
                        <input type="range" id="decay" min="0.05" max="1.5" step="0.005" value={params.decay} on:input={(e) => handleInput('decay', e)}>
                    </div>
                    <div class="control-group">
                         <label for="pitchDecay">Pitch Decay (s): {params.pitchDecay.toFixed(3)}</label>
                         <input type="range" id="pitchDecay" min="0.005" max="0.15" step="0.001" value={params.pitchDecay} on:input={(e) => handleInput('pitchDecay', e)}>
                     </div>
                </div>
            {/if}

            {#if activeTab === 'Click'}
                <div class="control-grid-small">
                     <div class="control-group">
                         <label for="click">Click Level: {params.clickLevel.toFixed(2)}</label>
                         <input type="range" id="click" min="0" max="1.5" step="0.01" value={params.clickLevel} on:input={(e) => handleInput('clickLevel', e)}>
                     </div>
                     <div class="control-group">
                         <label for="clickDecay">Click Decay (s): {params.clickDecay.toFixed(3)}</label>
                         <input type="range" id="clickDecay" min="0.002" max="0.05" step="0.001" value={params.clickDecay} on:input={(e) => handleInput('clickDecay', e)}>
                     </div>
                     <div class="control-group">
                         <label for="clickFilterFreq">Click Filter (Hz): {params.clickFilterFreq.toFixed(0)}</label>
                         <input type="range" id="clickFilterFreq" min="500" max="8000" step="50" value={params.clickFilterFreq} on:input={(e) => handleInput('clickFilterFreq', e)}>
                     </div>
                     <div class="control-group">
                         <label for="clickHighPassFreq">Click High Pass (Hz): {params.clickHighPassFreq.toFixed(0)}</label>
                         <input type="range" id="clickHighPassFreq" min="20" max="200" step="10" value={params.clickHighPassFreq} on:input={(e) => handleInput('clickHighPassFreq', e)}>
                     </div>
                </div>
            {/if}

            {#if activeTab === 'Shape'}
                <h4>Distortion & Shaping</h4>
                <div class="control-grid">
                    <div class="control-group">
                        <label for="distPreGain">Pre-Gain: {params.distPreGain.toFixed(1)}</label>
                        <input type="range" id="distPreGain" min="0" max="10" step="0.1" value={params.distPreGain} on:input={(e) => handleInput('distPreGain', e)} title="Input gain into the distortion stage">
                    </div>
                    <div class="control-group">
                        <label for="distChar">Character: {params.distChar.toFixed(2)}</label>
                        <input type="range" id="distChar" min="0.01" max="5" step="0.01" value={params.distChar} on:input={(e) => handleInput('distChar', e)} title="Character of the distortion effect">
                    </div>
                    <div class="control-group">
                        <label for="distAlgo">Algorithm: {['Soft Clip', 'Hard Clip', 'Foldback'][params.distAlgo]}</label>
                        <input type="range" id="distAlgo" min="0" max="2" step="1" value={params.distAlgo} on:input={(e) => handleInput('distAlgo', e)} title="Type of distortion algorithm">
                    </div>
                    <div class="control-group">
                        <label for="distMix">Mix: {(params.distMix * 100).toFixed(0)}%</label>
                        <input type="range" id="distMix" min="0" max="1" step="0.01" value={params.distMix} on:input={(e) => handleInput('distMix', e)} title="Dry/Wet mix for the distortion effect">
                    </div>
                </div>
            {/if}

             {#if activeTab === 'Output'}
                 <div class="control-grid-small">
                     <div class="control-group">
                         <label for="output">Output Gain: {params.outputGain.toFixed(2)}</label>
                         <input type="range" id="output" min="0" max="1.0" step="0.01" value={params.outputGain} on:input={(e) => handleInput('outputGain', e)}>
                     </div>
                 </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* --- Base Styles --- */
    .kick-demo.compact {
        font-family: sans-serif;
        padding: 1.2em 1.5em; /* Slightly more padding */
        /* Dark blue/purple gradient background */
        background-image: linear-gradient(145deg, #3a404b 0%, #282c34 70%);
        color: #abb2bf; /* Light text */
        border-radius: 10px; /* Slightly larger radius */
        max-width: 400px;
        margin: 1.5em auto; /* More vertical space */
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.1); /* Enhanced shadow */
        border: 1px solid #4b5263; /* Subtle border */
    }
     h2 {
        /* Gradient text effect (optional, browser support varies) */
        background: linear-gradient(90deg, #61afef, #c678dd);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        /* Fallback color */
        /* color: #61afef; */
        text-align: center;
        margin-bottom: 1em;
        font-weight: 600;
     }
     h4 {
        color: #98c379;
        margin-top: 0; margin-bottom: 1em;
        text-align: center; font-size: 1em;
        border-bottom: 1px solid rgba(171, 178, 191, 0.2); /* Lighter border */
        padding-bottom: 0.5em;
        text-transform: uppercase; /* Style tweak */
        letter-spacing: 0.5px;
     }

    /* --- Buttons --- */
     button { /* General button style */
        display: inline-block;
        padding: 0.6em 1em;
        margin: 0 0.2em 0.5em 0.2em;
        font-size: 0.9em;
        cursor: pointer;
        border: none; /* Remove default border */
        border-radius: 5px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(0,0,0,0.1);
        /* Default button gradient (subtle gray) */
        background-image: linear-gradient(to bottom, #6a7384, #5c6370);
        color: #dadde2; /* Slightly brighter text */
        text-shadow: 0 1px 1px rgba(0,0,0,0.2);
     }
    button:hover:not(:disabled) {
        background-image: linear-gradient(to bottom, #7a8394, #6c7380);
        box-shadow: 0 3px 6px rgba(0,0,0,0.25), inset 0 -1px 1px rgba(0,0,0,0.1);
        transform: translateY(-1px); /* Subtle lift */
    }
     button:active:not(:disabled) {
        background-image: linear-gradient(to top, #6a7384, #5c6370); /* Invert gradient */
         box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
         transform: translateY(0px);
     }
    button:disabled {
        background-image: linear-gradient(to bottom, #555, #444);
        color: #777; cursor: not-allowed;
        box-shadow: inset 0 1px 1px rgba(0,0,0,0.2);
        text-shadow: none;
    }

    /* Initialization and Trigger buttons centered */
    .kick-demo.compact > button:first-of-type,
    .trigger-button {
        display: block;
        margin-left: auto;
        margin-right: auto;
        margin-bottom: 1.2em;
        padding: 0.8em 1.8em; /* Slightly larger */
        font-size: 1em;
        font-weight: bold;
    }
     .trigger-button {
        /* Red/Orange gradient for trigger */
        background-image: linear-gradient(to bottom, #ef7c85, #e06c75);
        color: white;
        text-shadow: 0 1px 1px rgba(0,0,0,0.3);
     }
     .trigger-button:hover:not(:disabled) {
        background-image: linear-gradient(to bottom, #f08c95, #e17c85);
        box-shadow: 0 4px 8px rgba(224, 108, 117, 0.3), inset 0 -1px 1px rgba(0,0,0,0.1);
     }
      .trigger-button:active:not(:disabled) {
        background-image: linear-gradient(to top, #ef7c85, #e06c75);
        box-shadow: inset 0 2px 3px rgba(0,0,0,0.4);
     }


    /* --- Tabs --- */
    .tabs {
        display: flex;
        justify-content: center;
        margin-bottom: 1.2em;
        border-bottom: none; /* Remove simple border */
        position: relative;
         padding-bottom: 3px; /* Space for the active indicator line */
    }
     /* Line below tabs */
    .tabs::after {
         content: '';
         position: absolute;
         bottom: 0;
         left: 10%; right: 10%;
         height: 2px;
         background-color: rgba(171, 178, 191, 0.15);
         border-radius: 1px;
    }

    .tabs button {
        margin: 0 3px;
        background: none; /* Remove default button background */
        box-shadow: none; /* Remove default button shadow */
        border: none;
        border-bottom: 3px solid transparent; /* Indicator space */
        border-radius: 0; /* Flat tabs */
        padding: 0.6em 1em;
        color: #888dac;
        text-shadow: none;
        font-weight: 500;
        position: relative; /* For potential underline animation */
    }
    .tabs button:hover {
        background: none;
        color: #abb2bf;
         transform: none; /* No lift on tab hover */
         box-shadow: none;
    }
    .tabs button.active {
        color: #d19a66; /* Active tab text color (Orange/Yellow) */
        font-weight: 600;
        /* Active indicator line using gradient */
         border-image-source: linear-gradient(to right, #e5c07b, #d19a66);
         border-image-slice: 1;
         border-width: 0 0 3px 0; /* Apply border-image to bottom border */
    }

    /* --- Tab Content & Controls --- */
    .tab-content {
        padding: 0.8em 0.2em; /* Adjust padding */
        min-height: 150px;
    }
    .control-group { margin-bottom: 1em; }
    label {
        display: block;
        font-size: 0.85em;
        margin-bottom: 0.4em; /* More space below label */
        color: #abb2bf;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }
    input[type="range"] {
        width: 100%;
        cursor: pointer;
        height: 5px; /* Slimmer track */
        margin-top: 4px;
        background: linear-gradient(to right, #61afef, #c678dd); /* Gradient track */
        border-radius: 3px;
        -webkit-appearance: none; /* Override default look */
        appearance: none;
         outline: none;
         border: 1px solid rgba(0,0,0,0.2);
    }
    /* --- Range Slider Thumb --- */
     input[type="range"]::-webkit-slider-thumb {
         -webkit-appearance: none; appearance: none;
         width: 16px; height: 16px;
         background: #dde2e7; /* Light thumb */
         border-radius: 50%;
         border: 1px solid rgba(0,0,0,0.3);
         box-shadow: 0 1px 3px rgba(0,0,0,0.3);
         cursor: pointer;
         margin-top: -6px; /* Center thumb vertically on track */
     }
     input[type="range"]::-moz-range-thumb {
         width: 15px; height: 15px;
         background: #dde2e7;
         border-radius: 50%;
         border: 1px solid rgba(0,0,0,0.3);
         box-shadow: 0 1px 3px rgba(0,0,0,0.3);
         cursor: pointer;
     }
      input[type="range"]::-ms-thumb {
         width: 16px; height: 16px;
         background: #dde2e7;
         border-radius: 50%;
         border: 1px solid rgba(0,0,0,0.3);
         box-shadow: 0 1px 3px rgba(0,0,0,0.3);
         cursor: pointer;
         /* margin-top needed? */
     }


    /* --- Control Grids --- */
    .control-grid, .control-grid-small {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1em 1.5em; /* More spacing */
        align-items: start;
    }

    /* --- Mobile Adjustments --- */
    @media (max-width: 420px) {
        .kick-demo.compact { max-width: 96%; padding: 1em 0.8em; }
        .tabs button { font-size: 0.85em; padding: 0.5em 0.6em; }
        label { font-size: 0.8em; }
        .control-grid, .control-grid-small {
             grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Maybe 2 cols fit */
             gap: 0.8em 1em;
        }
        h2 { font-size: 1.4em; }
    }

</style>