import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { GpxFile } from '$lib/domain/entities/GpxFile';
import { parseGpx } from '$lib/data/parsing/GpxParser';
import { ParseError } from '$lib/domain/errors';

/** Decode a base64 string to UTF-8 text (used for web file-picker `data`). */
export function decodeBase64Utf8(b64: string): string {
  // atob yields a binary (latin1) string; map to bytes then decode UTF-8.
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

/** Ensure a filename ends with a `.gpx` extension (case-insensitive). */
export function ensureGpxExt(name: string): string {
  return /\.gpx$/i.test(name) ? name : `${name}.gpx`;
}

/** Map any thrown value to a user-friendly message for a toast. */
export function friendlyImportError(e: unknown): string {
  if (e instanceof ParseError) return `Could not read file: ${e.message}`;
  if (e instanceof Error) return e.message;
  return 'Something went wrong while importing files.';
}

/** Web fallback: trigger a Blob download in the browser. */
function defaultDownload(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface FileServiceDeps {
  /** Injectable web downloader (for tests / custom hosts). */
  download?: (xml: string, filename: string) => void;
}

/**
 * Bridges native IO plugins to the pure GPX engine. The only module that
 * imports Capacitor IO plugins. All IO is wrapped so callers get friendly errors.
 */
export class FileService {
  private download: (xml: string, filename: string) => void;

  constructor(deps: FileServiceDeps = {}) {
    this.download = deps.download ?? defaultDownload;
  }

  /**
   * Open the file picker, read each selected file, and parse it. Per-file
   * parse errors are collected and skipped; if every pick fails, throws.
   * Returns [] when the user cancels (no files selected).
   */
  async pickAndImportGpx(): Promise<GpxFile[]> {
    let picked;
    try {
      const result = await FilePicker.pickFiles({
        types: ['application/gpx+xml'],
        readData: true
      });
      picked = result.files;
    } catch (e) {
      throw new Error(friendlyImportError(e));
    }

    if (!picked || picked.length === 0) return [];

    const parsed: GpxFile[] = [];
    const errors: string[] = [];
    for (const file of picked) {
      try {
        const text = await this.readPickedText(file);
        parsed.push(parseGpx(text, file.name));
      } catch (e) {
        errors.push(`${file.name}: ${friendlyImportError(e)}`);
      }
    }

    if (parsed.length === 0) {
      throw new ParseError(
        errors.length ? errors.join('; ') : 'No readable GPX files were selected.'
      );
    }
    return parsed;
  }

  private async readPickedText(file: { name: string; data?: string; path?: string }): Promise<string> {
    // Native: read the path off disk as UTF-8. Web: decode the base64 `data`.
    if (Capacitor.isNativePlatform() && file.path) {
      const res = await Filesystem.readFile({ path: file.path, encoding: Encoding.UTF8 });
      return typeof res.data === 'string' ? res.data : await res.data.text();
    }
    if (file.data) return decodeBase64Utf8(file.data);
    throw new ParseError(`No data for ${file.name}`);
  }

  /**
   * Write the serialized GPX and share it (native), or trigger a Blob
   * download (web). Errors are surfaced with friendly messages.
   */
  async exportAndShare(xml: string, filename: string): Promise<void> {
    const name = ensureGpxExt(filename);
    try {
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: name,
          data: xml,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
        await Share.share({ title: name, url: uri });
      } else {
        this.download(xml, name);
      }
    } catch (e) {
      throw new Error(friendlyImportError(e));
    }
  }
}

/** Shared singleton for screens. */
export const fileService = new FileService();
