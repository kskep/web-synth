<script lang="ts">
    import { writable } from 'svelte/store';
    import DraggableDevice from './DraggableDevice.svelte';
    import KickDrumDemo from './KickDrumDemo.svelte';

    type Device = {
        id: string;
        type: string;
        x: number;
        y: number;
        params: Record<string, any>;
    };

    // Store device states
    const devices = writable<Device[]>([
        { id: 'kick1', type: 'KickDrumDemo', x: 50, y: 50, params: {} },
    ]);

    function handleDeviceMove(event: CustomEvent<{ id: string; x: number; y: number }>) {
        const { id, x, y } = event.detail;
        devices.update(items =>
            items.map(d => (d.id === id ? { ...d, x, y } : d))
        );
    }

    function handleDeviceDragEnd(event: CustomEvent<{ id: string; x: number; y: number }>) {
        handleDeviceMove(event); // Update final position
    }
</script>

<div class="workspace">
    {#each $devices as device (device.id)}
        <DraggableDevice
            initialX={device.x}
            initialY={device.y}
            deviceId={device.id}
            on:move={handleDeviceMove}
            on:dragend={handleDeviceDragEnd}
        >
            {#if device.type === 'KickDrumDemo'}
                <KickDrumDemo />
            {/if}
        </DraggableDevice>
    {/each}
</div>

<style>
    .workspace {
        width: 200vw;
        height: 200vh;
        background-color: #22252a;
        background-image: radial-gradient(#444850 1px, transparent 1px);
        background-size: 20px 20px;
        position: relative;
        overflow: auto;
    }
</style>
