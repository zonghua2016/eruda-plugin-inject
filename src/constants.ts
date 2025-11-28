// 录制相关常量
export const RECORDING_CONSTANTS = {
  UPLOAD_INTERVAL: 3000, // 3秒上传一次
  MAX_EVENTS: 10000, // 最大事件数限制
  BATCH_SIZE: 100, // 批处理大小，避免大量数据处理导致页面卡顿
  MAX_RECORDING_DURATION: 30000, // 30秒录制时间限制
  RECORD_ID_KEY: 'recordId',
  RECORDING_ORIGINAL_PAGE: 'recording-original-page',
  RECORDING_START_TIME: 'recordingStartTime',
};

// 存储键常量
export const STORAGE_KEYS = {
  RECORD_ID_KEY: 'recordId',
  RECORDING_START_TIME: 'recordingStartTime',
  WAS_IN_DRAWING_MODE: 'wasInDrawingMode',
  RECORDING_ORIGINAL_PAGE: 'recording-original-page',
  IS_PRIMARY_RECORDING_PAGE: 'is-primary-recording-page',
  PRIMARY_RECORDING_PAGE_ID: 'primary-recording-page-id',
  LAST_ACTIVE_PAGE: 'last-active-page',
  RECORDING_STOP_NOTIFICATION: 'recording-stop-notification',
  REQUEST_EVENTS_UPLOAD: 'request-events-upload',
  EVENTS_DATA_RESPONSE: 'events-data-response',
};

// CSS类名常量
export const CSS_CLASSES = {
  MODAL_MASK: 'modal-mask',
  MODAL_DIALOG: 'modal-dialog',
  MODAL_HEADER: 'modal-header',
  MODAL_TITLE: 'modal-title',
  MODAL_BODY: 'modal-body',
  MODAL_FOOTER: 'modal-footer',
};