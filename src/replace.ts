import * as vscode from 'vscode';
import { resolveTarget, Target } from './hover';

interface ReplaceItem extends vscode.QuickPickItem {
  sectionIndex: number;
  rowLabel: string;
}

function replacement(target: Target, sectionIndex: number, rowLabel: string): string | undefined {
  const row = target.sections[sectionIndex]?.rows.find((r) => r.label === rowLabel);
  return row && (row.copy ?? row.text);
}

/** Lets the user pick a converted value and replaces every selection (or the literal under each cursor) with it. */
export async function replaceInteractive(editor: vscode.TextEditor): Promise<void> {
  const { document } = editor;
  const targets = editor.selections
    .map((selection) => resolveTarget(document, selection.active))
    .filter((target): target is Target => target !== undefined);
  if (!targets.length) {
    vscode.window.setStatusBarMessage(`$(arrow-swap) ${vscode.l10n.t('Hex Converter: no convertible value found')}`, 3000);
    return;
  }

  const primary = targets[0];
  const current = document.getText(primary.range).trim();
  const items: ReplaceItem[] = [];
  primary.sections.forEach((section, sectionIndex) => {
    for (const row of section.rows) {
      const value = row.copy ?? row.text;
      if (value !== current) {
        items.push({
          label: value,
          description: `${section.title} → ${row.label}`,
          sectionIndex,
          rowLabel: row.label,
        });
      }
    }
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Replace "{0}" with…', current),
    matchOnDescription: true,
  });
  if (!picked) {
    return;
  }
  await editor.edit((edit) => {
    for (const target of targets) {
      const value = replacement(target, picked.sectionIndex, picked.rowLabel);
      if (value !== undefined) {
        edit.replace(target.range, value);
      }
    }
  });
}

/** Replaces a fixed range; invoked from the replace links inside the hover popup. */
export async function replaceWith(uri: unknown, position: unknown, text: unknown): Promise<void> {
  if (typeof uri !== 'string' || typeof text !== 'string' || !Array.isArray(position) || position.length !== 4) {
    return;
  }
  const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri);
  if (!editor) {
    return;
  }
  const [startLine, startCharacter, endLine, endCharacter] = position.map(Number);
  const range = editor.document.validateRange(new vscode.Range(startLine, startCharacter, endLine, endCharacter));
  await editor.edit((edit) => edit.replace(range, text));
}
