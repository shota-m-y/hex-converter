import * as vscode from 'vscode';
import { labels } from './converter';
import { ConverterHoverProvider, COPY_COMMAND, REPLACE_WITH_COMMAND, resolveTarget } from './hover';
import { replaceInteractive, replaceWith } from './replace';
import { ConverterPanel } from './panel';

export function activate(context: vscode.ExtensionContext): void {
  labels.twosComplement = vscode.l10n.t("two's complement");
  labels.hexBytes = vscode.l10n.t('HEX bytes');

  const hover = new ConverterHoverProvider();

  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', hover),

    vscode.commands.registerTextEditorCommand('hexConverter.showPopup', async (editor) => {
      if (!resolveTarget(editor.document, editor.selection.active)) {
        vscode.window.setStatusBarMessage(`$(arrow-swap) ${vscode.l10n.t('Hex Converter: no convertible value found')}`, 3000);
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
      vscode.window.setStatusBarMessage(`$(check) ${vscode.l10n.t('Copied: {0}', text)}`, 2000);
    }),
  );
}

export function deactivate(): void {}
