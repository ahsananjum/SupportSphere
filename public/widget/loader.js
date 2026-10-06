(function () {
  'use strict';
  var script = document.currentScript;
  var key = script && script.getAttribute('data-widget-key');
  if (!script || !key || script.dataset.loaded === 'true') return;
  script.dataset.loaded = 'true';
  var base = new URL(script.src).origin;
  var frame = document.createElement('iframe');
  frame.title = 'Customer support';
  frame.setAttribute('referrerpolicy', 'origin');
  frame.setAttribute('allow', 'clipboard-write');
  frame.style.cssText =
    'position:fixed;right:12px;bottom:12px;width:72px;height:72px;border:0;background:transparent;z-index:2147483000;color-scheme:light;';
  document.body.appendChild(frame);
  function resize(open) {
    frame.style.width = open ? 'min(390px, calc(100vw - 24px))' : '72px';
    frame.style.height = open ? 'min(640px, calc(100dvh - 24px))' : '72px';
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== base || event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === 'supportsphere:resize')
      resize(event.data.open === true);
  });
  function load() {
    fetch(base + '/api/widget/config?key=' + encodeURIComponent(key), {
      mode: 'cors',
      cache: 'no-store',
    })
      .then(function (response) {
        if (!response.ok) throw new Error('unavailable');
        return response.json();
      })
      .then(function (config) {
        if (
          typeof config.framePath !== 'string' ||
          !config.framePath.startsWith('/widget?bootstrap=')
        )
          throw new Error('invalid frame');
        frame.src = base + config.framePath;
      })
      .catch(function () {
        frame.src = base + '/widget/unavailable';
        resize(true);
        window.dispatchEvent(
          new CustomEvent('supportsphere:error', {
            detail: { reason: 'unavailable' },
          }),
        );
      });
  }
  load();
})();
