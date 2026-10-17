import type { PluginPermissionId, PluginPermission } from "../types";

/**
 * Permission vocabulary — shared between the install confirmation and the
 * installed-plugin detail view. The "grant" text is used at install time
 * ("will be able to"); the "held" text is used afterwards ("can").
 */
export const PLUGIN_PERMISSIONS: Record<PluginPermissionId, PluginPermission> = {
    network: {
        id: 'network',
        grant: 'Connect to the internet',
        held: 'Can connect to the internet',
        risk: 'High',
    },
    'read-media': {
        id: 'read-media',
        grant: 'Read the media files you open',
        held: 'Can read the media files you open',
        risk: 'Medium',
    },
    'write-config': {
        id: 'write-config',
        grant: 'Store its own settings',
        held: 'Can store its own settings',
        risk: 'Low',
    },
    spawn: {
        id: 'spawn',
        grant: 'Run other programs on your computer',
        held: 'Can run other programs on your computer',
        risk: 'High',
    },
    'audio-output': {
        id: 'audio-output',
        grant: 'Read the audio stream while it plays',
        held: 'Can read the audio stream while it plays',
        risk: 'Medium',
    },
    'draw-overlay': {
        id: 'draw-overlay',
        grant: 'Draw its own graphics on top of the video surface',
        held: 'Can draw on top of the video surface',
        risk: 'Medium',
    },
};
