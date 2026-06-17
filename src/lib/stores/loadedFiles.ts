import { writable } from 'svelte/store';
import type { GpxFile } from '$lib/domain/entities/GpxFile';
import type { TrackPoint } from '$lib/domain/entities/TrackPoint';

export interface LoadedFile {
  id: string;
  name: string;
  points: TrackPoint[];
}

export const loadedFiles = writable<LoadedFile[]>([]);

// Module-scoped counter — stable, deterministic ids (no Math.random).
let counter = 0;

function makeId(name: string): string {
  return `f${++counter}-${name}`;
}

function clampIndex(i: number, len: number): number {
  if (i < 0) return 0;
  if (i > len - 1) return len - 1;
  return i;
}

/** Pure: move item at `from` to `to`, clamping both indices into range. */
export function applyReorder<T>(arr: readonly T[], from: number, to: number): T[] {
  const copy = arr.slice();
  if (copy.length === 0) return copy;
  const f = clampIndex(from, copy.length);
  const t = clampIndex(to, copy.length);
  if (f === t) return copy;
  const [item] = copy.splice(f, 1);
  copy.splice(t, 0, item);
  return copy;
}

export function addFiles(files: GpxFile[]): LoadedFile[] {
  const added: LoadedFile[] = files.map((f) => ({ id: makeId(f.name), name: f.name, points: f.points }));
  loadedFiles.update((list) => [...list, ...added]);
  return added;
}

export function removeFile(id: string): void {
  loadedFiles.update((list) => list.filter((f) => f.id !== id));
}

export function reorderFiles(from: number, to: number): void {
  loadedFiles.update((list) => applyReorder(list, from, to));
}

export function clear(): void {
  loadedFiles.set([]);
}

/** Test-only reset of the store and id counter. */
export function __resetLoadedFiles(): void {
  loadedFiles.set([]);
  counter = 0;
}
