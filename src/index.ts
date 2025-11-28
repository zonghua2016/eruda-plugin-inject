import { loadScript } from "./utils/script-loader";
import { createChiiErudaPlugin } from "./utils/chii-plugin";
import { Options } from './types';
import { UIManager } from './ui/ui-manager';
import { RecordingManager } from './recording/recording-manager';
import { CrossPageCoordinator } from './recording/cross-page-coordinator';
import { setupNetworkInterception } from './network/network-interceptor';

/**
 * 主函数
 * @param options.targetJs chii target.js 地址
 * @param options.erudaJs eruda CDN 地址，可选
 * @param options.recordUploadUrl 录制文件上传地址
 * @param options.replayUrl 录制文件回放地址
 */
export async function erudaPluginInject(options: Options) {
  window.onload = async () => {
    const erudaCdn =
      options.erudaJs || "https://s1.ssl.qhres2.com/!427798d6/eruda3.3.0.js";

    // 如果没有 eruda，全局加载
    if (!(window as any).eruda) {
      await loadScript(erudaCdn, "eruda-script");
    }

    const erudaInstance = (window as any).eruda;

    if (!erudaInstance) {
      throw new Error("Failed to load eruda");
    }

    // 初始化 eruda
    erudaInstance.init();

    // 添加 chii 插件
    options.targetJs && erudaInstance.add(createChiiErudaPlugin(options.targetJs));

    if (options.recordUploadUrl) {
      if (!options.replayUrl) {
        throw new Error("replayUrl is required when recordUploadUrl is provided");
      }
      // 初始化录制管理器
      // const recordingManager = RecordingManager.getInstance();

      // 初始化UI管理器
      const uiManager = UIManager.getInstance();
      uiManager.initialize(options.recordUploadUrl, options.replayUrl);

      // 初始化跨页面协调器
      const coordinator = CrossPageCoordinator.getInstance();
      coordinator.initialize(options.recordUploadUrl);

      // 设置网络拦截
      setupNetworkInterception();

      // 页面加载时检查是否有未完成的录制
      coordinator.checkAndResumeRecording();
    }
  }
}

export default erudaPluginInject;