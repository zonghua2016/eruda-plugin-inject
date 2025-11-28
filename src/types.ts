export type Options = {
  targetJs?: string;
  erudaJs?: string; // 可选 eruda CDN 地址
  recordUploadUrl?: string; // 可选录制文件上传地址
  replayUrl?: string; // 可选回放地址
};

export type RecordingState = {
  isRecording: boolean;
  recordId: string | null;
  events: any[];
  stopFn: ReturnType<any> | null;
  uploadInterval: number | null;
  recordingStartTime: number | null;
  maxRecordingTimeout: number | null;
  isDrawingMode: boolean;
  pageId: string;
};

export type NetworkEventData = {
  tag: 'network';
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  status?: number;
};

export type ModalConfig = {
  title: string;
  content: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  placeholder?: string;
};