# KickDrumDemo Component Explanation

This document describes the functionality and purpose of the `KickDrumDemo` Svelte component, located at `src/lib/components/KickDrumDemo.svelte`. This component is designed to demonstrate and allow user interaction with a synthesized kick drum sound, generated using the `KickEngine` class.

## Functionality Overview

The `KickDrumDemo` component serves as a user interface for controlling and playing a synthesized kick drum. It utilizes several parameters to adjust the sound, and it manages the audio context lifecycle for creating and interacting with audio.

## UI Parameters and Their Functions

The component exposes several parameters in the UI, allowing users to manipulate the sound of the kick drum:

*   **Attack (attack):** Controls the initial speed at which the kick drum sound begins. Lower values mean a faster attack, resulting in a more "clicky" or immediate sound. Higher values mean a slower, more gradual onset of the sound.
*   **Decay (decay):** Determines how long the main body of the kick drum sound lasts. Lower values will result in a short, tight kick, while higher values create a longer, more sustained sound.
*   **Pitch Decay (pitchDecay):** Adjusts the rate at which the pitch of the kick drum drops over time. This creates the characteristic "falling" pitch of a kick. Lower values mean a slower pitch fall, and higher values create a rapid pitch drop.
*   **Start Frequency (startFrequency):** Sets the initial pitch (frequency) of the kick drum. Higher values result in a higher-pitched kick, and lower values produce a deeper, lower-pitched sound.
*   **Distortion (distortion):** Controls the amount of distortion applied to the kick drum sound. This parameter adds harmonics and grit, making the kick sound more aggressive or "dirty".
* **Gain (gain):** Sets the overall volume of the kick drum sound. This adjusts how loud the kick is, relative to other sounds in the audio context.
*   **Play/Stop Button:** A toggle button that allows the user to start and stop the kick drum sound.

## Audio Initialization

The audio initialization process occurs when the component is first created. This includes:

1.  **Importing necessary components:** Imports `onMount` and `onDestroy` from Svelte, `KickEngine` from `src/lib/audio/KickEngine.js` and `audioStore` from `src/lib/stores/audioStore.js`.
2.  **Instantiating `KickEngine`:** A new instance of the `KickEngine` class is created, which is responsible for generating the kick drum sound.
3. **Instantiating `audioStore`:** The `audioStore` is responsible for managing the AudioContext across the application.
4.  **Connecting to the audio:** The `KickEngine` will connect its audio output to the main destination, allowing it to be heard.
5. **Initialize parameters:** All the parameters are initialized with default values and the `KickEngine` parameters are set with them.

## `onMount` Lifecycle

The `onMount` lifecycle event in Svelte is triggered when the component is added to the DOM. In `KickDrumDemo`, the following actions occur during `onMount`:

1.  **Update parameters:** Updates the parameters of the `KickEngine` to ensure that the sound engine is in sync with the component's parameters.
2. **Check AudioContext state:** If the audio context is suspended, tries to resume it. This is in charge of allowing the audio to be heard after the user's interaction with the application.

## `onDestroy` Lifecycle

The `onDestroy` lifecycle event in Svelte is triggered when the component is removed from the DOM. In `KickDrumDemo`, the following actions occur during `onDestroy`:

1.  **Stop the sound:** Stops the kick drum sound to prevent it from continuing to play after the component is removed.
2.  **Disconnect the audio:** Disconnects the `KickEngine` from the audio destination.
3. **Closes AudioContext if is the last component:** Checks if other components are using the same AudioContext and, if not, closes the context.
This behavior is crucial for proper resource management and ensures that the audio engine is correctly shut down when no longer needed.

## Conclusion

The `KickDrumDemo` component provides a user-friendly interface for manipulating and playing a synthesized kick drum. It leverages the `KickEngine` class for audio generation and carefully manages audio resources during its lifecycle. By adjusting the UI parameters, users can create a wide range of kick drum sounds, and the component ensures a clean audio experience by managing the audio context effectively.