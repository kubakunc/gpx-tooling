import { registerPlugin } from '@capacitor/core';

/** Result of a native "Save as…" (Storage Access Framework) operation. */
export interface SaveFileResult {
  /** content:// URI of the written file, or '' when the user cancelled. */
  uri: string;
  /** True when the user dismissed the system file browser without saving. */
  cancelled: boolean;
}

export interface SaveFileOptions {
  /** Base64-encoded file contents. */
  data: string;
  /** Suggested filename shown in the save dialog (e.g. "ride-merged.gpx"). */
  filename: string;
  /** MIME type for the created document. */
  mimeType: string;
}

/**
 * Native bridge to the Android Storage Access Framework. `saveFile` launches the
 * system "Create document" browser so the user picks the destination folder and
 * filename, then writes the decoded bytes to the chosen location.
 *
 * Implemented natively in `FileSaverPlugin.java` (Android). Web has no
 * equivalent — callers fall back to a Blob download (see FileService).
 */
export interface FileSaverPlugin {
  saveFile(options: SaveFileOptions): Promise<SaveFileResult>;
}

export const FileSaver = registerPlugin<FileSaverPlugin>('FileSaver');
