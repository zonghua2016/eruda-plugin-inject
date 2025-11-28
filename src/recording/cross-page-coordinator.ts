import { StorageManager } from '../utils/storage';
import { STORAGE_KEYS } from '../constants';
import { RecordingManager } from './recording-manager';
import { generatePageId } from '../utils/timer';

export class CrossPageCoordinator {
  private static instance: CrossPageCoordinator;
  private pageId: string;
  private activeInterval: number | null = null;
  private recordUploadUrl: string | null = null;

  private constructor() {
    this.pageId = generatePageId();
  }

  static getInstance(): CrossPageCoordinator {
    if (!CrossPageCoordinator.instance) {
      CrossPageCoordinator.instance = new CrossPageCoordinator();
    }
    return CrossPageCoordinator.instance;
  }

  initialize(recordUploadUrl?: string) {
    this.recordUploadUrl = recordUploadUrl || null;
    this.setupCoordination();
  }

  private setupCoordination() {
    // 更新当前活跃页面信息
    StorageManager.setItem(STORAGE_KEYS.LAST_ACTIVE_PAGE, this.pageId);

    // 定期更新活跃状态，确保其他页面知道当前页面仍处于活跃状态
    this.activeInterval = setInterval(() => {
      const recordingManager = RecordingManager.getInstance();
      if (recordingManager.getIsRecording()) {
        StorageManager.setItem(STORAGE_KEYS.LAST_ACTIVE_PAGE, this.pageId);
      }
    }, 1000);

    // 页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
      if (this.activeInterval) {
        clearInterval(this.activeInterval);
      }
    });

    this.setupStorageListeners();
    this.setupUnloadHandlers();
    this.setupVisibilityHandlers();
  }

  private setupStorageListeners() {
    // 监听storage变化，处理跨页面录制协调
    window.addEventListener('storage', (e) => {
      this.handleStorageChange(e);
    });
  }

  private handleStorageChange(e: StorageEvent) {
    const recordingManager = RecordingManager.getInstance();
    const isRecording = recordingManager.getIsRecording();
    const recordId = recordingManager.getRecordId();
    // 处理录制停止通知
    if (e.key === STORAGE_KEYS.RECORDING_STOP_NOTIFICATION) {
      const { UIManager } = require('../ui/ui-manager');
      const uiManager = UIManager.getInstance();
      if (uiManager && uiManager['forceExitDrawingMode']) {
        uiManager['forceExitDrawingMode']();
      }

      // 如果本地正在录制且停止通知不是来自当前页面，则停止本地录制
      if (isRecording && e.oldValue !== e.newValue) {
        const stopData = JSON.parse(e.newValue || '{}');

        if (stopData.pageId !== this.pageId) {
          // 其他页面停止了录制，本页也应停止但不弹窗
          this.stopRecordingSilently();
        }
      }
    }

    // 处理事件上传请求
    if (e.key === STORAGE_KEYS.REQUEST_EVENTS_UPLOAD && e.newValue) {
      const requestData = JSON.parse(e.newValue);
      if (requestData.requesterPageId !== this.pageId) {
        const events = recordingManager.getEvents();
        if (events.length > 0) {
          // 其他页面请求上传事件，发送当前事件
          const eventData = {
            events: [...events],
            senderPageId: this.pageId,
            timestamp: Date.now()
          };
          StorageManager.setItem(STORAGE_KEYS.EVENTS_DATA_RESPONSE, JSON.stringify(eventData));
          recordingManager.clearEvents(); // 清空已发送的事件
        }
      }
    }

    // 处理主页面变更通知
    if (e.key === STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID) {
      if (e.newValue && e.newValue !== this.pageId) {
        // 新的主页面被指定，当前页面不再是主页面
        StorageManager.setItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE, 'false');
      }
    }
  }

  private setupUnloadHandlers() {
    window.addEventListener('beforeunload', () => {
      if (this.activeInterval) {
        clearInterval(this.activeInterval);
      }

      const recordingManager = RecordingManager.getInstance();
      const isRecording = recordingManager.getIsRecording();
      const recordId = recordingManager.getRecordId();

      // 无论是否在录制中，都强制退出画笔模式
      // const { UIManager } = require('../ui/ui-manager');
      // const uiManager = UIManager.getInstance();
      // if (uiManager && uiManager['forceExitDrawingMode']) {
      //   uiManager['forceExitDrawingMode']();
      // }

      if (isRecording && recordId) {
        const isPrimaryPage = StorageManager.getItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID) === this.pageId;

        if (isPrimaryPage) {
          this.handlePrimaryPageUnload();
        } else {
          this.handleSecondaryPageUnload();
        }
      }
    });
  }

  private handlePrimaryPageUnload() {
    const recordingManager = RecordingManager.getInstance();

    // 上传自己的事件
    if (this.recordUploadUrl) {
      const events = recordingManager.getEvents();
      if (events.length > 0) {
        recordingManager['uploadEvents']([...events], this.recordUploadUrl);
        recordingManager.clearEvents();
      }
    }

    // 通知下一个可能的活跃页面成为主录制页面
    const lastActivePage = StorageManager.getItem(STORAGE_KEYS.LAST_ACTIVE_PAGE);
    if (lastActivePage && lastActivePage !== this.pageId) {
      StorageManager.setItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID, lastActivePage);
    }

    this.stopRecordingSilently();
    StorageManager.setItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE, 'false');
  }

  private handleSecondaryPageUnload() {
    const recordingManager = RecordingManager.getInstance();

    // 上传当前积累的事件
    if (this.recordUploadUrl) {
      const events = recordingManager.getEvents();
      if (events.length > 0) {
        recordingManager['uploadEvents']([...events], this.recordUploadUrl);
        recordingManager.clearEvents();
      }
    }

    this.stopRecordingSilently();
  }

  private setupVisibilityHandlers() {
    // 页面可见性改变时的处理
    document.addEventListener('visibilitychange', () => {
      const recordingManager = RecordingManager.getInstance();
      const isRecording = recordingManager.getIsRecording();
      const recordId = recordingManager.getRecordId();

      if (document.visibilityState === 'hidden') {
        // 页面变为不可见，无论是否在录制中都要强制退出画笔模式
        // const { UIManager } = require('../ui/ui-manager');
        // const uiManager = UIManager.getInstance();
        // if (uiManager && uiManager['forceExitDrawingMode']) {
        //   uiManager['forceExitDrawingMode']();
        // }

        if (isRecording && recordId) {
          // 页面变为不可见且正在录制，更新活跃页面信息并停止录制
          StorageManager.setItem(STORAGE_KEYS.LAST_ACTIVE_PAGE, this.pageId);
          this.stopRecordingSilently();
        }
      } else if (document.visibilityState === 'visible' && recordId) {
        // 页面变为可见，更新活跃页面信息
        StorageManager.setItem(STORAGE_KEYS.LAST_ACTIVE_PAGE, this.pageId);
        this.handleVisibilityRestore();
      }
    });
  }

  private handleVisibilityRestore() {
    // 检查是否需要成为主录制页面
    const primaryPageId = StorageManager.getItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID);
    if (!primaryPageId || primaryPageId === 'null') {
      // 如果没有主录制页面，当前页面成为主录制页面
      StorageManager.setItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID, this.pageId);
      StorageManager.setItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE, 'true');
    }

    const recordingManager = RecordingManager.getInstance();
    const recordId = recordingManager.getRecordId();
    const isRecording = recordingManager.getIsRecording();

    // 重新开始录制（如果还有recordId）
    if (recordId && !isRecording) {
      recordingManager['isRecording'] = true; // 临时设置
      recordingManager.startRecording(this.recordUploadUrl || undefined);

      // 更新UI状态
      this.updateRecordingUI(true);
    }

    // 检查是否应该恢复画笔模式
    const wasInDrawingMode = StorageManager.getItem(STORAGE_KEYS.WAS_IN_DRAWING_MODE) === 'true';
    if (recordId) {
      // 如果仍在录制中，同步录制按钮状态
      this.updateRecordingUI(isRecording);

      const { UIManager } = require('../ui/ui-manager');
      const uiManager = UIManager.getInstance();

      // 如果之前在画笔模式下并且仍在录制中，则恢复画笔模式
      if (wasInDrawingMode && isRecording) {
        if (uiManager && !uiManager['isDrawingMode']) {
          uiManager['enableDrawingMode']();
          uiManager['isDrawingMode'] = true;
        }
        // 更新画笔按钮UI状态
        this.updateDrawingUI(true);
      } else if (uiManager && uiManager['isDrawingMode']) {
        // 如果之前不在画笔模式下但当前是画笔模式，则退出画笔模式
        uiManager['disableDrawingMode']();
        uiManager['isDrawingMode'] = false;
        // 更新画笔按钮UI状态
        this.updateDrawingUI(false);
      } else {
        // 同步画笔按钮UI状态
        this.updateDrawingUI(wasInDrawingMode && isRecording);
      }
    }
  }

  private updateRecordingUI(isRecording: boolean) {
    const bar = document.getElementById("fun-toolbar");
    if (bar) {
      const recordBtn = bar.children[1] as HTMLElement;
      if (recordBtn) {
        recordBtn.style.background = isRecording ? "#3b82f6" : "#fff";
        recordBtn.style.color = isRecording ? "#fff" : "#3b82f6";
      }
    }
  }

  private updateDrawingUI(isDrawing: boolean) {
    const bar = document.getElementById("fun-toolbar");
    if (bar) {
      const penBtn = bar.children[2] as HTMLElement;
      if (penBtn) {
        if (isDrawing) {
          penBtn.style.background = "#ff9800";
          penBtn.style.color = "#fff";
        } else {
          penBtn.style.background = "#fff";
          penBtn.style.color = "#aaa";
        }
      }
    }
  }

  stopRecordingSilently() {
    const recordingManager = RecordingManager.getInstance();

    // 停止录制
    if (this.recordUploadUrl) {
      recordingManager.stopRecording(this.recordUploadUrl);
    } else {
      recordingManager.stopRecording();
    }

    // 强制清理录制管理器的所有数据
    recordingManager.forceCleanup();

    // 强制退出画笔模式（确保页面切换时也能正确退出）
    // const { UIManager } = require('../ui/ui-manager');
    // const uiManager = UIManager.getInstance();
    // if (uiManager && uiManager['forceExitDrawingMode']) {
    //   uiManager['forceExitDrawingMode']();
    // }

    // 标记本页面为非主录制页面
    StorageManager.setItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE, 'false');

    // 更新UI状态
    this.updateRecordingUI(false);
    this.updateDrawingUI(false);
  }

  checkAndResumeRecording() {
    const savedRecordId = StorageManager.getItem(STORAGE_KEYS.RECORD_ID_KEY);
    if (savedRecordId) {
      const recordingManager = RecordingManager.getInstance();

      // 设置recordId到管理器
      recordingManager['recordId'] = savedRecordId;

      // 检查本页面是否是主录制页面
      let isPrimaryPage = StorageManager.getItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE) !== 'false';
      const primaryPageId = StorageManager.getItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID);

      // 如果主录制页面ID不存在或无效，让当前页面接管
      if (!primaryPageId || !StorageManager.getItem(STORAGE_KEYS.LAST_ACTIVE_PAGE) ||
        StorageManager.getItem(STORAGE_KEYS.LAST_ACTIVE_PAGE) !== primaryPageId) {
        // 当前页面成为主录制页面
        isPrimaryPage = true;
        StorageManager.setItem(STORAGE_KEYS.IS_PRIMARY_RECORDING_PAGE, 'true');
        StorageManager.setItem(STORAGE_KEYS.PRIMARY_RECORDING_PAGE_ID, this.pageId);
        StorageManager.setItem(STORAGE_KEYS.LAST_ACTIVE_PAGE, this.pageId);
      }

      // 开始录制
      recordingManager['isRecording'] = true; // 临时设置
      recordingManager.startRecording(this.recordUploadUrl || undefined);

      // 如果没有原始页面信息，设置为当前页面（防止异常情况）
      if (!StorageManager.getItem(STORAGE_KEYS.RECORDING_ORIGINAL_PAGE)) {
        StorageManager.setItem(STORAGE_KEYS.RECORDING_ORIGINAL_PAGE, window.location.href);
      }

      // 同步UI状态
      this.updateRecordingUI(true);

      // 检查是否应该恢复画笔模式
      const wasInDrawingMode = StorageManager.getItem(STORAGE_KEYS.WAS_IN_DRAWING_MODE) === 'true';
      if (wasInDrawingMode) {
        const { UIManager } = require('../ui/ui-manager');
        const uiManager = UIManager.getInstance();
        if (uiManager) {
          uiManager['enableDrawingMode']();
          uiManager['isDrawingMode'] = true;
        }
        this.updateDrawingUI(true);
      }

      return true;
    }
    return false;
  }
}