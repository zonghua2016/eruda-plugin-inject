import { injectAnimationStyles } from '../utils/animations';
import { StorageManager } from '../utils/storage';
import { STORAGE_KEYS } from '../constants';
import { getElapsedTime } from '../utils/timer';
import { RecordingManager } from '../recording/recording-manager';
import { CrossPageCoordinator } from '../recording/cross-page-coordinator';
import { Modal } from '../components/modal';

export class UIManager {
  private static instance: UIManager;
  private toolbar: HTMLElement | null = null;
  private expanded = false;
  private timerInterval: any = null;
  private startTime = 0;
  private isDrawingMode = false;
  private drawingCanvas: HTMLCanvasElement | null = null;
  private drawingCtx: CanvasRenderingContext2D | null = null;
  private isMouseDown = false;
  private timer: HTMLElement | null = null;

  private replayUrl = '';

  private constructor() { }

  static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  initialize(recordUploadUrl?: string, replayUrl?: string) {
    this.replayUrl = replayUrl || '';
    injectAnimationStyles();
    this.createToolbar(recordUploadUrl);
  }

  private createToolbar(recordUploadUrl?: string) {
    // 主容器
    const bar = document.createElement("div");
    bar.id = "fun-toolbar";
    bar.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20%;
      width: 58px;
      height: auto;

      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;

      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(8px);
      border-radius: 32px;

      box-shadow: 0 6px 25px rgba(0,0,0,0.12);
      z-index: 999999;

      cursor: grab;
      user-select: none;

      padding: 8px 0;
      overflow: hidden;

      transition: max-height 0.28s ease;
      max-height: 42px; /* 默认只够 Logo 的高度 */
    `;

    this.toolbar = bar;

    // 创建圆形图标按钮
    function createCircleButton(icon: string, color = "#999") {
      const btn = document.createElement("div");
      btn.style.cssText = `
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: ${color};
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        transition: all .2s ease;
        cursor: pointer;
        flex-shrink: 0;
      `;
      btn.innerHTML = icon;
      btn.onmouseenter = () => (btn.style.transform = "scale(1.08)");
      btn.onmouseleave = () => (btn.style.transform = "scale(1)");
      return btn;
    }

    // 顶部 LOGO（控制展开/收起）
    const logo = createCircleButton(`<b style="font-size:16px;color:#333">FUN</b>`);
    logo.style.background = "#fff";

    // 菜单按钮（默认隐藏）
    const recordBtn = createCircleButton("🎥", "#3b82f6");
    const penBtn = createCircleButton("✏️", "#aaa");

    // 计时器文本模块
    this.timer = document.createElement("div");
    this.timer.style.cssText = `
      font-size: 12px;
      color: #333;
      opacity: 0;
      transition: opacity .2s ease;
    `;
    this.timer.textContent = "00:00";

    bar.appendChild(logo);       // 1
    bar.appendChild(recordBtn);  // 2
    bar.appendChild(penBtn);     // 3
    // bar.appendChild(this.timer);      // 4

    document.body.appendChild(bar);

    // 📌 默认所有子按钮隐藏
    this.collapseMenu();

    // 📌 点击 Logo 切换展开/收起
    logo.onclick = (e) => {
      e.stopPropagation();
      this.expanded ? this.collapseMenu() : this.expandMenu();
    };

    // ============= 录制功能 =============
    recordBtn.onclick = (e) => {
      e.stopPropagation();

      const recordingManager = RecordingManager.getInstance();
      const isRecording = recordingManager.getIsRecording();

      if (!isRecording) {
        recordingManager.startRecordingWithId(recordUploadUrl);
        recordBtn.style.background = "#3b82f6";
        recordBtn.style.color = "#fff";

        this.startTime = Date.now();
        this.timer!.style.opacity = "1";
        this.timerInterval = setInterval(() => this.updateTimer(this.timer!), 1000);
      } else {
        this.stopRecordingWithPrompt(recordUploadUrl, true);
        recordBtn.style.background = "#fff";
        recordBtn.style.color = "#3b82f6";

        this.timer!.style.opacity = "0";
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
      }
    };

    // ============= 画笔功能 =============
    penBtn.onclick = (e) => {
      e.stopPropagation();

      if (!this.isDrawingMode) {
        // 进入画笔模式
        this.enableDrawingMode();
        penBtn.style.background = "#ff9800";
        penBtn.style.color = "#fff";
        this.isDrawingMode = true;
        // 保存画笔模式状态到localStorage以便页面跳转后恢复
        const recordingManager = RecordingManager.getInstance();
        if (recordingManager.getIsRecording()) {
          StorageManager.setItem(STORAGE_KEYS.WAS_IN_DRAWING_MODE, 'true');
        }
      } else {
        // 退出画笔模式时清空画布
        this.clearCanvas();
        this.disableDrawingMode();
        penBtn.style.background = "#fff";
        penBtn.style.color = "#aaa";
        this.isDrawingMode = false;
        // 清除画笔模式状态
        const recordingManager = RecordingManager.getInstance();
        if (recordingManager.getIsRecording()) {
          StorageManager.setItem(STORAGE_KEYS.WAS_IN_DRAWING_MODE, 'false');
        }
      }
    };

    // ============= 可拖拽 =============
    this.setupDraggable(bar);

    // ============= 网络监听 =============
    this.setupNetworkInterception();
  }

  private collapseMenu() {
    this.expanded = false;
    if (this.toolbar) {
      this.toolbar.style.maxHeight = "42px"; // 只显示 logo
    }
  }

  private expandMenu() {
    this.expanded = true;
    if (this.toolbar) {
      this.toolbar.style.maxHeight = "fit-content"; // 展开足够大的高度
    }
  }

  private updateTimer(timerElement: HTMLElement) {
    const elapsed = getElapsedTime(this.startTime);
    timerElement.textContent = elapsed;
  }

  private stopRecordingWithPrompt(recordUploadUrl?: string, showPrompt: boolean = true) {
    const recordingManager = RecordingManager.getInstance();

    // 清除时间限制
    const maxTimeout = recordingManager['maxRecordingTimeout'];
    if (maxTimeout) {
      clearTimeout(maxTimeout);
      recordingManager['maxRecordingTimeout'] = null;
    }

    // 获取当前recordId
    const recordId = recordingManager.getRecordId();

    // 通知其他页面录制已停止
    const stopNotification = {
      pageId: CrossPageCoordinator.getInstance()['pageId'],
      timestamp: Date.now(),
      recordId: recordId
    };
    StorageManager.setItem(STORAGE_KEYS.RECORDING_STOP_NOTIFICATION, JSON.stringify(stopNotification));

    // 停止录制
    recordingManager.stopRecording(recordUploadUrl);

    // 检查是否是录制开始的原始页面
    const originalPage = StorageManager.getItem(STORAGE_KEYS.RECORDING_ORIGINAL_PAGE);
    const currentPage = window.location.href;
    const isOriginalPage = originalPage === currentPage || originalPage === null;
    
    // 强制退出画笔模式（无论当前状态如何）
    this.forceExitDrawingMode();

    // 确保总是清理recordId和相关数据
    const cleanupRecordingData = () => {
      StorageManager.clearRecordingData();
      recordingManager['recordId'] = null;
    };

    if (recordId && showPrompt) {
      // 用户主动停止录制，显示弹窗并清理数据
      if (isOriginalPage) {
        // 在原始页面显示完整的描述弹窗
        this.showDescriptionModal(recordId, recordUploadUrl);
      } else {
        // 在非原始页面调用API并显示简单提示弹窗
        this.updateRecordDescription(recordId, '', recordUploadUrl)
          .then(() => {
            // 显示简单的完成提示弹窗
            Modal.show({
              title: '录制已完成！',
              content: '您的录屏已保存。',
              confirmText: '完成',
              onConfirm: () => {
                // 用户确认关闭弹窗
                cleanupRecordingData();
              }
            });
          })
          .catch(error => {
            console.error('更新录制描述失败:', error);
            // 即使失败也要显示完成提示
            Modal.show({
              title: '录制已完成！',
              content: '您的录屏已保存。',
              confirmText: '完成',
              onConfirm: () => {
                // 用户确认关闭弹窗
                cleanupRecordingData();
              }
            });
          })
          .then(() => {
            // 确保清除所有录制相关的localStorage数据
            cleanupRecordingData();
          });
      }
    } else if (recordId) {
      // 自动停止录制（如超时等情况），也需要清理数据
      cleanupRecordingData();
    }
  }

  private showDescriptionModal(currentRecordId: string, recordUploadUrl?: string) {
    Modal.show({
      title: '录制完成',
      content: '请输入本次录屏的描述：',
      showInput: true,
      placeholder: '请输入描述信息（可选）',
      confirmText: '完成录制',
      cancelText: '稍后填写',
      onConfirm: (description?: string) => {
        this.updateRecordDescription(currentRecordId, description || '', recordUploadUrl)
          .then(() => {
            // 更新描述成功后，显示回放地址弹窗
            this.showReplayModal(currentRecordId);
          })
          .catch(error => {
            console.error('更新描述失败:', error);
            // 即使失败也要显示回放地址弹窗
            this.showReplayModal(currentRecordId);
          })
          .then(() => {
            // 确保清除所有录制相关的localStorage数据
            StorageManager.clearRecordingData();
            const recordingManager = RecordingManager.getInstance();
            recordingManager['recordId'] = null;
          });
      },
      onCancel: () => {
        // 用户取消了描述输入，但仍然要显示回放地址
        this.updateRecordDescription(currentRecordId, '', recordUploadUrl)
          .then(() => {
            this.showReplayModal(currentRecordId);
          })
          .catch(error => {
            console.error('更新描述失败:', error);
            this.showReplayModal(currentRecordId);
          })
          .then(() => {
            // 确保清除所有录制相关的localStorage数据
            StorageManager.clearRecordingData();
            const recordingManager = RecordingManager.getInstance();
            recordingManager['recordId'] = null;
          });
      }
    });
  }

  private async updateRecordDescription(recordId: string, description: string, recordUploadUrl?: string) {
    if (!recordUploadUrl) return;

    try {
      const response = await fetch(`${recordUploadUrl}/${recordId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  private showReplayModal(currentRecordId: string) {
    const replayUrl = `${this.replayUrl}?id=${currentRecordId}`;

    Modal.show({
      title: '录制已完成！',
      content: '',
      confirmText: '完成',
    });

    // 添加URL显示和复制按钮
    const addUrlContent = () => {
      let modalBody = document.querySelector('.modal-body') as HTMLElement;

      // 如果还没有找到modal body，重试
      if (!modalBody) {
        modalBody = document.querySelector('.modal-body') as HTMLElement;
        if (modalBody) {
          addUrlContentToModal(modalBody);
        }
        return;
      }

      addUrlContentToModal(modalBody);
    };

    const addUrlContentToModal = (modalBody: HTMLElement) => {
      // 创建URL显示区域
      const urlContainer = document.createElement('div');
      urlContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      urlContainer.addEventListener('mouseenter', () => {
        urlContainer.style.borderColor = '#cbd5e1';
        urlContainer.style.backgroundColor = '#f1f5f9';
      });

      urlContainer.addEventListener('mouseleave', () => {
        urlContainer.style.borderColor = '#e2e8f0';
        urlContainer.style.backgroundColor = '#f8fafc';
      });

      const urlLabel = document.createElement('div');
      urlLabel.style.cssText = `
        font-size: 14px;
        color: #64748b;
        margin-bottom: 8px;
        font-weight: 600;
      `;
      urlLabel.textContent = '回放地址：';

      const urlText = document.createElement('div');
      urlText.style.cssText = `
        word-break: break-all;
        color: #334155;
        font-size: 15px;
        line-height: 1.5;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
        background: #ffffff;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin-bottom: 16px;
      `;
      urlText.textContent = replayUrl;

      const copyButton = document.createElement('button');
      copyButton.textContent = '📋 复制链接';
      copyButton.style.cssText = `
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 8px;
        border: none;
        background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
        color: white;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
      `;

      copyButton.addEventListener('mouseenter', () => {
        copyButton.style.transform = 'translateY(-2px)';
        copyButton.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.3)';
      });

      copyButton.addEventListener('mouseleave', () => {
        copyButton.style.transform = 'translateY(0)';
        copyButton.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.2)';
      });

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(replayUrl).then(() => {
          copyButton.textContent = '✓ 已复制';
          copyButton.style.background = 'linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)';

          setTimeout(() => {
            copyButton.textContent = '📋 复制链接';
            copyButton.style.background = 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)';
          }, 2000);
        }).catch(() => {
          console.error('复制失败，请手动复制');
        });
      });

      urlContainer.appendChild(urlLabel);
      urlContainer.appendChild(urlText);
      urlContainer.appendChild(copyButton);

      // 插入到modal-body的开头，这样链接会最先显示
      modalBody.insertBefore(urlContainer, modalBody.firstChild);
    };

    // 立即尝试添加内容，如果没有找到modal body则重试
    setTimeout(() => {
      addUrlContent();
    }, 200)
  }

  private setupDraggable(bar: HTMLElement) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    bar.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest('button')) return; // 如果点击的是按钮，则不触发拖拽

      dragging = true;
      const rect = bar.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      bar.style.transition = "none";
      bar.style.cursor = "grabbing";
      e.preventDefault(); // 防止默认行为
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging || !this.toolbar) return;
      // 计算新的位置
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;

      // 确保不会拖出屏幕边界
      const maxX = window.innerWidth - this.toolbar.offsetWidth;
      const maxY = window.innerHeight - this.toolbar.offsetHeight;

      this.toolbar.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
      this.toolbar.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
      this.toolbar.style.right = 'auto'; // 移除right属性以避免冲突
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
      if (this.toolbar) {
        this.toolbar.style.cursor = "grab";
        this.toolbar.style.transition = "max-height .28s ease";
      }
    });
  }

  private setupNetworkInterception() {
    // 监听网络请求事件
    // 这里的实现会与重构后的网络拦截模块集成
  }

  // ============= 绘图功能 =============
  private enableDrawingMode() {
    if (!this.drawingCanvas) {
      this.drawingCanvas = document.createElement("canvas");
      this.drawingCanvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
          z-index: 999998;
          cursor: crosshair;
        `;
      this.drawingCanvas.width = window.innerWidth;
      this.drawingCanvas.height = window.innerHeight;

      // 简化rrweb相关属性，避免过多自定义属性导致回放问题
      this.drawingCanvas.setAttribute('data-drawing-canvas', 'true');

      // 确保canvas有唯一的ID用于rrweb追踪
      this.drawingCanvas.id = 'drawing-canvas-' + Date.now();

      this.drawingCtx = this.drawingCanvas.getContext("2d");
      if (this.drawingCtx) {
        this.drawingCtx.strokeStyle = "#ff0000";
        this.drawingCtx.lineWidth = 3;
        this.drawingCtx.lineCap = "round";
        this.drawingCtx.lineJoin = "round";
      }

      document.body.appendChild(this.drawingCanvas);
      this.setupDrawingEvents();
    } else {
      this.drawingCanvas.style.display = "block";
      // 重新初始化drawingCtx以确保属性正确
      this.drawingCtx = this.drawingCanvas.getContext("2d");
      if (this.drawingCtx) {
        this.drawingCtx.strokeStyle = "#ff0000";
        this.drawingCtx.lineWidth = 3;
        this.drawingCtx.lineCap = "round";
        this.drawingCtx.lineJoin = "round";
      }
    }
  }

  private disableDrawingMode() {
    if (this.drawingCanvas) {
      this.drawingCanvas.style.display = "none";
    }
  }

  private clearCanvas() {
    if (this.drawingCanvas && this.drawingCtx) {
      this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }
  }

  private forceExitDrawingMode() {
    // 无条件退出画笔模式并清理相关资源
    if (this.drawingCanvas) {
      this.clearCanvas();
      this.disableDrawingMode();
    }

    // 重置画笔模式标志
    this.isDrawingMode = false;

    // 清除画笔模式状态
    StorageManager.setItem(STORAGE_KEYS.WAS_IN_DRAWING_MODE, 'false');

    // 更新UI按钮状态（如果存在）
    const bar = document.getElementById("fun-toolbar");
    if (bar && bar.children[2]) {
      const penBtn = bar.children[2] as HTMLElement;
      penBtn.style.background = "#fff";
      penBtn.style.color = "#aaa";
    }

    clearInterval(this.timerInterval);
    this.timer!.style.opacity = "0";
  }

  private setupDrawingEvents() {
    if (!this.drawingCanvas) return;

    this.drawingCanvas.addEventListener("mousedown", (e) => {
      if (!this.drawingCtx) return;

      this.isMouseDown = true;
      this.drawingCtx.beginPath();
      this.drawingCtx.moveTo(e.clientX, e.clientY);
      e.preventDefault();
    });

    this.drawingCanvas.addEventListener("mousemove", (e) => {
      if (!this.isMouseDown || !this.drawingCtx) return;

      this.drawingCtx.lineTo(e.clientX, e.clientY);
      this.drawingCtx.stroke();

      e.preventDefault();
    });

    this.drawingCanvas.addEventListener("mouseup", () => {
      this.isMouseDown = false;
      if (this.drawingCtx) {
        this.drawingCtx.closePath();
      }
    });

    this.drawingCanvas.addEventListener("mouseleave", () => {
      this.isMouseDown = false;
      if (this.drawingCtx) {
        this.drawingCtx.closePath();
      }
    });

    // 处理窗口大小变化
    window.addEventListener("resize", () => {
      if (this.drawingCanvas) {
        this.drawingCanvas.width = window.innerWidth;
        this.drawingCanvas.height = window.innerHeight;
        if (this.drawingCtx) {
          this.drawingCtx.strokeStyle = "#ff0000";
          this.drawingCtx.lineWidth = 3;
          this.drawingCtx.lineCap = "round";
          this.drawingCtx.lineJoin = "round";
        }
      }
    });
  }
}