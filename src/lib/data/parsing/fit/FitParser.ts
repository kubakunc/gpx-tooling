import type { GpxFile } from '../../../domain/entities/GpxFile';
import type { TrackPoint, Sensors } from '../../../domain/entities/TrackPoint';
import { ParseError } from '../../../domain/errors';
import { BinaryReader, isInvalid } from './binaryReader';

/** FIT epoch (1989-12-31 00:00:00 UTC) as Unix seconds. */
const FIT_EPOCH_OFFSET = 631065600;
const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;
const RECORD_GLOBAL_NUM = 20;

interface FieldDef {
  num: number;
  size: number;
  baseType: number;
}

interface MessageDef {
  littleEndian: boolean;
  globalNum: number;
  fields: FieldDef[];
  /** Developer-field sizes (values are skipped). */
  devFieldSizes: number[];
}

/** Map of fieldDefNum → raw numeric value (already null-filtered for sentinels). */
type FieldValues = Map<number, number>;

function semicirclesToDeg(raw: number): number {
  return raw * SEMICIRCLE_TO_DEG;
}

function altitudeMeters(raw: number): number {
  return raw / 5 - 500;
}

function fitTimeToDate(raw: number): Date {
  return new Date((raw + FIT_EPOCH_OFFSET) * 1000);
}

/** Read one field's raw value honoring its size + endianness. */
function readFieldValue(reader: BinaryReader, field: FieldDef, le: boolean): number | null {
  let raw: number;
  switch (field.size) {
    case 1:
      raw = reader.readUint8();
      break;
    case 2:
      raw = reader.readUint16(le);
      break;
    case 4:
      // sint32 fields (lat/long) use the signed read; the sentinel check
      // below handles invalid values for both signed and unsigned types.
      raw = field.baseType === 0x85 ? reader.readSint32(le) : reader.readUint32(le);
      break;
    default:
      // Unknown / array field — skip its bytes and report missing.
      reader.skip(field.size);
      return null;
  }
  return isInvalid(raw, field.baseType) ? null : raw;
}

function readDefinition(reader: BinaryReader, hasDevData: boolean): MessageDef {
  reader.skip(1); // reserved
  const architecture = reader.readUint8();
  const littleEndian = architecture === 0;
  const globalNum = reader.readUint16(littleEndian);
  const numFields = reader.readUint8();
  const fields: FieldDef[] = [];
  for (let i = 0; i < numFields; i++) {
    const num = reader.readUint8();
    const size = reader.readUint8();
    const baseType = reader.readUint8();
    fields.push({ num, size, baseType });
  }
  const devFieldSizes: number[] = [];
  if (hasDevData) {
    const numDev = reader.readUint8();
    for (let i = 0; i < numDev; i++) {
      reader.readUint8(); // field number
      const size = reader.readUint8();
      reader.readUint8(); // dev data index
      devFieldSizes.push(size);
    }
  }
  return { littleEndian, globalNum, fields, devFieldSizes };
}

function readDataValues(reader: BinaryReader, def: MessageDef): FieldValues {
  const values: FieldValues = new Map();
  for (const field of def.fields) {
    const v = readFieldValue(reader, field, def.littleEndian);
    if (v !== null) values.set(field.num, v);
  }
  for (const size of def.devFieldSizes) reader.skip(size);
  return values;
}

function recordToTrackPoint(values: FieldValues): TrackPoint | null {
  const latRaw = values.get(0);
  const lonRaw = values.get(1);
  // A record without a position is not a usable track point.
  if (latRaw === undefined || lonRaw === undefined) return null;

  // enhanced_altitude (78) preferred over altitude (2) when present.
  const altRaw = values.has(78) ? values.get(78)! : values.get(2);
  const tsRaw = values.get(253);

  const sensors: Sensors = {};
  if (values.has(3)) sensors.hr = values.get(3)!;
  if (values.has(4)) sensors.cadence = values.get(4)!;
  if (values.has(7)) sensors.power = values.get(7)!;

  return {
    latitude: semicirclesToDeg(latRaw),
    longitude: semicirclesToDeg(lonRaw),
    elevation: altRaw === undefined ? null : altitudeMeters(altRaw),
    time: tsRaw === undefined ? null : fitTimeToDate(tsRaw),
    sensors,
  };
}

/**
 * Decode a FIT binary file into a `GpxFile`. Lenient: CRC is not validated.
 * Throws `ParseError` for a non-".FIT" header or when no record messages are
 * found.
 */
export function parseFit(bytes: Uint8Array, name: string): GpxFile {
  if (bytes.byteLength < 12) throw new ParseError(`File too short to be FIT: ${name}`);
  const reader = new BinaryReader(bytes);
  const headerSize = reader.readUint8();
  reader.skip(3); // protocol(1) + profile(2)
  const dataSize = reader.readUint32(true);
  const signature = reader.readString(4);
  if (signature !== '.FIT') throw new ParseError(`Not a FIT file: ${name}`);

  // Records begin right after the header and span exactly `dataSize` bytes.
  reader.seek(headerSize);
  const dataEnd = Math.min(headerSize + dataSize, bytes.byteLength);

  const definitions = new Map<number, MessageDef>();
  const points: TrackPoint[] = [];

  while (reader.pos < dataEnd) {
    const header = reader.readUint8();
    if (header & 0x80) {
      // Compressed-timestamp header → always a data message for localType.
      const localType = (header >> 5) & 0x3;
      const def = definitions.get(localType);
      if (!def) throw new ParseError(`FIT data before definition in ${name}`);
      const values = readDataValues(reader, def);
      if (def.globalNum === RECORD_GLOBAL_NUM) {
        const tp = recordToTrackPoint(values);
        if (tp) points.push(tp);
      }
      continue;
    }
    const isDefinition = (header & 0x40) !== 0;
    const hasDevData = (header & 0x20) !== 0;
    const localType = header & 0x0f;
    if (isDefinition) {
      definitions.set(localType, readDefinition(reader, hasDevData));
    } else {
      const def = definitions.get(localType);
      if (!def) throw new ParseError(`FIT data before definition in ${name}`);
      const values = readDataValues(reader, def);
      if (def.globalNum === RECORD_GLOBAL_NUM) {
        const tp = recordToTrackPoint(values);
        if (tp) points.push(tp);
      }
    }
  }

  if (points.length === 0) throw new ParseError(`No track records in ${name}`);
  return { name, points };
}
