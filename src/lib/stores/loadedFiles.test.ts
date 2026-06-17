import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { GpxFile } from '$lib/domain/entities/GpxFile';
import type { TrackPoint } from '$lib/domain/entities/TrackPoint';
import {
  loadedFiles,
  addFiles,
  removeFile,
  reorderFiles,
  clear,
  applyReorder,
  __resetLoadedFiles
} from './loadedFiles';

const tp = (lat: number): TrackPoint => ({
  latitude: lat,
  longitude: 0,
  elevation: null,
  time: null,
  sensors: {}
});

const gpx = (name: string): GpxFile => ({ name, points: [tp(0), tp(1)] });

describe('applyReorder (pure)', () => {
  it('moves an item from one index to another', () => {
    expect(applyReorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(applyReorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when from === to', () => {
    expect(applyReorder(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('clamps out-of-range indices', () => {
    expect(applyReorder(['a', 'b', 'c'], -5, 99)).toEqual(['b', 'c', 'a']);
    expect(applyReorder(['a', 'b', 'c'], 99, -5)).toEqual(['c', 'a', 'b']);
  });

  it('returns a copy and does not mutate the input', () => {
    const input = ['a', 'b'];
    const out = applyReorder(input, 0, 1);
    expect(out).not.toBe(input);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('loadedFiles store', () => {
  beforeEach(() => __resetLoadedFiles());

  it('addFiles appends LoadedFile entries with unique stable ids', () => {
    addFiles([gpx('one.gpx'), gpx('two.gpx')]);
    const list = get(loadedFiles);
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('one.gpx');
    expect(list[0].points).toHaveLength(2);
    expect(list[0].id).not.toBe(list[1].id);
    expect(typeof list[0].id).toBe('string');
  });

  it('addFiles returns the newly added LoadedFile records', () => {
    const added = addFiles([gpx('a.gpx')]);
    expect(added).toHaveLength(1);
    expect(added[0].name).toBe('a.gpx');
  });

  it('removeFile removes by id', () => {
    addFiles([gpx('a.gpx'), gpx('b.gpx')]);
    const id = get(loadedFiles)[0].id;
    removeFile(id);
    const list = get(loadedFiles);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('b.gpx');
  });

  it('reorderFiles moves an entry', () => {
    addFiles([gpx('a.gpx'), gpx('b.gpx'), gpx('c.gpx')]);
    reorderFiles(0, 2);
    expect(get(loadedFiles).map((f) => f.name)).toEqual(['b.gpx', 'c.gpx', 'a.gpx']);
  });

  it('clear empties the store', () => {
    addFiles([gpx('a.gpx')]);
    clear();
    expect(get(loadedFiles)).toEqual([]);
  });
});
