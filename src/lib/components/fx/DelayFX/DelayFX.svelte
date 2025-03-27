<script>
    import { onMount, onDestroy, tick } from 'svelte';
    import { getAudioContext } from '$lib/stores/audioStore';

    /** @type {AudioNode | null} */
    export let inputNode = null; // Input AudioNode (passed as prop)
    /** @type {AudioNode | null} */
    export let outputNode = null; // Output AudioNode (bound from parent)

    // Internal state for delay parameters
    let delayTime = 0.3; // seconds
    let feedback = 0.5; // 0 to < 1
    let mix = 0.5; // 0 (dry) to 1 (wet)

    /** @type {DelayNode | null} */
    let delayNode = null;
    /** @type {GainNode | null} */
    let feedbackGain = null;
    /** @type {GainNode | null} */
    let wetGain = null;
    /** @type {GainNode | null} */
    let dryGain = null;
    /** @type {GainNode | null} */
    let mergerNode = null; // This will be the final output node
     /** @type {AudioContext | undefined} */
    let audioContext = undefined;

    
    const audioContext = getAudioContext();

    onMount(() => {
        if (!audioContext) {
            console.error("DelayFX: AudioContext not found!");
            return;
        }

         audioContext = getAudioContext();
        // Create internal nodes
        delayNode = audioContext.createDelay(1.0); // Max 1 sec delay
        feedbackGain = audioContext.createGain();
        wetGain = audioContext.createGain();
        dryGain = audioContext.createGain();
        mergerNode = audioContext.createGain(); // Simple merger using gain node

        // Setup internal routing
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode); // Feedback loop
        delayNode.connect(wetGain);
        



        // Update parameters initially
        updateNodeOutput()
        updateDelayParams();

        // Connect input when it becomes available
        connectInput();

        console.log("DelayFX Mounted, output node:", outputNode);
    });

    onDestroy(() => {
        // --- Cleanup on Destroy ---
        console.log("DelayFX Destroyed");
        disconnectInput()
        disconnectOutput()
        // Disconnect internal nodes safely
        try { delayNode?.disconnect(); } catch(e){}
        try { feedbackGain?.disconnect(); } catch(e){}
        try { wetGain?.disconnect(); } catch(e){}
        try { dryGain?.disconnect(); } catch(e){}
        try { mergerNode?.disconnect(); } catch(e){}
    });

    // Function to connect the inputNode prop to the internal graph
    function connectInput() {
         if (!inputNode || !dryGain || !delayNode) return
            console.log("DelayFX: Connecting input -> ", inputNode);
            inputNode.connect(dryGain);
            inputNode.connect(delayNode);
    }

    function updateNodeOutput(){
        if(outputNode && mergerNode && wetGain && dryGain){
            wetGain.connect(mergerNode);
            dryGain.connect(mergerNode)
            mergerNode.connect(outputNode)
        }
    }

    function disconnectOutput(){
        if(outputNode && mergerNode && wetGain && dryGain){
            try{wetGain.disconnect(mergerNode)} catch(e){}
            try{dryGain.disconnect(mergerNode)} catch(e){}
            try{mergerNode.disconnect(outputNode)} catch(e){}
        }
    }

    // Function to disconnect the inputNode prop
    function disconnectInput() {
        if (inputNode && dryGain && delayNode) {
            console.log("DelayFX: Disconnecting input -> ", inputNode);
            try { inputNode.disconnect(delayNode); } catch (e) { }
            try { inputNode.disconnect(dryGain); } catch (e) { }
           
        }
    }

    // Reactive statement to handle inputNode changes
    $: if(audioContext && inputNode && dryGain && delayNode){
        disconnectInput();
        connectInput();
    }
    $: updateNodeOutput();
    $: if(audioContext)updateDelayParams();

    // Helper to update all params (used onMount)
    function updateDelayParams() {
        if (!audioContext) return;
        if (delayNode) delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
        if (feedbackGain) feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
        if (wetGain) wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
        if (dryGain) dryGain.gain.setTargetAtTime(1.0 - mix, audioContext.currentTime, 0.01);
    }
</script>

<div class="fx-panel ">
    <h2>Delay</h2>
    <div class="control-grid-small">
    <div class="control-group">
        <label for="delayTime">Time: {delayTime.toFixed(2)}s</label>
        <input type="range" id="delayTime" min="0.01" max="1.0" step="0.01" bind:value={delayTime}>
    </div>
    <div class="control-group">
        <label for="delayFeedback">Feedback: {feedback.toFixed(2)}</label>
        <input type="range" id="delayFeedback" min="0" max="0.95" step="0.01" bind:value={feedback}>
    </div>
    <div class="control-group">
        <label for="delayMix">Mix: {mix.toFixed(2)}</label>
        <input type="range" id="delayMix" min="0" max="1" step="0.01" bind:value={mix}>
    </div>
</div>

<style>
    .fx-panel {
        border: 1px solid #555;
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
    .control-grid-small {\n        display: grid;\n        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n        gap: 1em 1.5em; /* More spacing */\n        align-items: start;\n    }
    input[type="range"]::-webkit-slider-thumb {\n         -webkit-appearance: none; appearance: none;\n         width: 16px; height: 16px;\n         background: #dde2e7; /* Light thumb */\n         border-radius: 50%;\n         border: 1px solid rgba(0,0,0,0.3);\n         box-shadow: 0 1px 3px rgba(0,0,0,0.3);\n         cursor: pointer;\n         margin-top: -6px; /* Center thumb vertically on track */\n     }
     input[type="range"]::-moz-range-thumb {\n         width: 15px; height: 15px;\n         background: #dde2e7;\n         border-radius: 50%;\n         border: 1px solid rgba(0,0,0,0.3);\n         box-shadow: 0 1px 3px rgba(0,0,0,0.3);\n         cursor: pointer;\n     }
      input[type="range"]::-ms-thumb {\n         width: 16px; height: 16px;\n         background: #dde2e7;\n         border-radius: 50%;\n         border: 1px solid rgba(0,0,0,0.3);\n         box-shadow: 0 1px 3px rgba(0,0,0,0.3);\n         cursor: pointer;\n         /* margin-top needed? */\n     }
      @media (max-width: 420px) {\n        .fx-panel { max-width: 96%; padding: 1em 0.8em; }\n        label { font-size: 0.8em; }\n        .control-grid-small {\n             grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Maybe 2 cols fit */\n             gap: 0.8em 1em;\n        }\n        h2 { font-size: 1.4em; }\n    }\n\n
</style>
