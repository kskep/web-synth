<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { audioContextStore, isAudioInitialized, initializeAudio } from '$lib/stores/audioStore';
    import DraggableDevice from '$lib/components/utility/DraggableDevice.svelte';
    import Device from '$lib/components/utility/Device.svelte';
    import { devices as devicesStore, type Device as DeviceType, addDevice } from '$lib/stores/deviceStore';
    import { v4 as uuidv4 } from 'uuid'

    // --- Audio Context Setup ---
    let audioCtx: AudioContext | undefined;
    const unsubscribeAudio = audioContextStore.subscribe(value => {
        audioCtx = value;
    });

    function addNewDevice() {
        const newDevice: DeviceType = {
            id: uuidv4(),
            type: 'KickDrumDemo',
            x: 100,
            y: 100,
            params: {}
        };
        addDevice(newDevice);
    }

    // Pan and zoom state
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    function handleMouseDown(event: MouseEvent) {
        if (event.button === 1 || (event.button === 0 && event.altKey)) {
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

    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const oldZoom = zoom;
        const newZoom = zoom * (1 - event.deltaY * 0.001);
        zoom = Math.max(0.1, Math.min(5, newZoom));
        
        if (oldZoom !== zoom) {
            // Adjust pan to keep the point under mouse fixed
            panX = mouseX - (mouseX - panX) * (newZoom / oldZoom);
            panY = mouseY - (mouseY - panY) * (newZoom / oldZoom);
        }
    }

    // Handle device movement
    function handleDeviceMove(event: CustomEvent<{ deviceId: string; x: number; y: number }>) {
        const { deviceId, x, y } = event.detail;
        devicesStore.update(devices => 
            devices.map(d => d.id === deviceId ? { ...d, x, y } : d)
        );
    }

    function handleDeviceDragEnd(event: CustomEvent<{ deviceId: string; x: number; y: number }>) {
        const { deviceId, x, y } = event.detail;
        devicesStore.update(devices => 
            devices.map(d => d.id === deviceId ? { ...d, x, y } : d)
        );
    }

    onDestroy(() => {
        unsubscribeAudio();
    });
</script>

<svelte:window on:mouseup={handleMouseUp} on:mousemove={handleMouseMove} />

<div class="workspace-viewport" 
    on:mousedown={handleMouseDown}
    on:wheel={handleWheel}
    role="region"
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
                <Device {device} outputNode={audioCtx?.destination} />
            </DraggableDevice>
        {/each}
    </div>
</div>

<div class="controls-panel">
    <button on:click={addNewDevice}>+ Add Device</button>
    {#if !$isAudioInitialized}
        <button on:click={initializeAudio}>Initialize Audio</button>
    {/if}
</div>

<style>
    .workspace-viewport {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: #1e2127;
        position: relative;
        cursor: default;
    }

    .workspace-canvas {
        width: 100%;
        height: 100%;
        position: absolute;
        transform-origin: 0 0;
    }

    .controls-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        display: flex;
        gap: 10px;
    }

    .controls-panel button {
        background: #61afef;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .controls-panel button:hover {
        background: #528bbd;
        transform: translateY(-1px);
    }

    .controls-panel button:active {
        transform: translateY(0);
    }
</style>
