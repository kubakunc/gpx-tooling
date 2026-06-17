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
  decodeBase64Bytes,
  isFitName,
  ensureGpxExt,
  ensureExportExt,
  friendlyImportError
} from './FileService';
import { buildFitFixture, type FitFixtureRecord } from '$lib/data/parsing/fit/buildFitFixture';

const FIT_REC: FitFixtureRecord = {
  timestamp: 1000,
  latSemicircles: Math.round((45 / 180) * 2 ** 31),
  lonSemicircles: Math.round((15 / 180) * 2 ** 31),
  altitudeRaw: (1200 + 500) * 5,
  heartRate: 150,
  power: 240
};
const fitB64 = (): string => Buffer.from(buildFitFixture([FIT_REC])).toString('base64');

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

  it('decodeBase64Bytes round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255]);
    const b64 = Buffer.from(bytes).toString('base64');
    expect(Array.from(decodeBase64Bytes(b64))).toEqual([0, 1, 2, 254, 255]);
  });

  it('isFitName detects the .fit extension case-insensitively', () => {
    expect(isFitName('ride.fit')).toBe(true);
    expect(isFitName('RIDE.FIT')).toBe(true);
    expect(isFitName('ride.gpx')).toBe(false);
  });

  it('ensureGpxExt appends .gpx when missing and leaves existing', () => {
    expect(ensureGpxExt('ride')).toBe('ride.gpx');
    expect(ensureGpxExt('ride.gpx')).toBe('ride.gpx');
    expect(ensureGpxExt('RIDE.GPX')).toBe('RIDE.GPX');
  });

  it('ensureExportExt keeps known track extensions and defaults to .gpx', () => {
    expect(ensureExportExt('ride.tcx')).toBe('ride.tcx');
    expect(ensureExportExt('ride.kml')).toBe('ride.kml');
    expect(ensureExportExt('ride.gpx')).toBe('ride.gpx');
    expect(ensureExportExt('ride')).toBe('ride.gpx');
  });

  it('friendlyImportError maps ParseError and generic errors', () => {
    expect(friendlyImportError(new ParseError('bad xml'))).toContain('bad xml');
    expect(friendlyImportError(new Error('boom'))).toContain('boom');
    expect(typeof friendlyImportError('weird')).toBe('string');
  });
});

describe('default import path (main-thread parse, no worker)', () => {
  it('the DEFAULT FileService parses real GPX end-to-end via the main thread', async () => {
    // Regression guard for the worker/DOMParser import bug: a default
    // FileService (no injected parser) must parse GPX on the main thread,
    // yielding real points. It must not route parse through the worker.
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({
      files: [{ name: 'real.gpx', data: toB64(GPX('Real')) }]
    });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('real.gpx');
    expect(files[0].points).toHaveLength(2);
    expect(files[0].points[0].latitude).toBeCloseTo(49.0, 4);
    expect(files[0].points[0].elevation).toBe(100);
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

  it('imports a FIT file from web base64 bytes', async () => {
    isNativePlatform.mockReturnValue(false);
    pickFiles.mockResolvedValue({ files: [{ name: 'ride.fit', data: fitB64() }] });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('ride.fit');
    expect(files[0].points[0].latitude).toBeCloseTo(45, 4);
  });

  it('imports a FIT file from a native path (base64 readFile)', async () => {
    isNativePlatform.mockReturnValue(true);
    pickFiles.mockResolvedValue({ files: [{ name: 'ride.fit', path: '/tmp/ride.fit' }] });
    readFile.mockResolvedValue({ data: fitB64() });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    // No encoding passed for FIT bytes.
    expect(readFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/tmp/ride.fit' }));
    expect(files[0].points).toHaveLength(1);
  });

  it('reads native FIT bytes from a Blob result', async () => {
    isNativePlatform.mockReturnValue(true);
    pickFiles.mockResolvedValue({ files: [{ name: 'ride.fit', path: '/tmp/ride.fit' }] });
    readFile.mockResolvedValue({ data: new Blob([buildFitFixture([FIT_REC]).slice().buffer]) });
    const svc = new FileService();
    const files = await svc.pickAndImportGpx();
    expect(files[0].points).toHaveLength(1);
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

describe('injectable GPX parser', () => {
  it('routes GPX text through the injected parser (main-thread importTrack by default)', async () => {
    isNativePlatform.mockReturnValue(false);
    const parseGpxText = vi
      .fn()
      .mockResolvedValue({ name: 'r.gpx', points: [{ latitude: 1, longitude: 2, elevation: null, time: null, sensors: {} }] });
    const svc = new FileService({ parseGpxText });
    pickFiles.mockResolvedValue({
      files: [{ name: 'r.gpx', data: toB64('<gpx/>') }]
    });
    const out = await svc.pickAndImportGpx();
    expect(parseGpxText).toHaveBeenCalledWith('r.gpx', '<gpx/>');
    expect(out[0].name).toBe('r.gpx');
  });
});

describe('shareTextFile', () => {
  it('web: downloads the text under the exact filename (no extension forced)', async () => {
    isNativePlatform.mockReturnValue(false);
    const download = vi.fn();
    const svc = new FileService({ download });
    await svc.shareTextFile('a,b\n1,2', 'compare.csv');
    expect(download).toHaveBeenCalledWith('a,b\n1,2', 'compare.csv');
  });

  it('native: writes and shares the text file', async () => {
    isNativePlatform.mockReturnValue(true);
    writeFile.mockResolvedValue({});
    getUri.mockResolvedValue({ uri: 'file:///cache/compare.csv' });
    share.mockResolvedValue({});
    const svc = new FileService();
    await svc.shareTextFile('a,b', 'compare.csv');
    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'compare.csv', data: 'a,b' })
    );
    expect(share).toHaveBeenCalled();
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
