import type { TrackPoint } from '../entities/TrackPoint';
import { serializeGpx } from '../../data/serialization/GpxSerializer';
import { serializeTcx } from '../../data/serialization/TcxSerializer';
import { serializeKml } from '../../data/serialization/KmlSerializer';

/** Supported export formats (FIT is import-only — no encoder). */
export const EXPORT_FORMATS = ['gpx', 'tcx', 'kml'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

/** File extension for a given export format. */
export function convertExt(format: ExportFormat): string {
  return format;
}

/** Strip all sensor data from a track (used by Convert's "Sensor data off"). */
export function stripSensors(points: TrackPoint[]): TrackPoint[] {
  return points.map((p) => ({ ...p, sensors: {} }));
}

/** Serialize points to the requested format. Throws on an unknown format. */
export function serializeAs(format: string, points: TrackPoint[], name: string): string {
  switch (format) {
    case 'gpx':
      return serializeGpx(points, name);
    case 'tcx':
      return serializeTcx(points, name);
    case 'kml':
      return serializeKml(points, name);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
