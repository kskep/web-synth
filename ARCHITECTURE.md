# Web Synth Architecture

## Overview
The Web Synth is a modular synthesizer built using Svelte and the Web Audio API. It follows a device-based architecture where each device is an audio node that can be connected to other devices through an FX chain.

## Core Components

### 1. Device Store (`deviceStore.ts`)
The central store that manages all devices in the workspace.

```typescript
interface Device {
    id: string;
    type: string;
    x: number;
    y: number;
    params: Record<string, any>;
}

// Store exports
export const devices = writable<Device[]>([]);
export const addDevice = (device: Device) => {...};
export const removeDevice = (deviceId: string) => {...};
```

### 2. Audio Store (`audioStore.ts`)
Manages the global Web Audio context and initialization.

```typescript
export const audioContextStore = writable<AudioContext | null>(null);
export const isAudioInitialized = writable<boolean>(false);
export const initializeAudio = () => {...};
export const getAudioContext = () => {...};
```

### 3. Device Component (`Device.svelte`)
The base component for all audio devices. Handles:
- Audio routing
- FX chain management
- Device removal
- UI rendering

Key Properties:
```typescript
export let device: Device;
export let inputNode: AudioNode | null;
export let outputNode: AudioNode | null;
```

### 4. Audio Devices

#### KickDrum (`KickDrumDemo.svelte`)
An 808-style kick drum synthesizer.
- Uses `KickEngine.js` for audio generation
- Exposes parameters for tuning, decay, punch, etc.
- Implements the device interface for FX chain compatibility

```typescript
interface KickParams {
    tune: number;
    decay: number;
    punch: number;
    pitchDecay: number;
    // ... more parameters
}
```

#### KickEngine (`KickEngine.js`)
The core audio engine for the kick drum.
- Creates and manages Web Audio nodes
- Handles parameter changes
- Provides input/output nodes for FX routing

Key Methods:
```javascript
class KickEngine {
    get inputNode(): AudioNode;
    get outputNode(): AudioNode;
    connect(destination: AudioNode): void;
    disconnect(): void;
    trigger(time?: number): void;
    updateParams(newParams: Partial<KickParams>): void;
}
```

### 5. Effects (FX)

#### DelayFX (`DelayFX.svelte`)
A delay effect processor.
- Creates a feedback delay line
- Provides wet/dry mix control
- Implements the device interface for chaining

Parameters:
```typescript
interface DelayParams {
    delayTime: number;    // 0.01 to 1.0 seconds
    feedback: number;     // 0 to 0.95
    mix: number;         // 0 (dry) to 1 (wet)
}
```

## Audio Routing

1. Each device has an `inputNode` and `outputNode`
2. The `Device` component manages an FX chain:
   ```
   Device Output → FX1 → FX2 → ... → FXn → Final Output
   ```
3. When adding an FX:
   - Create input/output gain nodes for the FX
   - Disconnect previous output
   - Connect previous output to FX input
   - Connect FX output to next device or final destination

## Component Hierarchy

```
Workspace
└── Device
    ├── KickDrumDemo
    │   └── KickEngine
    └── FX Chain
        └── DelayFX
```

## Adding New Devices

To add a new device:

1. Create a new component implementing the device interface:
   ```typescript
   export let inputNode: AudioNode | null;
   export let outputNode: AudioNode | null;
   ```

2. Add the device type to the store:
   ```typescript
   devices.update(current => [...current, {
       id: 'unique_id',
       type: 'NewDeviceType',
       x: 0,
       y: 0,
       params: {}
   }]);
   ```

3. Add the device to the rendering logic in `Device.svelte`:
   ```svelte
   {#if device.type === 'NewDeviceType'}
       <NewDevice bind:outputNode {inputNode} />
   {/if}
   ```

## Important Considerations

1. **Audio Context**: Always use the global audio context from `audioStore.ts`
2. **Memory Management**: 
   - Disconnect audio nodes in `onDestroy`
   - Clean up any event listeners
   - Clear intervals/timeouts
3. **Parameter Changes**:
   - Use `setTargetAtTime` for smooth transitions
   - Clamp values to prevent audio issues
4. **FX Chain**:
   - Check for null nodes before connecting
   - Maintain proper audio routing when adding/removing FX
   - Update the final output node correctly
