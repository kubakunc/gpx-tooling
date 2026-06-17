import type { GpxFile } from '../domain/entities/GpxFile';
import type { TrackPoint } from '../domain/entities/TrackPoint';
import { parseGpx } from './parsing/GpxParser';
import { serializeGpx } from './serialization/GpxSerializer';
import { mergeChronologically } from '../domain/usecases/merge';
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
  merge(files: GpxFile[]): GpxFile {
    const points = mergeChronologically(files.map((f) => f.points));
    return { name: 'merged', points };
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
