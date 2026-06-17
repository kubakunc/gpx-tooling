// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParseError } from '$lib/domain/errors';

// --- Plugin mocks ---------------------------------------------------------
const pickFiles = vi.fn();
const writeFile = vi.fn();
const getUri = vi.fn();
const readFile = vi.fn();
const share = vi.fn();
const isNativePlatform = vi.fn();

vi.mock('@capawesome/capacitor-file-picker', () => ({
  FilePicker: { pickFiles: (...a: unknown[]) => pickFiles(...a) }
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: (...a: unknown[]) => writeFile(...a),
    getUri: (...a: unknown[]) => getUri(...a),
    readFile: (...a: unknown[]) => readFile(...a)
  },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' }
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: (...a: unknown[]) => share(...a) }
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() }
}));

import {
  FileService,
  decodeBase64Utf8,
  ensureGpxExt,
  friendlyImportError
} from './FileService';

const GPX = (name: string) =>
  `<?xml version="1.0"?><gpx version="1.1" creator="t"><trk><name>${name}</name><trkseg>` +
  `<trkpt lat="49.0" lon="19.0"><ele>100</ele></trkpt>` +
  `<trkpt lat="49.1" lon="19.1"><ele>110</ele></trkpt>` +
  `</trkseg></trk></gpx>`;

const toB64 = (s: string): string => Buffer.from(s, 'utf-8').toString('base64');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pure helpers', () => {
  it('decodeBase64Utf8 decodes UTF-8 (incl. multibyte)', () => {
    expect(decodeBase64Utf8(toB64('hello'))).toBe('hello');
    expect(decodeBase64Utf8(toB64('běžky → naměřeno'))).toBe('běžky → naměřeno');
  });

  it('ensureGpxExt appends .gpx when missing and leaves existing', () => {
    expect(ensureGpxExt('ride')).toBe('ride.gpx');
    expect(ensureGpxExt('ride.gpx')).toBe('ride.gpx');
    expect(ensureGpxExt('RIDE.GPX')).toBe('RIDE.GPX');
  });

  it('friendlyImportError maps ParseError and generic errors', () => {
    expect(friendlyImportError(new ParseError('bad xml'))).toContain('bad xml');
    expect(friendlyImportError(new Error('boom'))).toContain('boom');
    expect(typeof friendlyImportError('weird')).toBe('string');
  });
});

describe('pickAndImportGpx', () => {
  it('parses web base64 data into GpxFile[]', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({
      files: [{ name: 'a.gpx', data: toB64(GPX('A')) }]
    });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('a.gpx');
    expect(files[0].points).toHaveLength(2);
  });

  it('reads native files via Filesystem.readFile using path', async () => {
    isNativePlatform.mockReturnValue(true);
    pickFiles.mockResolvedValue({ files: [{ name: 'b.gpx', path: '/tmp/b.gpx' }] });
    readFile.mockResolvedValue({ data: GPX('B') });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(readFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/tmp/b.gpx', encoding: 'utf8' })
    );
    expect(files[0].points).toHaveLength(2);
  });

  it('collects per-file errors but returns the files that parsed', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({
      files: [
        { name: 'bad.gpx', data: toB64('not gpx') },
        { name: 'good.gpx', data: toB64(GPX('G')) }
      ]
    });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('good.gpx');
  });

  it('throws when all picks fail to parse', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({ files: [{ name: 'bad.gpx', data: toB64('garbage') }] });
    const svc = new FileService();
    await expect(svc.pickAndImportGpx()).rejects.toThrow();
  });

  it('returns [] when the user cancels (no files)', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({ files: [] });
    const svc = new FileService();
    expect(await svc.pickAndImportGpx()).toEqual([]);
  });

  it('wraps a picker failure in a friendly error', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockRejectedValue(new Error('picker exploded'));
    const svc = new FileService();
    await expect(svc.pickAndImportGpx()).rejects.toThrow(/picker exploded/);
  });
});

describe('exportAndShare', () => {
  it('native: writeFile -> getUri -> share with the filename', async () => {
    isNativePlatform.mockReturnValue(true);
    writeFile.mockResolvedValue({ uri: 'file:///cache/out.gpx' });
    getUri.mockResolvedValue({ uri: 'file:///cache/out.gpx' });
    share.mockResolvedValue({});
    const svc = new FileService();
    await svc.exportAndShare('<gpx/>', 'out.gpx');
    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'out.gpx', data: '<gpx/>', encoding: 'utf8', directory: 'CACHE' })
    );
    expect(getUri).toHaveBeenCalled();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///cache/out.gpx' })
    );
  });

  it('native: surfaces a friendly error if write fails', async () => {
    isNativePlatform.mockReturnValue(true);
    writeFile.mockRejectedValue(new Error('disk full'));
    const svc = new FileService();
    await expect(svc.exportAndShare('<gpx/>', 'out.gpx')).rejects.toThrow(/disk full/);
  });

  it('web: triggers a Blob download via the injected downloader', async () => {
    isNativePlatform.mockReturnValue(false);
    const download = vi.fn();
    const svc = new FileService({ download });
    await svc.exportAndShare('<gpx/>', 'out.gpx');
    expect(download).toHaveBeenCalledWith('<gpx/>', 'out.gpx');
    expect(writeFile).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('web: default downloader creates and clicks an anchor (Blob path)', async () => {
    isNativePlatform.mockReturnValue(false);
    // Stub URL APIs used by the default downloader.
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const svc = new FileService();
    await svc.exportAndShare('<gpx/>', 'noext');
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    clickSpy.mockRestore();
  });
});

describe('native read with Blob data', () => {
  it('reads a Blob result via .text()', async () => {
    isNativePlatform.mockReturnValue(true);
    pickFiles.mockResolvedValue({ files: [{ name: 'c.gpx', path: '/tmp/c.gpx' }] });
    readFile.mockResolvedValue({ data: new Blob([GPX('C')], { type: 'text/xml' }) });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files[0].points).toHaveLength(2);
  });
});
