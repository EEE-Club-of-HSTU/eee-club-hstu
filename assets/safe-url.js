/* Shared URL safety helper for EEE Club of HSTU.
   Allows only http(s) URLs and same-origin relative URLs. */
(function () {
  'use strict';

  function safeUrl(u, fallback) {
    if (fallback === undefined) fallback = '';
    if (typeof u !== 'string') return fallback;

    var value = u.replace(/[\u0000-\u001F\u007F\s]/g, '');
    if (!value) return fallback;

    var resolved;
    try {
      resolved = new URL(value, location.href);
    } catch (_e) {
      return fallback;
    }

    if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return fallback;
    if (resolved.origin === location.origin) return value;
    return resolved.href;
  }

  window.EEESafeUrl = safeUrl;
})();
