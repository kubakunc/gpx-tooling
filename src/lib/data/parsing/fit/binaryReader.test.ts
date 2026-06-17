import { describe, it, expect } from 'vitest';
import { BinaryReader, BaseType, isInvalid } from './binaryReader';

describe('BinaryReader', () => {
  it('reads uint8 and advances the cursor', () => {
    const r = new BinaryReader(new Uint8Array([0x01, 0xff]));
    expect(r.pos).toBe(0);
    expect(r.readUint8()).toBe(0x01);
    expect(r.pos).toBe(1);
    expect(r.readUint8()).toBe(0xff);
    expect(r.remaining).toBe(0);
  });

  it('reads uint16 little- and big-endian', () => {
    const r = new BinaryReader(new Uint8Array([0x34, 0x12, 0x12, 0x34]));
    expect(r.readUint16(true)).toBe(0x1234);
    expect(r.readUint16(false)).toBe(0x1234);
  });

  it('reads uint32 little- and big-endian', () => {
    const le = new BinaryReader(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    expect(le.readUint32(true)).toBe(0x12345678);
    const be = new BinaryReader(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    expect(be.readUint32(false)).toBe(0x12345678);
  });

  it('reads signed 32-bit (negative semicircles) in both endiannesses', () => {
    // -1 = 0xFFFFFFFF
    const le = new BinaryReader(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    expect(le.readSint32(true)).toBe(-1);
    const be = new BinaryReader(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    expect(be.readSint32(false)).toBe(-1);
  });

  it('reads ASCII strings', () => {
    const r = new BinaryReader(new Uint8Array([0x2e, 0x46, 0x49, 0x54])); // ".FIT"
    expect(r.readString(4)).toBe('.FIT');
  });

  it('supports seek and skip', () => {
    const r = new BinaryReader(new Uint8Array([1, 2, 3, 4]));
    r.skip(2);
    expect(r.readUint8()).toBe(3);
    r.seek(0);
    expect(r.readUint8()).toBe(1);
    expect(r.length).toBe(4);
  });

  it('detects FIT invalid sentinels per base type', () => {
    expect(isInvalid(0xff, BaseType.uint8)).toBe(true);
    expect(isInvalid(0x7f, BaseType.sint8)).toBe(true);
    expect(isInvalid(0xffff, BaseType.uint16)).toBe(true);
    expect(isInvalid(0x7fff, BaseType.sint16)).toBe(true);
    expect(isInvalid(0x7fffffff, BaseType.sint32)).toBe(true);
    expect(isInvalid(0xffffffff, BaseType.uint32)).toBe(true);
    expect(isInvalid(0xff, BaseType.enum)).toBe(true);
    // valid values are not flagged
    expect(isInvalid(100, BaseType.uint16)).toBe(false);
    expect(isInvalid(0, BaseType.sint32)).toBe(false);
    // unknown base type → never invalid
    expect(isInvalid(0xff, 0x99)).toBe(false);
  });
});
