export function createChiiErudaPlugin(targetJs: string) {
  let _$el: any = null;

  function injectJs() {
    if (!document.getElementById("edura-chii-script")) {
      const script = document.createElement("script");
      script.id = "edura-chii-script";
      script.src = targetJs;
      document.body.appendChild(script);
    }
    renderButton();
  }

  function removeJs() {
    const script = document.getElementById("edura-chii-script");
    if (script) script.remove();
    renderButton();
  }

  function renderButton() {
    if (!_$el) return;
    const isInjected = !!document.getElementById("edura-chii-script");

    if (isInjected) {
      _$el.html(`
        <button style="padding:10px;font-size:22px;background:#ff5b5b;color:#fff;border:none;border-radius:6px;margin:15px auto;"
          onclick="window.__edura_chii_remove()">
          关闭远程调试
        </button>
      `);
    } else {
      _$el.html(`
        <button style="padding:10px;font-size:22px;background:#5b93ff;color:#fff;border:none;border-radius:6px;margin:15px auto;"
          onclick="window.__edura_chii_inject()">
          开启远程调试
        </button>
      `);
    }
  }

  (window as any).__edura_chii_inject = injectJs;
  (window as any).__edura_chii_remove = removeJs;

  return {
    name: "远程调试",
    init($el: any) {
      _$el = $el;
      renderButton();
    },
    show() {
      _$el && _$el.show();
    },
    hide() {
      _$el && _$el.hide();
    },
    destroy() { }
  };
}