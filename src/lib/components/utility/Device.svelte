<script lang="ts">
  import KickDrumDemo from '$lib/components/audio/KickDrum/KickDrumDemo.svelte';
  import DelayFX from '$lib/components/fx/DelayFX/DelayFX.svelte';
  import { audioContextStore } from '$lib/stores/audioStore';
  import { onMount, onDestroy } from 'svelte';
  import { removeDevice } from '$lib/stores/deviceStore';
  import type { Device as DeviceType } from '$lib/stores/deviceStore';

  export let device: DeviceType;
  export let inputNode: AudioNode | null = null;
  export let outputNode: AudioNode | null = null;

  let showFXOptions = false;
  let deviceSourceOutputNode: AudioNode | null = null;

  interface FXItem {
    type: string;
    component: any;
    props: { inputNode: AudioNode; outputNode: AudioNode };
    input: AudioNode;
    output: AudioNode;
  }

  let fxList: FXItem[] = [];

  // Reactive audio context subscription
  $: audioContext = $audioContextStore;

  function handleRemoveDevice() {
    removeDevice(device.id);
  }

  function addFX(type: string) {
    console.log('Adding FX:', type);
    if (!audioContext || !deviceSourceOutputNode) {
      console.error('Cannot add FX: audioContext or deviceSourceOutputNode is null', {
        audioContext,
        deviceSourceOutputNode
      });
      return;
    }

    const fxInputNode = audioContext.createGain();
    const fxOutputNode = audioContext.createGain();

    const previousOutput = fxList.length > 0 
      ? fxList[fxList.length - 1].output 
      : deviceSourceOutputNode;

    console.log('Previous output node:', previousOutput);

    try {
      if (outputNode) {
        previousOutput.disconnect(outputNode);
        console.log('Disconnected previous output from final output node');
      } else {
        previousOutput.disconnect();
        console.warn('OutputNode was null, attempting general disconnect');
      }
    } catch (e) {
      console.warn('Error disconnecting previous output:', e);
    }

    previousOutput.connect(fxInputNode);
    console.log('Connected previous output to new FX input');

    let fxComponent: any;
    if (type === 'DelayFX') {
      fxComponent = DelayFX;
    } else {
      console.error('Unknown FX type:', type);
      fxInputNode.disconnect();
      fxOutputNode.disconnect();
      if (outputNode) previousOutput.connect(outputNode);
      return;
    }

    const newFX: FXItem = {
      type,
      component: fxComponent,
      props: { inputNode: fxInputNode, outputNode: fxOutputNode },
      input: fxInputNode,
      output: fxOutputNode
    };

    console.log('Created new FX:', newFX);
    fxList = [...fxList, newFX];
    showFXOptions = false;
  }

  function removeFX(index: number) {
    const fx = fxList[index];
    if (!fx || !deviceSourceOutputNode) return;

    try {
      fx.input.disconnect();
      fx.output.disconnect();
    } catch(e) {
      console.warn('Error disconnecting FX:', e);
    }

    fxList = fxList.filter((_, i) => i !== index);
    
    // Reconnect the chain
    if (fxList.length === 0 && outputNode) {
      deviceSourceOutputNode.connect(outputNode);
    } else {
      for (let i = 0; i < fxList.length; i++) {
        const currentFx = fxList[i];
        const prevNode = i === 0 ? deviceSourceOutputNode : fxList[i - 1].output;
        const nextNode = i === fxList.length - 1 ? outputNode : fxList[i + 1].input;
        
        try {
          prevNode?.connect(currentFx.input);
          if (nextNode) currentFx.output.connect(nextNode);
        } catch(e) {
          console.warn('Error reconnecting FX chain:', e);
        }
      }
    }
  }

  function moveFX(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    
    const fx = fxList[fromIndex];
    if (!fx) return;

    // Remove FX from current position
    fxList = fxList.filter((_, i) => i !== fromIndex);
    
    // Insert at new position
    fxList = [
      ...fxList.slice(0, toIndex),
      fx,
      ...fxList.slice(toIndex)
    ];

    // Reconnect the chain
    if (deviceSourceOutputNode) {
      deviceSourceOutputNode.disconnect();
      if (fxList.length > 0) {
        deviceSourceOutputNode.connect(fxList[0].input);
      } else if (outputNode) {
        deviceSourceOutputNode.connect(outputNode);
      }

      for (let i = 0; i < fxList.length - 1; i++) {
        const currentFx = fxList[i];
        const nextFx = fxList[i + 1];
        currentFx.output.disconnect();
        currentFx.output.connect(nextFx.input);
      }

      if (fxList.length > 0 && outputNode) {
        const lastFx = fxList[fxList.length - 1];
        lastFx.output.disconnect();
        lastFx.output.connect(outputNode);
      }
    }
  }

  // Reactive audio routing
  $: {
    console.log('Reactivity triggered:', { deviceSourceOutputNode, fxListLength: fxList.length });
    if (deviceSourceOutputNode && audioContext) {
      const firstFxInput = fxList.length > 0 ? fxList[0].input : null;
      const lastFxOutput = fxList.length > 0 ? fxList[fxList.length - 1].output : null;

      deviceSourceOutputNode.disconnect();

      if (firstFxInput) {
        console.log('Connecting source to first FX:', firstFxInput);
        deviceSourceOutputNode.connect(firstFxInput);
        outputNode = lastFxOutput;
        console.log('Final output is last FX output:', outputNode);
      } else {
        console.log('Connecting source directly to final output');
        outputNode = deviceSourceOutputNode;
        console.log('Final output is source output:', outputNode);
      }

      // Connect FX chain
      for (let i = 0; i < fxList.length - 1; i++) {
        const currentFx = fxList[i];
        const nextFx = fxList[i + 1];
        currentFx.output.disconnect();
        currentFx.output.connect(nextFx.input);
        console.log(`Connected FX ${i} output to FX ${i + 1} input`);
      }
    } else {
      outputNode = null;
    }
  }

  onMount(() => {
    console.log('Device component mounted', device.id);
  });

  onDestroy(() => {
    console.log('Device component destroyed', device.id);
    if (deviceSourceOutputNode) {
      try { deviceSourceOutputNode.disconnect(); } catch(e) {/*ignore*/}
    }
    fxList.forEach(fx => {
      try { fx.input.disconnect(); } catch(e) {/*ignore*/}
      try { fx.output.disconnect(); } catch(e) {/*ignore*/}
    });
    outputNode = null;
    deviceSourceOutputNode = null;
  });
</script>

<div class="device">
  <div class="device-header drag-handle">
    <span>{device.type} ({device.id.substring(0,4)})</span>
    <button class="remove-btn" on:click={handleRemoveDevice}>×</button>
  </div>
  <div class="device-content">
    {#if device.type === 'KickDrumDemo'}
      <KickDrumDemo bind:outputNode={deviceSourceOutputNode} inputNode={inputNode ?? undefined} />
    {/if}
    <button on:click={() => showFXOptions = !showFXOptions} disabled={!deviceSourceOutputNode}>
      + FX
    </button>
  </div>
  <div class="fx-section">
    {#if showFXOptions}
      <div class="fx-options">
        <button on:click={() => addFX('DelayFX')}>Delay</button>
      </div>
    {/if}
    <div class="fx-chain">
      {#each fxList as fx, index (fx.input)}
        <div class="fx-item">
          <div class="fx-header">
            <span>{fx.type}</span>
            <div class="fx-controls">
              {#if index > 0}
                <button class="icon-btn" on:click={() => moveFX(index, index - 1)} title="Move Up">↑</button>
              {/if}
              {#if index < fxList.length - 1}
                <button class="icon-btn" on:click={() => moveFX(index, index + 1)} title="Move Down">↓</button>
              {/if}
              <button class="icon-btn remove" on:click={() => removeFX(index)} title="Remove">×</button>
            </div>
          </div>
          <svelte:component this={fx.component} {...fx.props} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .device {
    width: auto;
    background: #282c34;
    border: 1px solid rgba(97, 175, 239, 0.2);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #abb2bf;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(97, 175, 239, 0.1);
    border-bottom: 1px solid rgba(97, 175, 239, 0.2);
    border-radius: 8px 8px 0 0;
    cursor: grab;
  }

  .device-header span {
    font-weight: bold;
    font-size: 0.9em;
    color: #61afef;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #e06c75;
    font-size: 20px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
    padding: 0;
    line-height: 1;
  }

  .remove-btn:hover {
    background: rgba(224, 108, 117, 0.2);
    transform: scale(1.1);
  }

  .device-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fx-section {
    padding: 12px;
    border-top: 1px solid rgba(97, 175, 239, 0.1);
    background: rgba(40, 44, 52, 0.6);
    border-radius: 0 0 8px 8px;
  }

  .fx-options {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .fx-chain {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fx-item {
    background: rgba(40, 44, 52, 0.95);
    border: 1px solid rgba(97, 175, 239, 0.1);
    border-radius: 6px;
    padding: 12px;
    transition: all 0.2s ease;
  }

  .fx-item:hover {
    border-color: rgba(97, 175, 239, 0.3);
    box-shadow: 0 2px 8px rgba(97, 175, 239, 0.1);
  }

  .fx-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .fx-header span {
    font-size: 0.85em;
    color: #61afef;
    font-weight: 500;
  }

  .fx-controls {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #abb2bf;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    font-size: 14px;
  }

  .icon-btn:hover {
    background: rgba(97, 175, 239, 0.1);
    color: #61afef;
  }

  .icon-btn.remove {
    color: #e06c75;
  }

  .icon-btn.remove:hover {
    background: rgba(224, 108, 117, 0.1);
    color: #e06c75;
  }

  button {
    background: rgba(97, 175, 239, 0.1);
    border: 1px solid rgba(97, 175, 239, 0.2);
    color: #61afef;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  button:hover:not(:disabled) {
    background: rgba(97, 175, 239, 0.2);
    border-color: rgba(97, 175, 239, 0.3);
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>