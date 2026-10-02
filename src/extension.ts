import * as vscode from 'vscode';
import { ConverterHoverProvider, COPY_COMMAND, REPLACE_WITH_COMMAND, resolveTarget } from './hover';
import { replaceInteractive, replaceWith } from './replace';
import { ConverterPanel } from './panel';

export function activate(context: vscode.ExtensionContext): void {
  const hover = new ConverterHoverProvider();

  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', hover),

    vscode.commands.registerTextEditorCommand('hexConverter.showPopup', async (editor) => {
      if (!resolveTarget(editor.document, editor.selection.active)) {
        vscode.window.setStatusBarMessage('$(arrow-swap) Hex Converter: 変換できる値が見つかりません', 3000);
        return;
      }
      hover.force();
      await vscode.commands.executeCommand('editor.action.showHover');
    }),

    vscode.commands.registerTextEditorCommand('hexConverter.replace', (editor) => replaceInteractive(editor)),
    vscode.commands.registerCommand(REPLACE_WITH_COMMAND, replaceWith),

    vscode.commands.registerCommand('hexConverter.openConverter', () => {
      const editor = vscode.window.activeTextEditor;
      const selected = editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : undefined;
      ConverterPanel.show(context, selected);
    }),

    vscode.commands.registerCommand(COPY_COMMAND, async (text: unknown) => {
      if (typeof text !== 'string') {
        return;
      }
      await vscode.env.clipboard.writeText(text);
      vscode.window.setStatusBarMessage(`$(check) コピーしました: ${text}`, 2000);
    }),
  );
}

export function deactivate(): void {}
