// src/lib/stores/audioStore.js
import { writable, derived } from 'svelte/store';
// Assuming browser check is handled elsewhere or app is client-side only for audio
// For SvelteKit, use import { browser } from '$app/environment';

// Store for the AudioContext instance
export const audioContextStore = writable(null);

// Store for initialization status
export const isAudioInitialized = derived(audioContextStore, $ctx => $ctx !== null && $ctx.state === 'running');

// Function to initialize audio (typically called on user interaction)
export async function initializeAudio() {
    let currentCtx;
    audioContextStore.subscribe(value => currentCtx = value)();

    if (!currentCtx) {
        try {
            console.log('Initializing AudioContext...');
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Resume if suspended (important for browsers requiring interaction)
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            audioContextStore.set(ctx); // Update the store
            console.log('AudioContext Initialized. State:', ctx.state);
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            alert(`Audio Error: ${error.message}`);
            audioContextStore.set(null); // Ensure store reflects failure
        }
    } else if (currentCtx.state === 'suspended') {
        try {
            await currentCtx.resume();
            console.log('AudioContext Resumed. State:', currentCtx.state);
            // No need to set store again, state change triggers derived store
        } catch (error) {
            console.error('Failed to resume AudioContext:', error);
            alert(`Audio Error: ${error.message}`);
        }
    }
}

// You might want a way to get the context directly if needed outside stores
export function getAudioContext() {
    let ctx;
    audioContextStore.subscribe(value => ctx = value)();
    return ctx;
}