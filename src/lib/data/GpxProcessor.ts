import type { GpxFile } from '../domain/entities/GpxFile';
import type { TrackPoint } from '../domain/entities/TrackPoint';
import { parseGpx } from './parsing/GpxParser';
import { serializeGpx } from './serialization/GpxSerializer';
import { analyzeMerge, type MergeOptions } from '../domain/usecases/mergeEngine';
import { trimGpx } from '../domain/usecases/trim';
import { simplifyRdp } from '../domain/usecases/simplify';
import { repairElevation, type RepairOptions } from '../domain/usecases/repairElevation';

export class GpxProcessor {
  parse(xml: string, name: string): GpxFile {
    return parseGpx(xml, name);
  }
  serialize(points: TrackPoint[], name: string): string {
    return serializeGpx(points, name);
  }
  merge(files: GpxFile[], options: MergeOptions = { mode: 'smart' }): GpxFile {
    const result = analyzeMerge(
      files.map((f) => ({ name: f.name, points: f.points })),
      options
    );
    return { name: 'merged', points: result.segments.flat() };
  }
  trim(points: TrackPoint[], start: number, end: number): TrackPoint[] {
    return trimGpx(points, start, end);
  }
  simplify(points: TrackPoint[], epsilonMeters: number): TrackPoint[] {
    return simplifyRdp(points, epsilonMeters);
  }
  repairElevation(points: TrackPoint[], opts?: RepairOptions): TrackPoint[] {
    return repairElevation(points, opts);
  }
}
