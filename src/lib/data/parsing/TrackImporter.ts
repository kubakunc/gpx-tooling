import type { GpxFile } from '../../domain/entities/GpxFile';
import { ParseError } from '../../domain/errors';
import { parseGpx } from './GpxParser';
import { parseFit } from './fit/FitParser';

export interface ImportContent {
  /** UTF-8 text (GPX). */
  text?: string;
  /** Raw bytes (FIT). */
  bytes?: Uint8Array;
}

function hasFitSignature(bytes: Uint8Array): boolean {
  // ".FIT" ASCII at offset 8 of the FIT header.
  if (bytes.byteLength < 12) return false;
  return (
    bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54
  );
}

/**
 * Decode an imported track into a `GpxFile`, choosing the parser by file
 * extension first, then by FIT magic bytes as a fallback. Throws `ParseError`
 * for unknown/empty input.
 */
export function importTrack(name: string, content: ImportContent): GpxFile {
  const lower = name.toLowerCase();

  if (lower.endsWith('.fit')) {
    if (!content.bytes) throw new ParseError(`No data for ${name}`);
    return parseFit(content.bytes, name);
  }

  if (lower.endsWith('.gpx')) {
    if (content.text === undefined) throw new ParseError(`No data for ${name}`);
    return parseGpx(content.text, name);
  }

  // Unknown extension: sniff FIT magic, else try GPX text if present.
  if (content.bytes && hasFitSignature(content.bytes)) {
    return parseFit(content.bytes, name);
  }
  if (content.text !== undefined && content.text.trim() !== '') {
    return parseGpx(content.text, name);
  }

  throw new ParseError(`Unsupported or empty file: ${name}`);
}
