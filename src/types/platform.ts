export interface HardwareProbe {
  /** Whether any hardware decode is available at all. */
  available: boolean;
  /** e.g. 'VA-API', 'VideoToolbox', 'D3D11VA', or '' if unavailable. */
  backend: string;
  /** Device name if detectable, e.g. 'Intel Iris Xe (Mesa)'. */
  device: string;
  /** Codecs the probe confirmed work. */
  codecs: string[];
  /** Codecs the backend supports but the build can't decode. */
  unavailableCodecs: string[];
  error?: string
}

export interface PlatformInfo {
  os: string;
  /** Version string, or 'BROWSER_APPROX' when the value is a guess. */
  osVersion: string;
  /** 'wayland', 'x11', 'browser', or 'unknown'. */
  session: string;
  /** Desktop environment, e.g. 'GNOME 46'. Empty when unknown. */
  desktop: string;
  /** GPU name. */
  gpu: string;
  /** 'PipeWire', 'PulseAudio', 'CoreAudio', 'WASAPI', or 'Browser-managed'. */
  audioBackend: string;
  /** OS display scaling, e.g. 1.25 for 125%. */
  displayScaling: number;
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  url?: string;
  error?: string;
}

export interface LogLine {
  timestamp: string;
  level: string;
  message: string;
}

export interface LogTail {
  lines: LogLine[];
  path: string;
  error: string | null;
}
