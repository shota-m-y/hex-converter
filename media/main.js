// @ts-check
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();
  const $ = (/** @type {string} */ id) => /** @type {HTMLInputElement} */ (document.getElementById(id));
  const WIDTHS = [8, 16, 32, 64];

  const setInvalid = (/** @type {HTMLElement} */ el, /** @type {boolean} */ invalid) =>
    el.closest('.field')?.classList.toggle('invalid', invalid);

  const group = (/** @type {string} */ s, /** @type {number} */ size) =>
    s.padStart(Math.ceil(s.length / size) * size, '0').match(new RegExp(`.{${size}}`, 'g'))?.join(' ') ?? '';

  // ---------------------------------------------------------------- number

  let width = 32;
  let value = 0n;

  /** @param {RegExp} digits @param {string} prefix @param {RegExp} strip */
  const radixParser = (digits, prefix, strip) => (/** @type {string} */ raw) => {
    const s = raw.replace(/[\s_,]/g, '').replace(strip, '');
    if (s === '') return 0n;
    return digits.test(s) ? BigInt(prefix + s) : null;
  };

  /** @type {Record<string, {parse: (s: string) => bigint | null, format: (v: bigint) => string}>} */
  const numberFields = {
    dec: {
      parse: (raw) => {
        const s = raw.replace(/[\s_,]/g, '');
        if (s === '' || s === '-') return 0n;
        return /^-?\d+$/.test(s) ? BigInt(s) : null;
      },
      format: (v) => v.toString(10),
    },
    hex: {
      parse: radixParser(/^[0-9a-f]+$/i, '0x', /^0x/i),
      format: (v) => v.toString(16).toUpperCase(),
    },
    bin: {
      parse: radixParser(/^[01]+$/, '0b', /^0b/i),
      format: (v) => group(v.toString(2), 4),
    },
    oct: {
      parse: radixParser(/^[0-7]+$/, '0o', /^0o/i),
      format: (v) => v.toString(8),
    },
    chr: {
      parse: (raw) => {
        const bytes = new TextEncoder().encode(raw);
        if (bytes.length > 8) return null;
        return bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
      },
      format: (v) => {
        if (v === 0n) return '';
        const hex = v.toString(16);
        const bytes = (hex.length % 2 ? '0' + hex : hex).match(/../g)?.map((h) => parseInt(h, 16)) ?? [];
        return bytes.every((b) => b >= 0x20 && b <= 0x7e) ? String.fromCharCode(...bytes) : '';
      },
    },
  };

  /**
   * Fits `v` into the current width (growing it if needed) as an unsigned value.
   * @param {bigint} v
   * @returns {boolean} false when the value does not fit in 64 bits
   */
  function setValue(v) {
    const fits = (/** @type {number} */ w) =>
      v < 0n ? v >= -(1n << BigInt(w - 1)) : v < 1n << BigInt(w);
    const w = WIDTHS.find((candidate) => candidate >= width && fits(candidate));
    if (!w) return false;
    width = w;
    value = v < 0n ? v + (1n << BigInt(w)) : v;
    return true;
  }

  /** @param {string} [source] id of the field being edited (left untouched) */
  function renderNumber(source) {
    for (const [id, field] of Object.entries(numberFields)) {
      const el = $(id);
      if (id !== source) {
        el.value = field.format(value);
        setInvalid(el, false);
      }
    }
    const top = 1n << BigInt(width - 1);
    $('signed').textContent = (value >= top ? value - (top << 1n) : value).toString(10);

    document.querySelectorAll('#widths button').forEach((button) => {
      button.classList.toggle('active', Number(/** @type {HTMLElement} */ (button).dataset.width) === width);
    });

    const bits = $('bits');
    bits.textContent = '';
    for (let hi = width - 1; hi >= 0; hi -= 4) {
      const nibble = document.createElement('div');
      nibble.className = 'nibble';
      const row = document.createElement('div');
      row.className = 'nibble-bits';
      for (let i = hi; i > hi - 4; i--) {
        const on = ((value >> BigInt(i)) & 1n) === 1n;
        const bit = document.createElement('button');
        bit.type = 'button';
        bit.className = on ? 'bit on' : 'bit';
        bit.textContent = on ? '1' : '0';
        bit.title = `bit ${i}`;
        bit.dataset.bit = String(i);
        row.appendChild(bit);
      }
      const hex = document.createElement('span');
      hex.className = 'nibble-hex';
      hex.textContent = ((value >> BigInt(hi - 3)) & 0xfn).toString(16).toUpperCase();
      nibble.append(row, hex);
      bits.appendChild(nibble);
    }
  }

  for (const [id, field] of Object.entries(numberFields)) {
    $(id).addEventListener('input', (event) => {
      const el = /** @type {HTMLInputElement} */ (event.target);
      const parsed = field.parse(el.value);
      const ok = parsed !== null && setValue(parsed);
      setInvalid(el, !ok);
      if (ok) renderNumber(id);
    });
  }

  $('widths').addEventListener('click', (event) => {
    const w = Number(/** @type {HTMLElement} */ (event.target).dataset.width);
    if (!w) return;
    width = w;
    value &= (1n << BigInt(w)) - 1n;
    renderNumber();
  });

  $('bits').addEventListener('click', (event) => {
    const index = /** @type {HTMLElement} */ (event.target).dataset.bit;
    if (index === undefined) return;
    value ^= 1n << BigInt(index);
    renderNumber();
  });

  // ------------------------------------------------------------------ text

  /** @param {number} radix @param {RegExp} digits @param {RegExp} strip */
  const bytesParser = (radix, digits, strip) => (/** @type {string} */ raw) => {
    let tokens = raw.trim().split(/[\s,]+/).filter(Boolean).map((t) => t.replace(strip, ''));
    // "48656C6C6F" -> 48 65 6C 6C 6F
    if (radix === 16 && tokens.length === 1 && tokens[0].length > 2 && tokens[0].length % 2 === 0) {
      tokens = tokens[0].match(/../g) ?? [];
    }
    const bytes = [];
    for (const token of tokens) {
      const n = digits.test(token) ? parseInt(token, radix) : NaN;
      if (!(n >= 0 && n <= 255)) return null;
      bytes.push(n);
    }
    return bytes;
  };

  const joinBytes = (/** @type {number} */ radix, /** @type {number} */ pad) => (/** @type {number[]} */ bytes) =>
    bytes.map((b) => b.toString(radix).toUpperCase().padStart(pad, '0')).join(' ');

  /** @type {Record<string, {parse: (s: string) => number[] | null, format: (b: number[]) => string}>} */
  const textFields = {
    txt: {
      parse: (raw) => [...new TextEncoder().encode(raw)],
      format: (bytes) => new TextDecoder().decode(new Uint8Array(bytes)),
    },
    thex: { parse: bytesParser(16, /^[0-9a-f]+$/i, /^0x/i), format: joinBytes(16, 2) },
    tdec: { parse: bytesParser(10, /^\d+$/, /^$/), format: joinBytes(10, 1) },
    tbin: { parse: bytesParser(2, /^[01]+$/, /^0b/i), format: joinBytes(2, 8) },
  };

  /** @param {number[]} bytes @param {string} [source] */
  function renderText(bytes, source) {
    for (const [id, field] of Object.entries(textFields)) {
      const el = $(id);
      if (id !== source) {
        el.value = field.format(bytes);
        setInvalid(el, false);
      }
    }
    $('byteCount').textContent = `${bytes.length} byte`;
  }

  for (const [id, field] of Object.entries(textFields)) {
    $(id).addEventListener('input', (event) => {
      const el = /** @type {HTMLInputElement} */ (event.target);
      const bytes = field.parse(el.value);
      setInvalid(el, bytes === null);
      if (bytes) renderText(bytes, id);
    });
  }

  // ---------------------------------------------------------------- shared

  /** @type {number | undefined} */
  let toastTimer;
  document.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest('[data-copy]');
    if (!button) return;
    event.preventDefault();
    const text = $(/** @type {HTMLElement} */ (button).dataset.copy ?? '').value;
    if (!text) return;
    vscode.postMessage({ type: 'copy', text });
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1200);
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type !== 'init') return;
    if (message.kind === 'number') {
      width = 8;
      if (!setValue(BigInt(message.value))) {
        width = 64;
        value = BigInt(message.value) & ((1n << 64n) - 1n);
      }
      renderNumber();
      $('dec').focus();
    } else {
      $('txt').value = message.text;
      renderText(textFields.txt.parse(message.text) ?? [], 'txt');
      $('txt').focus();
    }
  });

  renderNumber();
  renderText([]);
  $('dec').value = '';
  $('dec').focus();
  vscode.postMessage({ type: 'ready' });
})();
