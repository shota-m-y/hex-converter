import * as vscode from 'vscode';
import { parseLiteral } from './converter';

type InitMessage = { type: 'init'; kind: 'number'; value: string } | { type: 'init'; kind: 'text'; text: string };

export class ConverterPanel {
  private static current: ConverterPanel | undefined;

  private ready = false;
  private pending: InitMessage | undefined;

  static show(context: vscode.ExtensionContext, initialText?: string): void {
    const column = vscode.ViewColumn.Beside;
    if (!ConverterPanel.current) {
      const panel = vscode.window.createWebviewPanel('hexConverter', 'Hex Converter', column, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      });
      ConverterPanel.current = new ConverterPanel(panel, context);
    } else {
      ConverterPanel.current.panel.reveal(undefined, false);
    }
    if (initialText) {
      ConverterPanel.current.init(initialText);
    }
  }

  private constructor(private readonly panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
    panel.webview.html = this.html(context.extensionUri);
    panel.onDidDispose(() => (ConverterPanel.current = undefined));
    panel.webview.onDidReceiveMessage((message) => {
      if (message.type === 'ready') {
        this.ready = true;
        if (this.pending) {
          panel.webview.postMessage(this.pending);
          this.pending = undefined;
        }
      } else if (message.type === 'copy' && typeof message.text === 'string') {
        vscode.env.clipboard.writeText(message.text);
      }
    });
  }

  private init(text: string): void {
    const literal = parseLiteral(text.trim());
    const message: InitMessage = literal
      ? { type: 'init', kind: 'number', value: literal.value.toString(10) }
      : { type: 'init', kind: 'text', text };
    if (this.ready) {
      this.panel.webview.postMessage(message);
    } else {
      this.pending = message;
    }
  }

  private html(extensionUri: vscode.Uri): string {
    const webview = this.panel.webview;
    const asset = (name: string) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', name));
    const t = vscode.l10n.t;
    const nonce = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');

    const field = (id: string, label: string, placeholder: string, hint = '') => `
        <label class="field" data-base="${label.toLowerCase()}">
          <span class="chip">${label}</span>
          <input id="${id}" type="text" spellcheck="false" autocomplete="off" placeholder="${placeholder}">
          <span class="hint">${hint}</span>
          <button class="copy" data-copy="${id}" title="${t('Copy')}" type="button">⧉</button>
        </label>`;
    const area = (id: string, label: string, placeholder: string) => `
        <label class="field area" data-base="${label.toLowerCase()}">
          <span class="chip">${label}</span>
          <textarea id="${id}" rows="2" spellcheck="false" placeholder="${placeholder}"></textarea>
          <button class="copy" data-copy="${id}" title="${t('Copy')}" type="button">⧉</button>
        </label>`;

    return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${asset('main.css')}" rel="stylesheet">
  <title>Hex Converter</title>
</head>
<body>
  <main>
    <header>
      <div class="logo">0x</div>
      <div>
        <h1>Hex Converter</h1>
        <p>${t('Type in any field and the others update instantly.')}</p>
      </div>
    </header>

    <section class="card">
      <div class="card-head">
        <h2>${t('Number')}</h2>
        <div class="segmented" id="widths">
          <button type="button" data-width="8">8</button>
          <button type="button" data-width="16">16</button>
          <button type="button" data-width="32">32</button>
          <button type="button" data-width="64">64</button>
          <span class="unit">bit</span>
        </div>
      </div>
      ${field('dec', 'DEC', '255')}
      ${field('hex', 'HEX', 'FF')}
      ${field('bin', 'BIN', '1111 1111')}
      ${field('oct', 'OCT', '377')}
      ${field('chr', 'ASCII', 'A')}
      <div class="meta">
        <span>${t('Signed')} <b id="signed">0</b></span>
        <span class="muted">${t('Click a bit to toggle it')}</span>
      </div>
      <div class="bits" id="bits"></div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>${t('Text ⇄ ASCII codes')}</h2>
        <span class="muted" id="byteCount">0 byte</span>
      </div>
      ${area('txt', 'TEXT', 'Hello')}
      ${area('thex', 'HEX', '48 65 6C 6C 6F')}
      ${area('tdec', 'DEC', '72 101 108 108 111')}
      ${area('tbin', 'BIN', '01001000 01100101 …')}
    </section>
  </main>
  <div id="toast">${t('Copied')}</div>
  <script nonce="${nonce}" src="${asset('main.js')}"></script>
</body>
</html>`;
  }
}
