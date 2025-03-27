--- a/src/lib/components/utility/Device.svelte
+++ b/src/lib/components/utility/Device.svelte
--- a/src/lib/components/utility/Device.svelte
+++ b/src/lib/components/utility/Device.svelte
<script lang="ts">
  import KickDrumDemo from '$lib/components/audio/KickDrum/KickDrumDemo.svelte';
  import DelayFX from '$lib/components/fx/DelayFX/DelayFX.svelte';
  import { getAudioContext } from '$lib/stores/audioStore';
  import { onMount, onDestroy } from 'svelte';

  export let device;
  export let inputNode: AudioNode | null = null;
  export let outputNode: AudioNode | null = null;

  let showFXOptions = false;
  let fxList: { type: string, instance: any, input: AudioNode, output: AudioNode }[] = [];
  let deviceOutputNode: AudioNode | null = null

  const audioContext = getAudioContext();

  $: {
    if(fxList.length > 0) {
      outputNode = fxList[fxList.length - 1].output
    } else {
      outputNode = deviceOutputNode
    }
  }

  onMount(() => {
    if (!audioContext) return;

    const gainNode = audioContext.createGain();
    deviceOutputNode = gainNode;
    if (inputNode) {
      inputNode.connect(deviceOutputNode)
    }
  });

  onDestroy(() => {
    if (inputNode) {
      inputNode.disconnect(deviceOutputNode);
    }
    fxList.forEach(fx => {
      fx.input.disconnect(fx.output)
    })
  })

  function handleAddFXClick() {
    showFXOptions = !showFXOptions;
  }

  function addFX(type: string) {
    showFXOptions = false;
    if (!audioContext) return;
    if (type === 'DelayFX') {
      const input = audioContext.createGain();
      const output = audioContext.createGain();

      let previousOutput = deviceOutputNode;
      if(fxList.length > 0) {
        previousOutput = fxList[fxList.length-1].output;
      }
      const fx = new DelayFX({
        target: document.body,
        props: {
          inputNode: input,
          outputNode: output,
        },
      });
      previousOutput?.connect(input);
      fxList = [...fxList, { type, instance: fx, input, output }];
    }
  }
</script>

<div class="device">
  {#if device.type === 'KickDrumDemo'}
    <KickDrumDemo bind:outputNode={deviceOutputNode} inputNode={inputNode} />
  {/if}
  <div class="controls">
    <button on:click={handleAddFXClick}>+ FX</button>
    {#if showFXOptions}
      <div class="fx-options">
        <button on:click={() => addFX('DelayFX')}>Delay</button>
      </div>
    {/if}
  </div>
  {#each fxList as fx, index (index)}
    <svelte:component this={fx.instance} />
  {/each}
</div>

<style>
  .device {
    font-family: sans-serif;
    padding: 1.2em 1.5em; /* Slightly more padding */
    background-image: linear-gradient(145deg, #3a404b 0%, #282c34 70%);
    color: #abb2bf; /* Light text */
    border-radius: 10px; /* Slightly larger radius */
    max-width: 400px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.1); /* Enhanced shadow */
    border: 1px solid #4b5263; /* Subtle border */
  }
  .controls {
    display: flex;
    gap: 10px;
  }
  .fx-options {
    position: absolute;
    background-color: #282c34;
    border: 1px solid #4b5263;
    border-radius: 5px;
    padding: 5px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  button{
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
</style>
<script>
  function handleAddFXClick() {
    console.log('clicked');
  }
</script>

<div class="device">
  <slot />
  <button on:click={handleAddFXClick}>+ FX</button>
</div>

<style>
  .device {
    border: 1px solid white;
    padding: 10px;
    background-color: #222;
    color: white;
  }
</style>