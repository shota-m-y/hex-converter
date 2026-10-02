# Hex Converter

Convert between decimal, hex, binary and ASCII without leaving the editor.

[日本語の説明はこちら](https://github.com/nakayams/hex-converter/blob/main/README.ja.md)

## Features

### Convert on hover

Hover over a number literal to see it as DEC / HEX / BIN / OCT, plus the signed value and ASCII character where they apply. Each row has an icon to copy the value and one to replace the literal with it.

Supported forms: `255`, `0xFF`, `0b1010_1010`, `0o17`, `0FFh`, `8'hFF` (Verilog), and suffixed literals such as `255UL` or `10n`.

### Convert by shortcut

Select some text (or put the cursor on a number) and press `Ctrl+Alt+H` to show the same popup.

A selection does not need a prefix:

| Selected text | What you get |
|:--|:--|
| `FF` | The value read as HEX, and the ASCII codes of the text |
| `10` | The value read as DEC, HEX and BIN |
| `-1` | Two's complement representation |
| `Hello` | ASCII codes of each character (HEX / DEC / BIN) |
| `48 65 6C 6C 6F` | The byte sequence decoded to text |

### Replace in place

Select some text (or put the cursor on a number) and press `Ctrl+Alt+J` to pick a converted value from a list; the text in the editor is replaced with it. With multiple cursors, every location is converted to the same form.

### Converter panel

Open it with `Ctrl+Alt+Shift+H` or **Hex Converter: Open Converter** from the Command Palette. If text is selected, the panel starts with that value.

- **Number**: type in any of DEC / HEX / BIN / OCT / ASCII and the others update. Switch between 8 / 16 / 32 / 64 bit, click bits to toggle them, and see the signed value.
- **Text ⇄ ASCII codes**: convert between text and HEX / DEC / BIN byte sequences in either direction.

## Settings

| Setting | Default | Description |
|:--|:--|:--|
| `hexConverter.hover.enabled` | `true` | Show conversions when hovering with the mouse |
| `hexConverter.hover.decimal` | `true` | Also show the hover for decimal numbers without a prefix |

The shortcut popup works even when these are turned off.

## Language

The UI is available in English and Japanese and follows the display language of VS Code.

## License

[MIT](https://github.com/nakayams/hex-converter/blob/main/LICENSE)
