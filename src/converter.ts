export type Base = 2 | 8 | 10 | 16;

export interface ParsedNumber {
  value: bigint;
  base: Base;
  /** Explicit bit width (Verilog style literals such as 8'hFF). */
  width?: number;
}

export interface Row {
  label: string;
  /** Text shown in the popup. */
  text: string;
  /** Text placed on the clipboard (defaults to `text`). */
  copy?: string;
}

export interface Section {
  title: string;
  detail?: string;
  rows: Row[];
}

export interface Token {
  text: string;
  start: number;
  end: number;
}

const BASE_NAME: Record<Base, string> = { 2: 'BIN', 8: 'OCT', 10: 'DEC', 16: 'HEX' };
const BASE_PREFIX: Record<Base, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
const BASE_DIGITS: Record<Base, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^\d+$/,
  16: /^[0-9a-fA-F]+$/,
};
const WIDTHS = [8, 16, 32, 64];
const MAX_SELECTION = 256;
const MAX_TEXT_BYTES = 64;

// C/C++/Rust/JS integer suffixes: 10u, 0xFFUL, 10n ...
const SUFFIX = /(?:[uU](?:ll|LL|[lL])?|(?:ll|LL|[lL])[uU]?|n)$/;

const TOKEN =
  /(?<![\w.])(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d+)?'[sS]?[hHbBdDoO][0-9a-fA-F_]+|\d[0-9a-fA-F]*[hH]|\d[\d_]*)(?:[uU](?:ll|LL|[lL])?|(?:ll|LL|[lL])[uU]?|n)?(?!\w|\.\d)/g;

const CONTROL_NAMES = [
  'NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'TAB', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI',
  'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US',
];

function make(digits: string, base: Base, width?: number): ParsedNumber | undefined {
  const clean = digits.replace(/_/g, '');
  if (!BASE_DIGITS[base].test(clean)) {
    return undefined;
  }
  return { value: BigInt(BASE_PREFIX[base] + clean), base, width };
}

/** Parses an unambiguous integer literal (0xFF, 0b1010, 0o17, 0FFh, 8'hFF, 255, 255UL ...). */
export function parseLiteral(raw: string): ParsedNumber | undefined {
  let m: RegExpExecArray | null;
  if ((m = /^(\d[0-9a-fA-F]*)[hH]$/.exec(raw))) {
    return make(m[1], 16);
  }
  const text = raw.replace(SUFFIX, '');
  if ((m = /^0[xX]([0-9a-fA-F_]+)$/.exec(text))) {
    return make(m[1], 16);
  }
  if ((m = /^0[bB]([01_]+)$/.exec(text))) {
    return make(m[1], 2);
  }
  if ((m = /^0[oO]([0-7_]+)$/.exec(text))) {
    return make(m[1], 8);
  }
  if ((m = /^(\d+)?'[sS]?([hHbBdDoO])([0-9a-fA-F_]+)$/.exec(text))) {
    const base = ({ h: 16, b: 2, d: 10, o: 8 } as Record<string, Base>)[m[2].toLowerCase()];
    const width = m[1] ? Number(m[1]) : undefined;
    return make(m[3], base, width && width <= 4096 ? width : undefined);
  }
  if (/^\d[\d_]*$/.test(text)) {
    return make(text, 10);
  }
  return undefined;
}

/** Finds the integer literal that touches `character` in a line of text. */
export function findToken(line: string, character: number): Token | undefined {
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(line))) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > character) {
      break;
    }
    if (character <= end) {
      return { text: m[0], start, end };
    }
  }
  return undefined;
}

function group(text: string, size: number): string {
  const padded = text.padStart(Math.ceil(text.length / size) * size, '0');
  return padded.match(new RegExp(`.{${size}}`, 'g'))!.join(' ');
}

function toBytes(value: bigint): number[] {
  let hex = value.toString(16);
  if (hex.length % 2) {
    hex = '0' + hex;
  }
  return hex.match(/../g)!.map((h) => parseInt(h, 16));
}

function isPrintable(bytes: number[]): boolean {
  return bytes.every((b) => b >= 0x20 && b <= 0x7e);
}

function asciiOf(value: bigint): string | undefined {
  if (value < 0x20n) {
    return CONTROL_NAMES[Number(value)];
  }
  if (value === 0x7fn) {
    return 'DEL';
  }
  const bytes = toBytes(value);
  if (bytes.length <= 8 && isPrintable(bytes)) {
    return `"${String.fromCharCode(...bytes)}"`;
  }
  return undefined;
}

function describeNumber(n: ParsedNumber): Section {
  const { value } = n;
  const bitLength = value === 0n ? 1 : value.toString(2).length;
  const width = n.width && n.width >= bitLength ? n.width : WIDTHS.find((w) => w >= bitLength);
  const bin = value.toString(2);
  const hex = value.toString(16).toUpperCase();

  const rows: Row[] = [
    { label: 'DEC', text: value.toString(10) },
    { label: 'HEX', text: '0x' + hex },
    { label: 'BIN', text: group(n.width && width === n.width ? bin.padStart(width, '0') : bin, 4), copy: '0b' + bin },
    { label: 'OCT', text: '0o' + value.toString(8) },
  ];
  if (width && value >> BigInt(width - 1) === 1n) {
    rows.push({ label: `INT${width}`, text: (value - (1n << BigInt(width))).toString(10) });
  }
  const ascii = asciiOf(value);
  if (ascii) {
    rows.push({ label: 'ASCII', text: ascii, copy: ascii.replace(/^"|"$/g, '') });
  }
  return { title: BASE_NAME[n.base], detail: `${width ?? bitLength} bit`, rows };
}

function describeNegative(value: bigint): Section {
  const width = WIDTHS.find((w) => value >= -(1n << BigInt(w - 1)));
  const rows: Row[] = [{ label: 'DEC', text: value.toString(10) }];
  if (width) {
    const twos = value + (1n << BigInt(width));
    const bin = twos.toString(2);
    rows.push(
      { label: 'HEX', text: '0x' + twos.toString(16).toUpperCase() },
      { label: 'BIN', text: group(bin, 4), copy: '0b' + bin },
      { label: `UINT${width}`, text: twos.toString(10) },
    );
  }
  return { title: 'DEC', detail: width ? `2の補数 · ${width} bit` : undefined, rows };
}

function describeText(text: string): Section | undefined {
  const bytes = [...Buffer.from(text, 'utf8')];
  if (bytes.length === 0 || bytes.length > MAX_TEXT_BYTES) {
    return undefined;
  }
  return {
    title: bytes.every((b) => b < 0x80) ? 'ASCII' : 'UTF-8',
    detail: `${bytes.length} byte`,
    rows: [
      { label: 'HEX', text: bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { label: 'DEC', text: bytes.map((b) => b.toString(10)).join(' ') },
      { label: 'BIN', text: bytes.map((b) => b.toString(2).padStart(8, '0')).join(' ') },
    ],
  };
}

/** "48 65 6C 6C 6F" / "0x48, 0x65" -> "Hello" */
function describeByteSequence(text: string): Section | undefined {
  if (!/^(?:(?:0[xX])?[0-9a-fA-F]{2}[\s,]+)+(?:0[xX])?[0-9a-fA-F]{2}$/.test(text)) {
    return undefined;
  }
  const bytes = text.split(/[\s,]+/).map((t) => parseInt(t.replace(/^0[xX]/, ''), 16));
  if (!isPrintable(bytes)) {
    return undefined;
  }
  const decoded = String.fromCharCode(...bytes);
  return {
    title: 'HEX バイト列',
    detail: `${bytes.length} byte`,
    rows: [
      { label: 'ASCII', text: `"${decoded}"`, copy: decoded },
      { label: 'DEC', text: bytes.join(' ') },
    ],
  };
}

/** Describes a single integer literal (used when hovering without a selection). */
export function analyzeToken(text: string): Section[] {
  const parsed = parseLiteral(text);
  return parsed ? [describeNumber(parsed)] : [];
}

/**
 * Describes arbitrary selected text. Text without a prefix is ambiguous, so every
 * plausible reading (decimal / hex / binary / plain text) gets its own section.
 */
export function analyzeSelection(selected: string): Section[] {
  const text = selected.trim();
  if (!text || text.length > MAX_SELECTION) {
    return [];
  }
  if (/^-\s*\d[\d_]*$/.test(text)) {
    const value = -BigInt(text.replace(/[-\s_]/g, ''));
    return [value === 0n ? describeNumber({ value: 0n, base: 10 }) : describeNegative(value)];
  }

  const bytes = describeByteSequence(text);
  if (bytes) {
    return [bytes];
  }

  const sections: Section[] = [];
  const literal = parseLiteral(text);
  if (literal) {
    sections.push(describeNumber(literal));
  }
  const bare = text.replace(/_/g, '');
  const prefixed = literal && !/^\d+$/.test(bare);
  if (!prefixed) {
    if (!literal || literal.base !== 16) {
      const hex = make(bare, 16);
      if (hex) {
        sections.push(describeNumber(hex));
      }
    }
    const bin = make(bare, 2);
    if (bin) {
      sections.push(describeNumber(bin));
    }
  }
  if (!literal) {
    const asText = describeText(text);
    if (asText) {
      sections.push(asText);
    }
  }
  return sections;
}
