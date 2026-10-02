import * as vscode from 'vscode';
import { analyzeSelection, analyzeToken, findToken, parseLiteral, Section } from './converter';

export const COPY_COMMAND = 'hexConverter.copy';
export const REPLACE_WITH_COMMAND = 'hexConverter.replaceWith';

export interface Target {
  sections: Section[];
  range: vscode.Range;
}

/** What to convert at `position`: the selection if it covers the position, otherwise the literal under it. */
export function resolveTarget(document: vscode.TextDocument, position: vscode.Position): Target | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document === document) {
    const selection = editor.selections.find((s) => !s.isEmpty && s.contains(position));
    if (selection) {
      const sections = analyzeSelection(document.getText(selection));
      return sections.length ? { sections, range: selection } : undefined;
    }
  }
  const token = findToken(document.lineAt(position.line).text, position.character);
  if (!token) {
    return undefined;
  }
  const sections = analyzeToken(token.text);
  if (!sections.length) {
    return undefined;
  }
  return { sections, range: new vscode.Range(position.line, token.start, position.line, token.end) };
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, '\\$&');
}

function code(text: string): string {
  return /[`|]/.test(text) ? escapeMarkdown(text) : `\`${text}\``;
}

function copyLink(text: string): string {
  const args = encodeURIComponent(JSON.stringify([text]));
  return `[$(copy)](command:${COPY_COMMAND}?${args} "コピー")`;
}

function replaceLink(document: vscode.TextDocument, range: vscode.Range, text: string): string {
  const position = [range.start.line, range.start.character, range.end.line, range.end.character];
  const args = encodeURIComponent(JSON.stringify([document.uri.toString(), position, text]));
  return `[$(replace)](command:${REPLACE_WITH_COMMAND}?${args} "この値に置換")`;
}

export function renderMarkdown(document: vscode.TextDocument, { sections, range }: Target): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = { enabledCommands: [COPY_COMMAND, REPLACE_WITH_COMMAND] };

  sections.forEach((section, index) => {
    if (index > 0) {
      md.appendMarkdown('\n\n---\n\n');
    }
    const detail = section.detail ? ` &nbsp;·&nbsp; ${escapeMarkdown(section.detail)}` : '';
    md.appendMarkdown(`$(arrow-swap) **${escapeMarkdown(section.title)}** として変換${detail}\n\n`);
    md.appendMarkdown('| | | | |\n|:--|:--|:-:|:-:|\n');
    for (const row of section.rows) {
      const value = row.copy ?? row.text;
      md.appendMarkdown(
        `| **${row.label}** &nbsp; | ${code(row.text)} &nbsp; | ${copyLink(value)} | ${replaceLink(document, range, value)} |\n`,
      );
    }
  });
  return md;
}

export class ConverterHoverProvider implements vscode.HoverProvider {
  private forcedUntil = 0;

  /** Makes the next hover request ignore the user's hover settings (used by the shortcut). */
  force(): void {
    this.forcedUntil = Date.now() + 1000;
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const forced = Date.now() < this.forcedUntil;
    this.forcedUntil = 0;

    const config = vscode.workspace.getConfiguration('hexConverter.hover');
    if (!forced && !config.get<boolean>('enabled', true)) {
      return undefined;
    }
    const target = resolveTarget(document, position);
    if (!target) {
      return undefined;
    }
    if (!forced && !config.get<boolean>('decimal', true) && target.range.isSingleLine) {
      const literal = parseLiteral(document.getText(target.range).trim());
      if (literal?.base === 10 && literal.width === undefined) {
        return undefined;
      }
    }
    return new vscode.Hover(renderMarkdown(document, target), target.range);
  }
}
