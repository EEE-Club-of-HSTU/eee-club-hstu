// Markdown + DOMPurify + KaTeX renderer for EEE Club of HSTU.
// Pinned CDN dependencies (all verified HTTP 200).
const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js';
const DOMPURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js';
const KATEX_CSS_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css';
const KATEX_JS_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js';
const KATEX_AUTORENDER_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js';

const SRI = {
  [MARKED_URL]: 'sha384-H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR',
  [DOMPURIFY_URL]: 'sha384-eEu5CTj3qGvu9PdJuS+YlkNi7d2XxQROAFYOr59zgObtlcux1ae1Il3u7jvdCSWu',
  [KATEX_CSS_URL]: 'sha384-zh0CIslj+VczCZtlzBcjt5ppRcsAmDnRem7ESsYwWwg3m/OaJ2l4x7YBZl9Kxxib',
  [KATEX_JS_URL]: 'sha384-Rma6DA2IPUwhNxmrB/7S3Tno0YY7sFu9WSYMCuulLhIqYSGZ2gKCJWIqhBWqMQfh',
  [KATEX_AUTORENDER_URL]: 'sha384-hCXGrW6PitJEwbkoStFjeJxv+fSOOQKOPbJxSfM6G5sWZjAyWhXiTIIAmQqnlLlh',
};

let depsPromise = null;

function loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.integrity = SRI[href];
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.integrity = SRI[src];
    s.crossOrigin = 'anonymous';
    s.addEventListener('load', () => {
      s.dataset.loaded = '1';
      resolve();
    }, { once: true });
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(s);
  });
}

async function ensureDeps() {
  if (!depsPromise) {
    depsPromise = (async () => {
      loadCss(KATEX_CSS_URL);
      await Promise.all([
        loadScript(MARKED_URL),
        loadScript(DOMPURIFY_URL),
        loadScript(KATEX_JS_URL),
      ]);
      await loadScript(KATEX_AUTORENDER_URL);
    })().catch((err) => {
      depsPromise = null;
      throw err;
    });
  }
  return depsPromise;
}

/**
 * Protect fenced/inline code, extract $...$, $$...$$, \(...\), \[...\] math into tokens,
 * then restore code blocks before Marked parses the Markdown.
 */
function extractMath(markdown) {
  const codeSlots = [];
  const mathTokens = [];

  let text = String(markdown || '');
  text = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g, (m) => {
    const idx = codeSlots.length;
    codeSlots.push(m);
    return `EEECODESLOT${idx}END`;
  });

  const pushMath = (raw) => {
    const idx = mathTokens.length;
    mathTokens.push(raw);
    return `EEEMATHTOKEN${idx}END`;
  };

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m) => pushMath(m));
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (m) => pushMath(m));
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (m) => pushMath(m));
  text = text.replace(/(^|[^\\$])\$(?!\$)([^$\n]*[^\\$])\$/g, (m, pre, inner) => {
    if (!inner.trim()) return m;
    return `${pre}${pushMath(`$${inner}$`)}`;
  });

  text = text.replace(/EEECODESLOT(\d+)END/g, (_m, i) => codeSlots[Number(i)]);
  return { text, mathTokens };
}

export async function renderMarkdown(container, markdown) {
  if (!container) return;
  const source = String(markdown || '');
  try {
    await ensureDeps();
  } catch (err) {
    console.warn('Markdown dependencies failed to load, falling back to plain text:', err);
    const p = document.createElement('p');
    p.style.whiteSpace = 'pre-line';
    p.textContent = source;
    container.replaceChildren(p);
    return;
  }

  const { text, mathTokens } = extractMath(source);
  const rawHtml = window.marked.parse(text, { gfm: true, breaks: false });

  const fragment = window.DOMPurify.sanitize(rawHtml, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'form', 'input',
      'textarea', 'select', 'button', 'style', 'link', 'meta', 'base',
    ],
    FORBID_ATTR: [
      'style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'srcdoc',
    ],
    ALLOW_DATA_ATTR: false,
  });

  // Sanitize links and images
  fragment.querySelectorAll('a').forEach((a) => {
    const clean = window.EEESafeUrl(a.getAttribute('href') || '');
    if (!clean) {
      a.removeAttribute('href');
    } else {
      a.setAttribute('href', clean);
      if (/^https?:\/\//i.test(clean)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } else {
        a.setAttribute('rel', 'noopener');
      }
    }
  });

  fragment.querySelectorAll('img').forEach((img) => {
    const clean = window.EEESafeUrl(img.getAttribute('src') || '');
    if (!clean) {
      img.remove();
    } else {
      img.setAttribute('src', clean);
      img.setAttribute('loading', 'lazy');
    }
  });

  // Wrap tables so wide tables scroll horizontally without breaking layout
  fragment.querySelectorAll('table').forEach((tbl) => {
    const wrap = document.createElement('div');
    wrap.className = 'prose-table-wrap';
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });

  // Restore LaTeX tokens into text nodes only (never HTML)
  if (mathTokens.length > 0) {
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes('EEEMATHTOKEN')) {
        textNodes.push(node);
      }
    }
    textNodes.forEach((tn) => {
      tn.nodeValue = tn.nodeValue.replace(/EEEMATHTOKEN(\d+)END/g, (_m, i) => mathTokens[Number(i)] || '');
    });
  }

  container.replaceChildren(fragment);

  if (typeof window.renderMathInElement === 'function') {
    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      strict: false,
    });
  }
}

window.EEEMarkdown = { renderMarkdown };
