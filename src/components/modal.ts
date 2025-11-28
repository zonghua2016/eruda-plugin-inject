import { ModalConfig } from '../types';
import { CSS_CLASSES } from '../constants';
import { createAnimation } from '../utils/animations';

export class Modal {
  private static modalContainer: HTMLElement | null = null;

  static show(config: ModalConfig): void {
    this.createModal(config);
  }

  private static createModal(config: ModalConfig): void {
    // 创建模态框遮罩
    const modalMask = document.createElement('div');
    modalMask.className = CSS_CLASSES.MODAL_MASK;
    modalMask.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1000;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.45);
      animation: ${createAnimation('fadeIn')};
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;

    // 创建模态框内容容器
    const modalDialog = document.createElement('div');
    modalDialog.className = CSS_CLASSES.MODAL_DIALOG;
    modalDialog.style.cssText = `
      position: relative;
      background: #ffffff;
      border-radius: 12px;
      box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 32px;
      width: 480px;
      max-width: calc(100vw - 32px);
      animation: ${createAnimation('slideUp')};
      overflow: hidden;
    `;

    // 添加渐变背景装饰
    const decoration = document.createElement('div');
    decoration.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
    `;
    modalDialog.appendChild(decoration);

    // 创建模态框头部
    const modalHeader = this.createModalHeader(config.title);
    modalDialog.appendChild(modalHeader);

    // 创建模态框主体
    const modalBody = this.createModalBody(config);
    modalDialog.appendChild(modalBody);

    // 创建模态框底部
    const modalFooter = this.createModalFooter(config, modalMask);
    modalDialog.appendChild(modalFooter);

    // 组装模态框
    modalMask.appendChild(modalDialog);
    document.body.appendChild(modalMask);

    this.modalContainer = modalMask;

    // 设置事件监听
    this.setupEventListeners(modalMask, config);
  }

  private static createModalHeader(title: string): HTMLElement {
    const modalHeader = document.createElement('div');
    modalHeader.className = CSS_CLASSES.MODAL_HEADER;
    modalHeader.style.cssText = `
      margin-bottom: 24px;
      text-align: center;
    `;

    // 添加图标
    const iconElement = document.createElement('div');
    iconElement.innerHTML = '✨';
    iconElement.style.cssText = `
      font-size: 48px;
      margin-bottom: 16px;
      animation: bounce 1s infinite;
    `;

    const modalTitle = document.createElement('div');
    modalTitle.className = CSS_CLASSES.MODAL_TITLE;
    modalTitle.style.cssText = `
      margin: 0;
      color: #1a1a1a;
      font-weight: 700;
      font-size: 24px;
      line-height: 1.3;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-fill-color: transparent;
    `;
    modalTitle.textContent = title;

    modalHeader.appendChild(iconElement);
    modalHeader.appendChild(modalTitle);

    return modalHeader;
  }

  private static createModalBody(config: ModalConfig): HTMLElement {
    const modalBody = document.createElement('div');
    modalBody.className = CSS_CLASSES.MODAL_BODY;
    modalBody.style.cssText = `
      margin-bottom: 32px;
    `;

    const bodyParagraph = document.createElement('p');
    bodyParagraph.style.cssText = `
      margin-bottom: 20px;
      color: #6b7280;
      font-size: 16px;
      line-height: 1.6;
      text-align: center;
      font-weight: 500;
    `;
    bodyParagraph.textContent = config.content;
    modalBody.appendChild(bodyParagraph);

    // 如果需要输入框
    if (config.showInput) {
      const inputContainer = this.createInputContainer(config.placeholder);
      modalBody.appendChild(inputContainer);
    }

    return modalBody;
  }

  private static createInputContainer(placeholder?: string): HTMLElement {
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      position: relative;
      margin-bottom: 8px;
    `;

    // 创建输入框元素
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.placeholder = placeholder || '请输入内容';
    inputElement.className = 'modern-input';
    inputElement.style.cssText = `
      width: 100%;
      padding: 16px 20px;
      font-size: 16px;
      line-height: 1.5;
      color: #1f2937;
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
    `;

    // 添加焦点和悬停效果
    inputElement.addEventListener('focus', () => {
      inputElement.style.backgroundColor = '#ffffff';
      inputElement.style.borderColor = '#3b82f6';
      inputElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
      inputElement.style.transform = 'translateY(-2px)';
    });

    inputElement.addEventListener('blur', () => {
      inputElement.style.backgroundColor = '#f9fafb';
      inputElement.style.borderColor = '#e5e7eb';
      inputElement.style.boxShadow = 'none';
      inputElement.style.transform = 'translateY(0)';
    });

    inputContainer.appendChild(inputElement);

    // 将input元素附加到容器上，方便后续获取值
    (inputContainer as any).inputElement = inputElement;

    return inputContainer;
  }

  private static createModalFooter(config: ModalConfig, modalMask: HTMLElement): HTMLElement {
    const modalFooter = document.createElement('div');
    modalFooter.className = CSS_CLASSES.MODAL_FOOTER;
    modalFooter.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // 创建取消按钮
    if (config.onCancel) {
      const cancelButton = this.createButton(
        config.cancelText || '取消',
        false,
        () => {
          this.closeModal(modalMask);
          if (config.onCancel) config.onCancel();
        }
      );
      modalFooter.appendChild(cancelButton);
    }

    // 创建确认按钮
    if (config.onConfirm) {
      const confirmButton = this.createButton(
        config.confirmText || '确认',
        true,
        () => {
          const inputContainer = modalMask.querySelector('.modern-input')?.parentElement;
          const inputValue = inputContainer ? (inputContainer as any).inputElement.value : '';

          this.closeModal(modalMask);
          if (config.onConfirm) config.onConfirm(inputValue);
        }
      );
      modalFooter.appendChild(confirmButton);
    }

    return modalFooter;
  }

  private static createButton(text: string, isPrimary: boolean, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;

    if (isPrimary) {
      button.style.cssText = `
        padding: 14px 28px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        color: white;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
        flex: 1;
        max-width: 160px;
        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.3)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.2)';
      });
    } else {
      button.style.cssText = `
        padding: 14px 28px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 12px;
        border: 2px solid #e5e7eb;
        background: #f9fafb;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
        flex: 1;
        max-width: 160px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      `;

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f3f4f6';
        button.style.borderColor = '#d1d5db';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#f9fafb';
        button.style.borderColor = '#e5e7eb';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
      });
    }

    button.addEventListener('click', onClick);

    return button;
  }

  private static setupEventListeners(modalMask: HTMLElement, config: ModalConfig): void {
    // ESC键关闭弹窗
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeModal(modalMask);
        if (config.onCancel) config.onCancel();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    // 点击遮罩关闭弹窗
    modalMask.addEventListener('click', (e) => {
      if (e.target === modalMask) {
        this.closeModal(modalMask);
        if (config.onCancel) config.onCancel();
      }
    });

    // 移除事件监听
    const cleanup = () => {
      document.removeEventListener('keydown', handleEscKey);
    };

    // 将清理函数添加到模态框的dataset中
    (modalMask as any).cleanup = cleanup;
  }

  private static closeModal(modalMask: HTMLElement): void {
    modalMask.style.animation = 'fadeOut 0.2s ease-out forwards';
    setTimeout(() => {
      if (modalMask.parentNode) {
        modalMask.parentNode.removeChild(modalMask);
        // 执行清理函数
        if ((modalMask as any).cleanup) {
          (modalMask as any).cleanup();
        }
      }
      if (this.modalContainer === modalMask) {
        this.modalContainer = null;
      }
    }, 200);
  }

  static close(): void {
    if (this.modalContainer) {
      this.closeModal(this.modalContainer);
    }
  }
}