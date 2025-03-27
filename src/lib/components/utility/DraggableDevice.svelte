<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';

    export let initialX = 0;
    export let initialY = 0;
    export let deviceId = '';
    export let currentPanX = 0;
    export let currentPanY = 0;
    export let currentZoom = 1;

    const dispatch = createEventDispatcher();

    let isDragging = false;
    let currentX = initialX;
    let currentY = initialY;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let element: HTMLElement;

    onMount(() => {
        currentX = initialX;
        currentY = initialY;
    });

    function viewportToCanvas(clientX: number, clientY: number) {
        const rect = element.parentElement!.getBoundingClientRect();
        const viewportX = clientX - rect.left;
        const viewportY = clientY - rect.top;
        return {
            x: (viewportX - currentPanX) / currentZoom,
            y: (viewportY - currentPanY) / currentZoom
        };
    }

    function handleMouseDown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.drag-handle')) return;

        isDragging = true;
        const canvasMousePos = viewportToCanvas(event.clientX, event.clientY);
        dragOffsetX = canvasMousePos.x - currentX;
        dragOffsetY = canvasMousePos.y - currentY;

        element.style.zIndex = '1000';
        event.preventDefault();
        event.stopPropagation();
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isDragging) return;

        const canvasMousePos = viewportToCanvas(event.clientX, event.clientY);
        currentX = canvasMousePos.x - dragOffsetX;
        currentY = canvasMousePos.y - dragOffsetY;

        dispatch('move', { deviceId, x: currentX, y: currentY });
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        element.style.zIndex = '1';
        dispatch('dragend', { deviceId, x: currentX, y: currentY });
    }

    $: transform = `translate(${currentX}px, ${currentY}px)`;
</script>

<div
    bind:this={element}
    class="draggable-device"
    style="transform: {transform}"
    on:mousedown={handleMouseDown}
    role="button"
    tabindex="0"
>
    <div class="drag-handle">
        <div class="drag-indicator"></div>
    </div>
    <div class="device-content">
        <slot></slot>
    </div>
</div>

<svelte:window 
    on:mousemove={handleMouseMove} 
    on:mouseup={handleMouseUp}
/>

<style>
    .draggable-device {
        position: absolute;
        user-select: none;
        background: rgba(40, 44, 52, 0.8);
        backdrop-filter: blur(5px);
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        overflow: hidden;
        min-width: 200px;
        left: 0;
        top: 0;
    }

    .drag-handle {
        height: 24px;
        background-color: rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(0,0,0,0.2);
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .drag-indicator {
        width: 40px;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }

    .device-content {
        padding: 10px;
    }
</style>
