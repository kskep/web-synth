<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { audioContextStore } from '$lib/stores/audioStore';
    import DraggableDevice from '$lib/components/utility/DraggableDevice.svelte';
    import Device from '$lib/components/utility/Device.svelte';
    import KickDrumDemo from '$lib/components/audio/KickDrum/KickDrumDemo.svelte';
    import { devices as devicesStore, type Device as DeviceType, addDevice } from '$lib/stores/deviceStore';
    import { v4 as uuidv4 } from 'uuid'

    // --- Audio Context Setup ---
    let audioCtx: AudioContext | undefined;
    const unsubscribeAudio = audioContextStore.subscribe(value => {
        audioCtx = value;
    });

    // Determine the final node to connect to destination

    // Handle device movement
    function handleDeviceMove(event: CustomEvent<{ deviceId: string; x: number; y: number }>) {
        const { deviceId, x, y } = event.detail;
        devicesStore.update((devices: Device[]) => 
            devices.map(d => d.id === deviceId ? { ...d, x, y } : d)
        );
    }

    function handleDeviceDragEnd(event: CustomEvent<{ deviceId: string; x: number; y: number }>) {
        // Save device positions to storage or state management
        const { deviceId, x, y } = event.detail;
        devicesStore.update((devices: Device[]) => 
            devices.map(d => d.id === deviceId ? { ...d, x, y } : d)
        );
    }

    // Pan and zoom state
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    function handleMouseDown(event: MouseEvent) {
        if (event.button === 1 || (event.button === 0 && event.altKey)) { // Middle click or Alt+Left click
            isPanning = true;
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
        }
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isPanning) return;
        
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        
        panX += dx;
        panY += dy;
        
        lastX = event.clientX;
        lastY = event.clientY;
    }

    function handleMouseUp() {
        isPanning = false;
    }

    function handleWheel(event: WheelEvent & { currentTarget: HTMLElement }) {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const delta = event.deltaY * -0.01
            const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
            
            // Zoom around mouse position
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            const oldZoom = zoom;
            zoom = newZoom;
            
            // Adjust pan to keep the point under mouse fixed
            panX = mouseX - (mouseX - panX) * (newZoom / oldZoom);
            panY = mouseY - (mouseY - panY) * (newZoom / oldZoom);
        }
    }

    onDestroy(() => {
        unsubscribeAudio();
    });
</script>

<svelte:window on:mouseup={handleMouseUp} on:mousemove={handleMouseMove} />

<button class="workspace-viewport" 
    on:mousedown={handleMouseDown}
    on:wheel={handleWheel}
    aria-label="Web Synth Workspace">
    <div class="workspace-canvas" 
        style="transform: translate({panX}px, {panY}px) scale({zoom});">
        {#each $devicesStore as device (device.id)}
            <DraggableDevice
                initialX={device.x}
                initialY={device.y}
                deviceId={device.id}
                currentPanX={panX}
                currentPanY={panY}
                currentZoom={zoom}
                on:move={handleDeviceMove}
                on:dragend={handleDeviceDragEnd}
            >   
                <Device device={device}>
                    {#if device.type === 'KickDrumDemo'}
                        <KickDrumDemo />
                    {/if}
                </Device>
            </DraggableDevice>
        {/each}
    </div>
</button>

{#if audioCtx?.destination}
    
{/if}

<div class="controls-panel">
    <button on:click={() => addDevice({id: uuidv4(), x: 0, y: 0, type: 'KickDrumDemo'})}>+ Add Device</button>
</div>






<style>
    .workspace-viewport {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: #1e1e1e;
        position: relative;
        outline: none;
        border: none;
        padding: 0;
        margin: 0;
        cursor: default;
        display: block;
    }

    .workspace-canvas {
        width: 100%;
        height: 100%;
        position: absolute;
        transform-origin: 0 0;
        pointer-events: none;
    }

    .workspace-canvas :global(*) {
        pointer-events: auto;
    }

    .controls-panel {
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: #222;
        padding: 10px;
        border-radius: 5px;
        z-index: 100;
        color: white;
    }

    label {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    input[type="checkbox"] {
        margin: 0;
    }
</style>
