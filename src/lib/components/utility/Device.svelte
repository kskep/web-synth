
<script lang="ts">
  import KickDrumDemo from '$lib/components/audio/KickDrum/KickDrumDemo.svelte';
  import DelayFX from '$lib/components/fx/DelayFX/DelayFX.svelte';
  import { getAudioContext } from '$lib/stores/audioStore';
  import { onMount, onDestroy, type SvelteComponent } from 'svelte';

  export let device;
  export let inputNode: AudioNode | null = null;
  export let outputNode: AudioNode | null = null; // This component's final output

  let showFXOptions = false;
  // Store component type and props for declarative rendering
  let fxList: {
    type: string;
    component: typeof SvelteComponent; // Store the component constructor/type
    props: { inputNode: AudioNode; outputNode: AudioNode };
    input: AudioNode; // Input node for this FX stage
    output: AudioNode; // Output node for this FX stage
  }[] = [];
  let deviceOutputNode: AudioNode | null = null; // The output of the core device (e.g., KickDrumDemo)

  const audioContext = getAudioContext();

  // Reactive statement to update the component's final outputNode
  $: {
    if (fxList.length > 0) {
      // The final output is the output of the last FX in the chain
      outputNode = fxList[fxList.length - 1].output;
    } else {
      // If no FX, the final output is the device's direct output
      outputNode = deviceOutputNode;
    }
    // console.log("Device output node updated:", outputNode); // For debugging
  }

  onMount(() => {
    if (!audioContext) return;

    // Create the initial output node for the core device
    const gainNode = audioContext.createGain();
    deviceOutputNode = gainNode;
    // Connect the external input (if any) to the core device's output node
    // This seems potentially incorrect based on typical audio routing.
    // KickDrumDemo likely generates sound internally and connects to its bound outputNode.
    // If inputNode represents audio *entering* this Device component, it should
    // probably connect to the *first* node in the chain (either deviceOutputNode if no FX,
    // or the input of the first FX).
    // Let's adjust this: connect inputNode to the start of the chain.
    if (inputNode) {
        const firstNode = fxList.length > 0 ? fxList[0].input : deviceOutputNode;
        if (firstNode) {
            try {
                inputNode.connect(firstNode);
            } catch (e) {
                console.error("Error connecting inputNode in onMount:", e);
            }
        }
    }
  });

  // Reactive connection for inputNode when fxList changes
  $: {
      if (inputNode) {
          try {
              inputNode.disconnect(); // Disconnect from previous target
          } catch(e) { /* Ignore if not connected */ }

          const firstNode = fxList.length > 0 ? fxList[0].input : deviceOutputNode;
          if (firstNode) {
              try {
                  inputNode.connect(firstNode);
              } catch (e) {
                  console.error("Error connecting inputNode reactively:", e);
              }
          }
      }
  }


  onDestroy(() => {
    // Disconnect external input node if it exists
    if (inputNode) {
        try {
            inputNode.disconnect();
        } catch (e) {
            // console.warn("Error disconnecting input node:", e); // Often expected if not connected
        }
    }
    // Disconnect the core device's output
    if (deviceOutputNode) {
        try {
            deviceOutputNode.disconnect();
        } catch (e) {
            console.warn("Error disconnecting device output node:", e);
        }
    }
    // Disconnect all FX nodes
    fxList.forEach(fx => {
      try {
        fx.input.disconnect(); // Disconnect input from previous stage
        fx.output.disconnect(); // Disconnect output from next stage (if any)
      } catch (e) {
        console.warn("Error disconnecting FX node:", e);
      }
    });
  });

  function handleAddFXClick() {
    showFXOptions = !showFXOptions;
  }

  function addFX(type: string) {
    showFXOptions = false;
    if (!audioContext) return;

    if (type === 'DelayFX') {
      const fxInputNode = audioContext.createGain();
      const fxOutputNode = audioContext.createGain();

      // Determine the node to connect *to* the new FX's input
      let previousStageOutput: AudioNode | null = null;
      if (fxList.length > 0) {
        // If there are existing FX, connect from the last FX's output
        previousStageOutput = fxList[fxList.length - 1].output;
      } else {
        // If this is the first FX, connect from the core device's output
        previousStageOutput = deviceOutputNode;
      }

      // Connect the previous stage to the new FX's input
      if (previousStageOutput) {
        try {
          previousStageOutput.disconnect(); // Disconnect previous stage from whatever it was connected to
          previousStageOutput.connect(fxInputNode); // Connect previous stage to the new FX input
        } catch (e) {
          console.warn("Error connecting previous stage to new FX:", e);
        }
      }

      // Prepare props for the new FX component
      const fxProps = { inputNode: fxInputNode, outputNode: fxOutputNode };

      // Add the new FX details to the list for declarative rendering
      // This triggers the reactive updates for connections and outputNode
      fxList = [
        ...fxList,
        {
          type,
          component: DelayFX, // Store the component type/constructor
          props: fxProps,
          input: fxInputNode,
          output: fxOutputNode,
        },
      ];
    }
  }
 </script>
 
 <div class="device">
   {#if device.type === 'KickDrumDemo'}
     <!-- Pass deviceOutputNode (as undefined if null) to KickDrumDemo -->
     <!-- KickDrumDemo should internally connect its source to this outputNode -->
     <KickDrumDemo bind:outputNode={deviceOutputNode} inputNode={inputNode ?? undefined} />
   {/if}
   <div class="controls">
     <button on:click={handleAddFXClick}>+ FX</button>
     {#if showFXOptions}
       <div class="fx-options">
         <button on:click={() => addFX('DelayFX')}>Delay</button>
       </div>
     {/if}
   </div>
   {#each fxList as fx (fx.input)} <!-- Use a unique key like the input node -->
     <!-- Render the FX component declaratively -->
     <svelte:component this={fx.component} {...fx.props} />
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