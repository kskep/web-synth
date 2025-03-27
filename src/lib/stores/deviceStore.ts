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
