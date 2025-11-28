import { RecordingManager } from '../recording/recording-manager';

// 保存原始的fetch和XMLHttpRequest方法
const originalFetch = window.fetch;
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

export function setupNetworkInterception() {
  // 拦截fetch请求
  window.fetch = async function (...args) {
    const req = new Request(...args);

    // 克隆 body
    let requestBody;
    if (req.clone().text) {
      try { requestBody = await req.clone().text(); } catch { }
    }

    const res = await originalFetch(...args);

    const clone = res.clone();

    let responseBody;
    try { responseBody = await clone.text(); } catch { }

    const recordingManager = RecordingManager.getInstance();
    recordingManager.pushNetworkEvent({
      tag: 'network',
      method: req.method,
      url: req.url,
      requestHeaders: Object.fromEntries(req.headers.entries()),
      requestBody,
      responseHeaders: Object.fromEntries(res.headers.entries()),
      responseBody,
      status: res.status,
    });

    return res;
  };

  // 拦截XMLHttpRequest
  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this._body = body;

    this.addEventListener('loadend', () => {
      const recordingManager = RecordingManager.getInstance();
      recordingManager.pushNetworkEvent({
        tag: 'network',
        method: this._method,
        url: this._url,
        requestHeaders: this._headers ?? {},
        requestBody: body,
        responseHeaders: this.getAllResponseHeaders(),
        responseBody: this.response,
        status: this.status,
      });
    });

    return originalXHRSend.apply(this, arguments);
  };

  const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (!this._headers) this._headers = {};
    this._headers[k] = v;
    return setRequestHeader.apply(this, arguments);
  };
}

export function restoreNetworkInterception() {
  // 恢复原始的fetch和XMLHttpRequest方法
  window.fetch = originalFetch;
  XMLHttpRequest.prototype.open = originalXHROpen;
  XMLHttpRequest.prototype.send = originalXHRSend;
  XMLHttpRequest.prototype.setRequestHeader = originalXHRSetRequestHeader;
}