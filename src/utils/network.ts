import { pack } from '@rrweb/packer';
import { NetworkEventData } from '../types';

export function createNetworkEvent(net: any): any {
  // 过滤掉录屏上传相关的请求，避免循环拦截
  const url = net?.request?.url || net?.url || '';
  if (url.includes('/record/') && (url.includes('/upload') || url.includes('/end'))) {
    return null; // 不记录录屏上传相关的请求
  }

  // 增加更全面的过滤，避免记录无意义的请求
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome-extension:')) {
    return null; // 过滤掉内部资源请求
  }

  try {
    // 添加更多元数据以提高记录的准确性
    const enrichedNet = {
      ...net,
      timestamp: Date.now(),
      userAgent: window.navigator.userAgent,
      pageUrl: window.location.href,
      devicePixelRatio: window.devicePixelRatio,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    return pack({
      type: 5,
      timestamp: Date.now(),
      data: {
        tag: "network",
        payload: enrichedNet,
      },
    });
  } catch (error) {
    // 防止网络事件记录失败影响录制功能
    console.warn('Failed to record network event:', error);
    return null;
  }
}