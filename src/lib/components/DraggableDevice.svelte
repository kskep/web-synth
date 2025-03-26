<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let initialX = 0;
    export let initialY = 0;
    export let deviceId = '';

    const dispatch = createEventDispatcher();

    let isDragging = false;
    let currentX = initialX;
    let currentY = initialY;
    let startX = 0;
    let startY = 0;

    function handleMouseDown(event: MouseEvent) {
        // Only start dragging if the drag handle was clicked
        const target = event.target as HTMLElement;
        if (!target.classList.contains('drag-handle') && !target.parentElement?.classList.contains('drag-handle')) return;
        
        isDragging = true;
        startX = event.clientX - currentX;
        startY = event.clientY - currentY;
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isDragging) return;
        
        currentX = event.clientX - startX;
        currentY = event.clientY - startY;
        
        dispatch('move', { id: deviceId, x: currentX, y: currentY });
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        dispatch('dragend', { id: deviceId, x: currentX, y: currentY });
    }
</script>

<div
    class="draggable-device"
    style="left: {currentX}px; top: {currentY}px;"
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
