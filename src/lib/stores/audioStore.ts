import { writable } from 'svelte/store';

declare global {
    interface Window {
        AudioContext: typeof AudioContext;
    }
}

// Create a writable store for the AudioContext
export const audioContextStore = writable<AudioContext | undefined>(undefined);

// Create a writable store for initialization state
export const isAudioInitialized = writable<boolean>(false);

// Function to get the current AudioContext
export function getAudioContext(): AudioContext | undefined {
    let context: AudioContext | undefined;
    audioContextStore.subscribe(value => {
        context = value;
    })();
    return context;
}

// Function to initialize audio
export function initializeAudio(): void {
    try {
        const context = new window.AudioContext();
        audioContextStore.set(context);
        isAudioInitialized.set(true);
        console.log('Audio context initialized:', context);
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
    }
}
