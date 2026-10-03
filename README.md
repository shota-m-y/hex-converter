# Hex Converter

**See any number in decimal, hex, binary, octal and ASCII without leaving the editor.**

Hover over a literal, select a value and press a shortcut, or rewrite it in place. Built for firmware, embedded and low-level work where you need `0x40011000`, `0b10110010` and `"Hello"` as bytes several times a day.

[日本語の説明はこちら](https://github.com/nakayams/hex-converter/blob/main/README.ja.md)

## Features

### Hover to convert

Hover over a number literal to see every representation at once. Each row has buttons to **copy** the value or **replace** the literal with it.

![Hovering over numbers shows their decimal, hex, binary and octal forms](images/hover.gif)

- Decimal, hex, binary and octal, with binary grouped in nibbles
- Signed reading (`INT8` / `INT16` / `INT32` / `INT64`) when the top bit is set
- ASCII character or control code name (`LF`, `ESC`, …) for byte-sized values, and the decoded string for values such as `0x48656C6C6F`

### Convert a selection with a shortcut

Select any text and press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>H</kbd>. Text without a prefix is ambiguous, so every plausible reading is shown.

![Selecting a byte list decodes it to text, and selecting a word shows its ASCII codes](images/shortcut.gif)

| Selected text | What you get |
|:--|:--|
| `FF` | The value read as hex, plus the ASCII codes of the text |
| `10` | The value read as decimal, hex and binary |
| `-1` | Two's complement in the smallest width that fits |
| `greeting` | ASCII codes of each character (hex / decimal / binary) |
| `0x48, 0x65, 0x6C, 0x6C, 0x6F` | The byte list decoded to `"Hello"` |

### Replace in place

Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>J</kbd> on a value and pick a format to rewrite it in place, or click the replace button in the hover. With multiple cursors, every location is converted to the same format.

![Replacing a decimal with hex from the picker, then a binary with hex from the hover](images/replace.gif)

### Converter panel

Open with <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd>. Type in any field and the others update as you type.

![The converter panel: editing hex, switching to 16 bit, toggling bits, and converting text to ASCII codes](images/converter.gif)

- **Number**: DEC / HEX / BIN / OCT / ASCII fields kept in sync, an 8 / 16 / 32 / 64-bit width switch, clickable bits, and the signed value
- **Text ⇄ ASCII codes**: convert between text and hex, decimal or binary byte lists, in either direction
- Follows your color theme, light or dark

## Supported literals

| Form | Example |
|:--|:--|
| Decimal | `255`, `1_000_000` |
| Hex | `0xFF`, `0FFh` |
| Binary | `0b1010_1010` |
| Octal | `0o17` |
| Verilog / SystemVerilog | `8'hFF`, `4'b1010`, `'d10` |
| C / C++ / Rust / JS suffixes | `255U`, `0xFFUL`, `10n` |

## Shortcuts

| Command | Windows / Linux | macOS |
|:--|:--|:--|
| Show conversions for the selection / value at the cursor | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>H</kbd> | <kbd>Ctrl</kbd>+<kbd>Option</kbd>+<kbd>H</kbd> |
| Convert and replace | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>J</kbd> | <kbd>Ctrl</kbd>+<kbd>Option</kbd>+<kbd>J</kbd> |
| Open the converter panel | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> | <kbd>Ctrl</kbd>+<kbd>Option</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> |

All three are also in the editor's right-click menu and the Command Palette (search for "Hex Converter"). You can rebind them in **Keyboard Shortcuts**.

## Settings

| Setting | Default | Description |
|:--|:--|:--|
| `hexConverter.hover.enabled` | `true` | Show conversions when hovering with the mouse |
| `hexConverter.hover.decimal` | `true` | Also show the hover for plain decimal numbers. Turn this off if the hover on every number gets in the way |

The shortcut popup works even when these are turned off.

## Language

The UI is available in English and Japanese, following VS Code's display language.

## Feedback

Found a bug or have an idea? Please open an issue on [GitHub](https://github.com/nakayams/hex-converter/issues).

## License

[MIT](https://github.com/nakayams/hex-converter/blob/main/LICENSE)
