import type { TrackPoint } from './TrackPoint';

export interface GpxFile {
  name: string;
  points: TrackPoint[];
}
