import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { GpxFile } from '$lib/domain/entities/GpxFile';
import { importTrack } from '$lib/data/parsing/TrackImporter';
import { ParseError } from '$lib/domain/errors';

/** Decode a base64 string to a byte array. */
export function decodeBase64Bytes(b64: string): Uint8Array {
  // atob yields a binary (latin1) string; map char codes back to bytes.
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode a base64 string to UTF-8 text (used for web file-picker `data`). */
export function decodeBase64Utf8(b64: string): string {
  return new TextDecoder('utf-8').decode(decodeBase64Bytes(b64));
}

/** True when a filename has a `.fit` extension (case-insensitive). */
export function isFitName(name: string): boolean {
  return /\.fit$/i.test(name);
}

/** Ensure a filename ends with a `.gpx` extension (case-insensitive). */
export function ensureGpxExt(name: string): string {
  return /\.gpx$/i.test(name) ? name : `${name}.gpx`;
}

/**
 * Ensure an export filename has an extension. If it already has a recognised
 * track extension (gpx/tcx/kml/fit) it is left as-is; otherwise `.gpx` is
 * appended as a sensible default.
 */
export function ensureExportExt(name: string): string {
  return /\.(gpx|tcx|kml|fit)$/i.test(name) ? name : `${name}.gpx`;
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
  /**
   * Injectable GPX-text parser. Defaults to the MAIN-THREAD parser
   * (`importTrack`), because GPX parsing uses `DOMParser`, which only exists on
   * the main thread / in a WebView — never in a Web Worker. Overridable for
   * tests. Must NOT be routed through the worker.
   */
  parseGpxText?: (name: string, text: string) => Promise<GpxFile>;
}

/**
 * Bridges native IO plugins to the pure GPX engine. The only module that
 * imports Capacitor IO plugins. All IO is wrapped so callers get friendly errors.
 */
export class FileService {
  private download: (xml: string, filename: string) => void;
  private parseGpxText: (name: string, text: string) => Promise<GpxFile>;

  constructor(deps: FileServiceDeps = {}) {
    this.download = deps.download ?? defaultDownload;
    // Default: parse on the MAIN THREAD via importTrack → parseGpx (DOMParser).
    // A Web Worker has no DOMParser, so parsing must never be offloaded.
    this.parseGpxText = deps.parseGpxText ?? (async (name, text) => importTrack(name, { text }));
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
        // Accept any file so .fit is selectable: FIT has no registered MIME and
        // a `types` allow-list hides it in the native picker. We validate the
        // selection on import (extension + FIT magic bytes in TrackImporter),
        // rejecting non-track files with a friendly error.
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
        parsed.push(await this.readAndParse(file));
      } catch (e) {
        errors.push(`${file.name}: ${friendlyImportError(e)}`);
      }
    }

    if (parsed.length === 0) {
      throw new ParseError(
        errors.length ? errors.join('; ') : 'No readable track files were selected.'
      );
    }
    return parsed;
  }

  /** Read a picked file (text for GPX, bytes for FIT) and parse it. */
  private async readAndParse(file: { name: string; data?: string; path?: string }): Promise<GpxFile> {
    if (isFitName(file.name)) {
      // FIT bytes are parsed on the main thread (pure binary decode).
      return importTrack(file.name, { bytes: await this.readPickedBytes(file) });
    }
    // GPX text is parsed on the main thread (DOMParser is main-thread only).
    return this.parseGpxText(file.name, await this.readPickedText(file));
  }

  private async readPickedText(file: { name: string; data?: string; path?: string }): Promise<string> {
    // Prefer the picker's already-read base64 `data` (we pass `readData:true`)
    // — it's available on every platform and avoids `Filesystem.readFile`
    // choking on the picker's content-URI / cache `path` on device.
    if (file.data) return decodeBase64Utf8(file.data);
    // Native fallback: read the path off disk as UTF-8.
    if (Capacitor.isNativePlatform() && file.path) {
      const res = await Filesystem.readFile({ path: file.path, encoding: Encoding.UTF8 });
      return typeof res.data === 'string' ? res.data : await res.data.text();
    }
    throw new ParseError(`No data for ${file.name}`);
  }

  private async readPickedBytes(file: { name: string; data?: string; path?: string }): Promise<Uint8Array> {
    // Prefer the picker's already-read base64 `data` (see readPickedText).
    if (file.data) return decodeBase64Bytes(file.data);
    // Native fallback: read the path off disk without an encoding → base64.
    if (Capacitor.isNativePlatform() && file.path) {
      const res = await Filesystem.readFile({ path: file.path });
      if (typeof res.data === 'string') return decodeBase64Bytes(res.data);
      return new Uint8Array(await res.data.arrayBuffer());
    }
    throw new ParseError(`No data for ${file.name}`);
  }

  /**
   * Write the serialized GPX and share it (native), or trigger a Blob
   * download (web). Errors are surfaced with friendly messages.
   */
  async exportAndShare(xml: string, filename: string): Promise<void> {
    await this.writeAndShare(xml, ensureExportExt(filename));
  }

  /**
   * Share an arbitrary text file under the given filename as-is (no extension
   * forced). Used for non-GPX outputs like the Compare CSV.
   */
  async shareTextFile(text: string, filename: string): Promise<void> {
    await this.writeAndShare(text, filename);
  }

  private async writeAndShare(text: string, name: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: name,
          data: text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
        await Share.share({ title: name, url: uri });
      } else {
        this.download(text, name);
      }
    } catch (e) {
      throw new Error(friendlyImportError(e));
    }
  }
}

/** Shared singleton for screens. */
export const fileService = new FileService();
