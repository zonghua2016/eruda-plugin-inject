import { record } from "@rrweb/record";
import { pack } from '@rrweb/packer';
import { getRecordConsolePlugin } from "@rrweb/rrweb-plugin-console-record";
import { RECORDING_CONSTANTS } from '../constants';
import { StorageManager } from '../utils/storage';
import { generateRecordId } from '../utils/timer';
import { createNetworkEvent } from '../utils/network';

export class RecordingManager {
  private static instance: RecordingManager;
  private events: any[] = [];
  private stopFn: ReturnType<typeof record> | null = null;
  private uploadInterval: number | null = null;
  private maxRecordingTimeout: number | null = null;
  private isRecording = false;
  private recordId: string | null = null;
  private recordingStartTime: number | null = null;

  private constructor() {}

  static getInstance(): RecordingManager {
    if (!RecordingManager.instance) {
      RecordingManager.instance = new RecordingManager();
    }
    return RecordingManager.instance;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getRecordId(): string | null {
    return this.recordId;
  }

  getEvents(): any[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  startRecording(recordUploadUrl?: string) {
    // 如果已经有一个录制器在运行，先停止它
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    // 重置事件数组
    this.events = [];

    // 开始录制
    this.stopFn = record({
      emit: (event) => {
        // 存储事件
        this.events.push(event);

        // 内存保护：限制最大事件数量
        if (this.events.length > RECORDING_CONSTANTS.MAX_EVENTS) {
          this.events = this.events.slice(-Math.floor(RECORDING_CONSTANTS.MAX_EVENTS * 0.8)); // 保留最近80%的事件
        }
      },
      packFn: pack,
      plugins: [getRecordConsolePlugin({
        level: ["info", "log", "warn", "error"],
        lengthThreshold: 10000,
        stringifyOptions: {
          stringLengthLimit: 1000,
          numOfKeysLimit: 100,
          depthOfLimit: 1,
        },
        logger: window.console,
      })],
      // 性能优化选项
      sampling: {
        scroll: 100, // 滚动事件每100ms最多记录一次
        input: 'last' // 输入事件只记录最后的值
      },
      // Canvas录制选项
      recordCanvas: true, // 确保录制canvas内容以捕捉画笔绘制
      collectFonts: true, // 收集字体信息以更好重现
      // 其他录制选项
      recordAfter: 'DOMContentLoaded', // 在DOM内容加载完成后开始录制
    });

    this.isRecording = true;

    // 设置定期上传
    if (recordUploadUrl) {
      if (this.uploadInterval) {
        clearInterval(this.uploadInterval);
      }
      this.uploadInterval = window.setInterval(() => {
        if (this.events.length > 0) {
          this.uploadEvents([...this.events], recordUploadUrl);
          this.events = []; // 清空已上传的事件
        }
      }, RECORDING_CONSTANTS.UPLOAD_INTERVAL);
    }
  }

  stopRecording(recordUploadUrl?: string) {
    // 停止录制
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    // 清除定时上传
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    // 清除最大录制时间限制
    if (this.maxRecordingTimeout) {
      clearTimeout(this.maxRecordingTimeout);
      this.maxRecordingTimeout = null;
    }

    // 上传剩余数据
    if (recordUploadUrl && this.events.length > 0) {
      this.uploadEvents(this.events, recordUploadUrl);
    }

    // 清空事件数组
    this.events = [];
    this.isRecording = false;
  }

  forceCleanup() {
    // 强制清理所有录制相关数据
    this.stopFn = null;

    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    if (this.maxRecordingTimeout) {
      clearTimeout(this.maxRecordingTimeout);
      this.maxRecordingTimeout = null;
    }

    this.events = [];
    this.isRecording = false;
    this.recordId = null;
    this.recordingStartTime = null;
  }

  startRecordingWithId(recordUploadUrl?: string) {
    const { RECORD_ID_KEY, RECORDING_ORIGINAL_PAGE, RECORDING_START_TIME, MAX_RECORDING_DURATION } = RECORDING_CONSTANTS;

    // 检查是否已有recordId（断点续录）
    const savedRecordId = StorageManager.getItem(RECORD_ID_KEY);
    if (savedRecordId) {
      this.recordId = savedRecordId;
    } else {
      // 生成新的recordId
      this.recordId = generateRecordId();
      StorageManager.setItem(RECORD_ID_KEY, this.recordId);

      // 保存录制开始的原始页面信息
      StorageManager.setItem(RECORDING_ORIGINAL_PAGE, window.location.href);
    }

    // 记录开始时间并保存到localStorage
    const currentStartTime = Date.now();
    this.recordingStartTime = currentStartTime;
    StorageManager.setItem(RECORDING_START_TIME, currentStartTime.toString());

    // 设置最大录制时间限制
    if (this.maxRecordingTimeout) {
      clearTimeout(this.maxRecordingTimeout);
    }
    this.maxRecordingTimeout = window.setTimeout(() => {
      this.stopRecording(recordUploadUrl);
    }, MAX_RECORDING_DURATION) as any;

    // 开始录制
    this.startRecording(recordUploadUrl);
  }

  /**
   * 上传录制事件 - 使用文件上传方式
   */
  private async uploadEvents(events: any[], recordUploadUrl: string) {
    if (events.length === 0 || !this.recordId) return;

    try {
      // 处理大量事件时分批上传
      if (events.length > RECORDING_CONSTANTS.BATCH_SIZE) {
        for (let i = 0; i < events.length; i += RECORDING_CONSTANTS.BATCH_SIZE) {
          const batch = events.slice(i, i + RECORDING_CONSTANTS.BATCH_SIZE);
          await this.uploadBatchAsFile(recordUploadUrl, batch, Math.ceil(events.length / RECORDING_CONSTANTS.BATCH_SIZE), Math.floor(i / RECORDING_CONSTANTS.BATCH_SIZE) + 1);

          // 小延迟避免阻塞主线程
          if (i + RECORDING_CONSTANTS.BATCH_SIZE < events.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      } else {
        await this.uploadBatchAsFile(recordUploadUrl, events, 1, 1);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  /**
   * 以文件形式上传单个批次
   */
  private async uploadBatchAsFile(recordUploadUrl: string, batch: any[], totalBatches: number, currentBatch: number) {
    if (!this.recordId) return;

    try {
      // 创建包含批次数据的对象
      const data = {
        events: batch,
        timestamp: Date.now(),
        url: window.location.href,
        recordId: this.recordId,
        batchInfo: {
          current: currentBatch,
          total: totalBatches
        }
      };

      // 使用 AbortController 实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

      const response = await fetch(`${recordUploadUrl}/${this.recordId}/upload`, {
        method: "POST",
        body: JSON.stringify({
          events: JSON.stringify(data.events),
          timestamp: data.timestamp,
          url: data.url,
          recordId: data.recordId,
          batchInfo: data.batchInfo,
          uaInfo: window.navigator.userAgent
        }),
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // console.log(`Uploaded batch ${currentBatch}/${totalBatches} with ${batch.length} events as file`);
    } catch (error) {
      // console.error(`Failed to upload batch ${currentBatch}/${totalBatches}:`, error);
      throw error;
    }
  }

  pushNetworkEvent(net: any) {
    // 确保只在实际录制时才记录网络事件
    if (!this.isRecording) {
      return;
    }

    const networkEvent = createNetworkEvent(net);
    if (networkEvent) {
      this.events.push(networkEvent);
    }
  }
}