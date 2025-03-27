<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getAudioContext } from '$lib/stores/audioStore';

    export let inputNode: AudioNode | null = null;
    export let outputNode: AudioNode | null = null;

    // Internal state for delay parameters
    let delayTime = 0.3; // seconds
    let feedback = 0.5; // 0 to < 1
    let mix = 0.5; // 0 (dry) to 1 (wet)

    let delayNode: DelayNode | null = null;
    let feedbackGain: GainNode | null = null;
    let wetGain: GainNode | null = null;
    let dryGain: GainNode | null = null;
    let mergerNode: GainNode | null = null;
    
    const audioContext = getAudioContext();

    onMount(() => {
        console.log('DelayFX Mounted, input:', inputNode, 'output:', outputNode);
        if (!audioContext) {
            console.error("DelayFX: AudioContext not found!");
            return;
        }

        // Create internal nodes
        delayNode = audioContext.createDelay(1.0);
        feedbackGain = audioContext.createGain();
        wetGain = audioContext.createGain();
        dryGain = audioContext.createGain();
        mergerNode = audioContext.createGain();

        // Setup internal routing
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(wetGain);

        // Set initial parameters
        delayNode.delayTime.value = delayTime;
        feedbackGain.gain.value = feedback;
        wetGain.gain.value = mix;
        dryGain.gain.value = 1 - mix;

        // Connect to output if available
        if (outputNode) {
            wetGain.connect(mergerNode);
            dryGain.connect(mergerNode);
            mergerNode.connect(outputNode);
        }

        // Connect input if available
        if (inputNode) {
            inputNode.connect(dryGain);
            inputNode.connect(delayNode);
        }

        console.log('DelayFX: Audio nodes created and connected');
    });

    onDestroy(() => {
        console.log('DelayFX: Cleaning up nodes');
        if (delayNode) delayNode.disconnect();
        if (feedbackGain) feedbackGain.disconnect();
        if (wetGain) wetGain.disconnect();
        if (dryGain) dryGain.disconnect();
        if (mergerNode) mergerNode.disconnect();
    });

    // Update parameters when they change
    $: if (delayNode && audioContext) {
        delayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
    }

    $: if (feedbackGain && audioContext) {
        feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01);
    }

    $: if (wetGain && dryGain && audioContext) {
        wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01);
        dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01);
    }

    // Handle input/output node changes
    $: if (inputNode && dryGain && delayNode) {
        console.log('DelayFX: Connecting input node');
        inputNode.connect(dryGain);
        inputNode.connect(delayNode);
    }

    $: if (outputNode && mergerNode && wetGain && dryGain) {
        console.log('DelayFX: Connecting output node');
        wetGain.connect(mergerNode);
        dryGain.connect(mergerNode);
        mergerNode.connect(outputNode);
    }
</script>

<div class="fx-panel">
    <h2>Delay</h2>
    <div class="control-grid">
        <div class="control-group">
            <label for="delayTime">Time: {delayTime.toFixed(2)}s</label>
            <input 
                type="range" 
                id="delayTime" 
                min="0.01" 
                max="1.0" 
                step="0.01" 
                bind:value={delayTime}
            >
        </div>
        <div class="control-group">
            <label for="delayFeedback">Feedback: {feedback.toFixed(2)}</label>
            <input 
                type="range" 
                id="delayFeedback" 
                min="0" 
                max="0.95" 
                step="0.01" 
                bind:value={feedback}
            >
        </div>
        <div class="control-group">
            <label for="delayMix">Mix: {mix.toFixed(2)}</label>
            <input 
                type="range" 
                id="delayMix" 
                min="0" 
                max="1" 
                step="0.01" 
                bind:value={mix}
            >
        </div>
    </div>
</div>

<style>
    .fx-panel {
        font-family: sans-serif;
        padding: 1.2em 1.5em;
        background: rgba(40, 44, 52, 0.95);
        color: #abb2bf;
        border-radius: 8px;
        width: 100%;
        box-sizing: border-box;
    }
    
    h2 {
        margin: 0 0 1em 0;
        font-size: 1.1em;
        color: #61afef;
    }
    
    .control-grid {
        display: grid;
        gap: 12px;
    }
    
    .control-group { 
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    label {
        font-size: 0.85em;
        color: #abb2bf;
    }

    input[type="range"] {
        width: 100%;
        height: 4px;
        background: linear-gradient(to right, #61afef, #c678dd);
        border-radius: 2px;
        -webkit-appearance: none;
        appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        background: #fff;
        border-radius: 50%;
        cursor: pointer;
    }

    input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: #fff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
    }
</style>
