<script>
    import { onMount, onDestroy } from 'svelte';
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

        // Assign the output node for the parent
        outputNode = mergerNode;

        // Setup internal routing
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode); // Feedback loop
        delayNode.connect(wetGain);
        wetGain.connect(mergerNode);
        dryGain.connect(mergerNode);

        // Update parameters initially
        updateDelayParams();

        // Connect input when it becomes available
        connectInput();

        console.log("DelayFX Mounted, output node:", outputNode);
    });

    onDestroy(() => {
        // --- Cleanup on Destroy ---
        console.log("DelayFX Destroyed");
        // Disconnect external input if connected
        if (inputNode && mergerNode) {
            try { inputNode.disconnect(dryGain); } catch(e){}
            try { inputNode.disconnect(delayNode); } catch(e){}
        }
        // Disconnect internal nodes safely
        try { delayNode?.disconnect(); } catch(e){}
        try { feedbackGain?.disconnect(); } catch(e){}
        try { wetGain?.disconnect(); } catch(e){}
        try { dryGain?.disconnect(); } catch(e){}
        // The mergerNode (outputNode) will be disconnected by the parent or AudioConnector
    });

    // Function to connect the inputNode prop to the internal graph
    function connectInput() {
        if (inputNode && dryGain && delayNode) {
            console.log("DelayFX: Connecting input -> ", inputNode);
            // Connect input to both dry path and wet path start
            inputNode.connect(dryGain);
            inputNode.connect(delayNode);
        }
    }

    // Function to disconnect the inputNode prop
    function disconnectInput() {
        if (inputNode && dryGain && delayNode) {
            console.log("DelayFX: Disconnecting input -> ", inputNode);
            try { inputNode.disconnect(dryGain); } catch(e){}
            try { inputNode.disconnect(delayNode); } catch(e){}
        }
    }

    // Reactive statement to handle inputNode changes
    $: if (inputNode && dryGain && delayNode) {
        connectInput();
    } else if (!inputNode && mergerNode) {
        // If inputNode becomes null, maybe disconnect is handled by parent removing us?
        // Or explicitly handle disconnection if needed.
        disconnectInput();
    }

    // Reactive updates for internal parameters
    $: if (delayNode && audioContext) delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
    $: if (feedbackGain && audioContext) feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
    $: if (wetGain && audioContext) wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
    $: if (dryGain && audioContext) dryGain.gain.setTargetAtTime(1.0 - mix, audioContext.currentTime, 0.01);

    // Helper to update all params (used onMount)
    function updateDelayParams() {
        if (!audioContext) return;
        if (delayNode) delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
        if (feedbackGain) feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
        if (wetGain) wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
        if (dryGain) dryGain.gain.setTargetAtTime(1.0 - mix, audioContext.currentTime, 0.01);
    }
</script>

<div class="fx-panel delay-fx">
    <h4>Delay</h4>
    <div class="control-group">
        <label for="delayTime-{outputNode?.id}">Time: {delayTime.toFixed(2)}s</label>
        <input type="range" id="delayTime-{outputNode?.id}" min="0.01" max="1.0" step="0.01" bind:value={delayTime}>
    </div>
    <div class="control-group">
        <label for="delayFeedback-{outputNode?.id}">Feedback: {feedback.toFixed(2)}</label>
        <input type="range" id="delayFeedback-{outputNode?.id}" min="0" max="0.95" step="0.01" bind:value={feedback}>
    </div>
    <div class="control-group">
        <label for="delayMix-{outputNode?.id}">Mix: {mix.toFixed(2)}</label>
        <input type="range" id="delayMix-{outputNode?.id}" min="0" max="1" step="0.01" bind:value={mix}>
    </div>
</div>

<style>
    .fx-panel {
        border: 1px solid #555;
        background-color: #3a3a3a;
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        color: #eee;
    }
    .control-group { margin-bottom: 8px; }
    label { font-size: 0.9em; display: block; margin-bottom: 3px;}
    input[type="range"] { width: 100%; }
    h4 { margin: 0 0 10px 0; text-align: center; color: #aaa;}
</style>
