import { STORAGE_KEYS } from '../constants';

export class StorageManager {
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to get item from localStorage:', error);
      return null;
    }
  }

  static setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set item in localStorage:', error);
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove item from localStorage:', error);
    }
  }

  static clearRecordingData(): void {
    const keysToRemove = [
      STORAGE_KEYS.RECORDING_START_TIME,
      STORAGE_KEYS.RECORD_ID_KEY,
      STORAGE_KEYS.WAS_IN_DRAWING_MODE,
      STORAGE_KEYS.RECORDING_ORIGINAL_PAGE,
      STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE,
      STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID,
      STORAGE_KEYS.LAST_ACTIVE_PAGE,
      STORAGE_KEYS.RECORDING_STOP_NOTIFICATION,
      STORAGE_KEYS.REQUEST_EVENTS_UPLOAD,
      STORAGE_KEYS.EVENTS_DATA_RESPONSE,
    ];

    keysToRemove.forEach(key => this.removeItem(key));
  }
}