/**
 * Minimal cursor-based reader over a `Uint8Array` for the FIT binary format.
 * Supports both little- and big-endian multi-byte reads and FIT "invalid"
 * sentinel detection (all-ones for the field's base type → missing value).
 */

/** FIT base type numbers we care about (low 5 bits of the base-type byte). */
export const BaseType = {
  uint8: 0x02,
  sint8: 0x01,
  uint16: 0x84,
  sint16: 0x83,
  uint32: 0x86,
  sint32: 0x85,
  enum: 0x00,
} as const;

/** Invalid (sentinel) values per base type — these mean "no data". */
const INVALID: Record<number, number> = {
  0x00: 0xff, // enum
  0x01: 0x7f, // sint8
  0x02: 0xff, // uint8
  0x83: 0x7fff, // sint16
  0x84: 0xffff, // uint16
  0x85: 0x7fffffff, // sint32
  0x86: 0xffffffff, // uint32
};

/**
 * Return true when `value` is the FIT invalid sentinel for the given base
 * type byte. Unknown base types are treated as always-valid.
 */
export function isInvalid(value: number, baseType: number): boolean {
  const sentinel = INVALID[baseType];
  return sentinel !== undefined && value === sentinel;
}

export class BinaryReader {
  private readonly view: DataView;
  /** Current read offset into the buffer. */
  pos = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length(): number {
    return this.bytes.byteLength;
  }

  /** Bytes remaining from the current cursor. */
  get remaining(): number {
    return this.length - this.pos;
  }

  /**
   * Guard a read of `n` bytes starting at the current cursor. Throws a
   * `RangeError` when the read would run past the end of the buffer — the
   * untrusted FIT decoder converts these to `ParseError` at its boundary.
   */
  private ensure(n: number): void {
    if (n < 0 || this.pos + n > this.length) {
      throw new RangeError(
        `FIT read out of bounds: need ${n} byte(s) at ${this.pos}, length ${this.length}`
      );
    }
  }

  seek(pos: number): void {
    if (pos < 0 || pos > this.length) {
      throw new RangeError(`FIT seek out of bounds: ${pos}, length ${this.length}`);
    }
    this.pos = pos;
  }

  skip(n: number): void {
    this.ensure(n);
    this.pos += n;
  }

  readUint8(): number {
    this.ensure(1);
    const v = this.view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }

  readUint16(littleEndian = true): number {
    this.ensure(2);
    const v = this.view.getUint16(this.pos, littleEndian);
    this.pos += 2;
    return v;
  }

  readUint32(littleEndian = true): number {
    this.ensure(4);
    const v = this.view.getUint32(this.pos, littleEndian);
    this.pos += 4;
    return v;
  }

  readSint32(littleEndian = true): number {
    this.ensure(4);
    const v = this.view.getInt32(this.pos, littleEndian);
    this.pos += 4;
    return v;
  }

  /** Read `n` ASCII bytes as a string (no cursor rewind). */
  readString(n: number): string {
    this.ensure(n);
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.readUint8());
    return s;
  }
}
