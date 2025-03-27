<script lang="ts">
  import KickDrumDemo from '$lib/components/audio/KickDrum/KickDrumDemo.svelte';
  import DelayFX from '$lib/components/fx/DelayFX/DelayFX.svelte';
  import { getAudioContext } from '$lib/stores/audioStore';
  import { onMount, onDestroy, type SvelteComponent } from 'svelte';
  import { removeDevice } from '$lib/stores/deviceStore';
  import type { Device as DeviceType } from '$lib/stores/deviceStore';

  export let device: DeviceType;
  export let inputNode: AudioNode | null = null;
  export let outputNode: AudioNode | null = null; // This component's final output

  let showFXOptions = false;

  // Store component type and props for declarative rendering
  interface FXItem {
    type: string;
    component: any;
    props: { inputNode: AudioNode; outputNode: AudioNode };
    input: AudioNode;
    output: AudioNode;
  }

  let fxList: FXItem[] = [];
  let deviceOutputNode: AudioNode | null = null; // The output of the core device (e.g., KickDrumDemo)

  const audioContext = getAudioContext();

  function handleRemoveDevice() {
    removeDevice(device.id);
  }

  function addFX(type: string) {
    console.log('Adding FX:', type);
    if (!audioContext || !deviceOutputNode) {
      console.error('Cannot add FX: audioContext or deviceOutputNode is null');
      return;
    }

    // Create nodes for the new FX
    const fxInputNode = audioContext.createGain();
    const fxOutputNode = audioContext.createGain();

    // Get the previous output node (either the last FX or the device output)
    const previousOutput = fxList.length > 0 ? fxList[fxList.length - 1].output : deviceOutputNode;
    console.log('Previous output node:', previousOutput);

    // Disconnect the previous output from whatever it was connected to
    try {
      previousOutput.disconnect();
    } catch (e) {
      console.warn('Error disconnecting previous output:', e);
    }

    // Connect the previous output to the new FX input
    previousOutput.connect(fxInputNode);
    console.log('Connected previous output to FX input');

    const newFX: FXItem = {
      type,
      component: DelayFX,
      props: { inputNode: fxInputNode, outputNode: fxOutputNode },
      input: fxInputNode,
      output: fxOutputNode,
    };

    console.log('Created new FX:', newFX);
    fxList = [...fxList, newFX];
    // Update the final output node
    outputNode = fxOutputNode;
    showFXOptions = false;
  }

  // Update audio routing when deviceOutputNode changes
  $: if (deviceOutputNode) {
    console.log('deviceOutputNode changed:', deviceOutputNode);
    if (fxList.length > 0) {
      // Connect device output to first FX
      deviceOutputNode.disconnect();
      deviceOutputNode.connect(fxList[0].input);
      console.log('Connected device output to first FX');
    } else {
      // If no FX, device output is the final output
      outputNode = deviceOutputNode;
      console.log('Set device output as final output');
    }
  }

  // Update audio routing when fxList changes
  $: if (fxList.length > 0 && deviceOutputNode) {
    console.log('fxList changed, length:', fxList.length);
    // Connect device output to first FX
    deviceOutputNode.disconnect();
    deviceOutputNode.connect(fxList[0].input);
    // The last FX's output becomes the final output
    outputNode = fxList[fxList.length - 1].output;
    console.log('Updated FX chain connections');
  }

  onMount(() => {
    console.log('Device component mounted');
    if (!audioContext) return;
    const gainNode = audioContext.createGain();
    deviceOutputNode = gainNode;
    outputNode = deviceOutputNode;
    console.log('Initial audio nodes created');
  });

  onDestroy(() => {
    // Clean up audio nodes
    if (deviceOutputNode) {
      deviceOutputNode.disconnect();
    }
    if (outputNode) {
      outputNode.disconnect();
    }
    fxList.forEach(fx => {
      fx.input.disconnect();
      fx.output.disconnect();
    });
    console.log('Device component destroyed, cleaned up audio nodes');
  });
</script>

<div class="device">
  <div class="device-header">
    <button class="remove-btn" on:click={handleRemoveDevice}>×</button>
  </div>
  <div class="device-content">
    {#if device.type === 'KickDrumDemo'}
      <KickDrumDemo bind:outputNode={deviceOutputNode} inputNode={inputNode ?? undefined} />
    {/if}
    <button on:click={() => showFXOptions = !showFXOptions}>+ FX</button>
  </div>
  <div class="fx-section">
    {#if showFXOptions}
      <div class="fx-options">
        <button on:click={() => addFX('DelayFX')}>Delay</button>
      </div>
    {/if}
    <div class="fx-chain">
      {#each fxList as fx (fx.input)}
        <div class="fx-item">
          <svelte:component this={fx.component} {...fx.props} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .device {
    background: rgba(40, 44, 52, 0.95);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .device-header {
    display: flex;
    justify-content: flex-end;
    padding: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .remove-btn {
    background: none;
    border: none;
    color: #ff4444;
    font-size: 20px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .remove-btn:hover {
    background: rgba(255, 68, 68, 0.2);
  }

  .device-content {
    padding: 16px;
  }

  .fx-section {
    padding: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .fx-options {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .fx-chain {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fx-item {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 8px;
  }

  button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
</style>