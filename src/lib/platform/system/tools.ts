import { BrowserSession as bs } from "./browser";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./shared";
import type {
    CacheSweepResult,
    CacheUsage,
    HardwareProbe,
    LogTail,
    PlatformInfo,
    UpdateCheckResult
} from "../../../types/platform";
import type { AudioDevice } from "../../../types";


class PlatformToolsImpl {
    async probeHardwareDecoding(): Promise<HardwareProbe> {
        if (isTauri) return invoke<HardwareProbe>('probe_hardware_decoding');
        return bs.browserProbeHardware();
    }

    async getPlatformInfo(): Promise<PlatformInfo> {
        if (isTauri) return invoke<PlatformInfo>('get_platform_info');
        return bs.browserPlatformInfo();
    }

    async pickFolder(): Promise<string | null> {
        if (isTauri) return invoke<string | null>('pick_folder');
        return bs.browserPickFolder();
    }
    async pickFile(): Promise<string | null> {
        return invoke<string | null>('pick_file');
    }
    async pickFiles(): Promise<string[] | null> {
        return invoke<string[] | null>('pick_files');
    }
    async openExternal(url: string): Promise<void> {
        if (isTauri) return invoke('open_url', { url });
        return bs.browserOpenExternal(url);
    }

    async openPath(path: string): Promise<void> {
        if (isTauri) return invoke('open_path', { path });
        return bs.browserOpenPath(path);
    }

    async checkForUpdates(): Promise<UpdateCheckResult> {
        if (isTauri) return invoke<UpdateCheckResult>('check_for_updates');
        return bs.browserCheckForUpdates();
    }
    async readLogTail(lines?: number): Promise<LogTail> {
        if (isTauri) return invoke<LogTail>('read_log_tail', { lines });
        return bs.browserLogTail();
    }
    async getVersion(): Promise<string> {
        return invoke<string>('get_app_version');
    }
    async getSettingsFolder(): Promise<string> {
        return invoke<string>('get_base_dir');
    }
    async listAudioDevices(): Promise<AudioDevice[]> {
        if (!isTauri) return [];
        return invoke<AudioDevice[]>('list_audio_devices');
    }

    async setAudioDevice(name: string): Promise<void> {
        if (!isTauri) return;
        return invoke('set_audio_device', { deviceName: name });
    }

    async getAudioDevice(): Promise<string | null> {
        if (!isTauri) return null;
        return invoke<string | null>('get_audio_device');
    }

    async getCacheUsage(): Promise<CacheUsage> {
        if (!isTauri) return { fileCount: 0, totalBytes: 0 };
        return invoke<CacheUsage>('get_cache_usage');
    }

    async sweepCache(): Promise<CacheSweepResult> {
        if (!isTauri) throw new Error('Cache management requires the desktop build');
        return invoke<CacheSweepResult>('sweep_cache_manual');
    }
}

export const PlatformTools = new PlatformToolsImpl();
