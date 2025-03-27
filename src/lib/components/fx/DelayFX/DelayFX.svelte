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
    
    const audioContext = getAudioContext();

    onMount(() => {
        if (!audioContext) {
            console.error("DelayFX: AudioContext not found!");
            return;
        }

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
        updateNodeOutput();
        updateDelayParams();

        // Connect input when it becomes available
        connectInput();

        console.log("DelayFX Mounted, output node:", outputNode);
    });

    onDestroy(() => {
        // --- Cleanup on Destroy ---
        console.log("DelayFX Destroyed");
        disconnectInput();
        disconnectOutput();
        // Disconnect internal nodes safely
        try { delayNode?.disconnect(); } catch(e){}
        try { feedbackGain?.disconnect(); } catch(e){}
        try { wetGain?.disconnect(); } catch(e){}
        try { dryGain?.disconnect(); } catch(e){}
        try { mergerNode?.disconnect(); } catch(e){}
    });

    // Function to connect the inputNode prop to the internal graph
    function connectInput() {
        if (!inputNode || !dryGain || !delayNode) return;
        console.log("DelayFX: Connecting input -> ", inputNode);
        inputNode.connect(dryGain);
        inputNode.connect(delayNode);
    }

    function updateNodeOutput(){
        if(outputNode && mergerNode && wetGain && dryGain){
            wetGain.connect(mergerNode);
            dryGain.connect(mergerNode);
            mergerNode.connect(outputNode);
        }
    }

    function disconnectOutput(){
        if(outputNode && mergerNode && wetGain && dryGain){
            try{wetGain.disconnect(mergerNode);} catch(e){}
            try{dryGain.disconnect(mergerNode);} catch(e){}
            try{mergerNode.disconnect(outputNode);} catch(e){}
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
    
    // Reactive statement for output node
    $: if(outputNode) {
        updateNodeOutput();
    }
    
    // Reactive statements for parameters
    $: if(audioContext && delayNode) {
        delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
    }
    $: if(audioContext && feedbackGain) {
        feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
    }
    $: if(audioContext && wetGain) {
        wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
    }
    $: if(audioContext && dryGain) {
        dryGain.gain.setTargetAtTime(1.0 - mix, audioContext.currentTime, 0.01);
    }

    // Helper to update all params (used onMount)
    function updateDelayParams() {
        if (!audioContext) return;
        if (delayNode) delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
        if (feedbackGain) feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
        if (wetGain) wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
        if (dryGain) dryGain.gain.setTargetAtTime(1.0 - mix, audioContext.currentTime, 0.01);
    }
</script>

<div class="fx-panel">
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
</div>

<style>
    .fx-panel {
        border: 1px solid #555;
        font-family: sans-serif;
        padding: 1.2em 1.5em;
        background-image: linear-gradient(145deg, #3a404b 0%, #282c34 70%);
        color: #abb2bf;
        border-radius: 10px;
        max-width: 400px;
        margin: 1.5em auto;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.1);
        border: 1px solid #4b5263;
    }
    
    h2 {
        background: linear-gradient(90deg, #61afef, #c678dd);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        text-align: center;
        margin-bottom: 1em;
        font-weight: 600;
    }
    
    .control-group { 
        margin-bottom: 1em; 
    }
    
    label {
        display: block;
        font-size: 0.85em;
        margin-bottom: 0.4em;
        color: #abb2bf;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }
    input[type="range"] {
        width: 100%;
        cursor: pointer;
        height: 5px;
        margin-top: 4px;
        background: linear-gradient(to right, #61afef, #c678dd);
        border-radius: 3px;
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        border: 1px solid rgba(0,0,0,0.2);
    }
    
    .control-grid-small {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1em 1.5em;
        align-items: start;
    }

    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #dde2e7;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.3);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        cursor: pointer;
        margin-top: -6px;
    }
    
    input[type="range"]::-moz-range-thumb {
        width: 15px;
        height: 15px;
        background: #dde2e7;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.3);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        cursor: pointer;
    }
    
    input[type="range"]::-ms-thumb {
        width: 16px;
        height: 16px;
        background: #dde2e7;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.3);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        cursor: pointer;
    }
    
    @media (max-width: 420px) {
        .fx-panel { 
            max-width: 96%; 
            padding: 1em 0.8em; 
        }
        
        label { 
            font-size: 0.8em; 
        }
        
        .control-grid-small {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.8em 1em;
        }
        
        h2 { 
            font-size: 1.4em; 
        }
    }
</style>
