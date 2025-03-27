import { writable } from 'svelte/store';

export type Device = {
    id: string;
    type: string;
    x: number;
    y: number;
    params: Record<string, any>;
};

export const devices = writable<Device[]>([
    { id: 'kick1', type: 'KickDrumDemo', x: 50, y: 50, params: {} },
]);

// Function to add a new device to the store
export const addDevice = (newDevice: Device) => {
    devices.update(currentDevices => [...currentDevices, newDevice]);
};

// Function to remove a device from the store
export const removeDevice = (deviceId: string) => {
    devices.update(currentDevices => currentDevices.filter(device => device.id !== deviceId));
};
