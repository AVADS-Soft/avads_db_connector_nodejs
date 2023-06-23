export class Decoder {

    public readonly buffer: Buffer;
    public byteOffset: number;

    public constructor(b: Buffer, offset: number = 0) {
        this.buffer = b;
        this.byteOffset = offset;
    }

    public remains(): Buffer {
        return this.buffer.subarray(this.byteOffset);
    }

    public boolean(): boolean {
        const offset = this.byteOffset;
        this.byteOffset += 1;
        return this.buffer.readUint8(offset) !== 0;
    }

    public string(): string {
        const length = this.buffer.readInt32BE(this.byteOffset);
        const start = this.byteOffset += 4;
        const end = this.byteOffset += length;
        return this.buffer.toString("utf8", start, end);
    }

    public uint8(): number {
        const offset = this.byteOffset;
        this.byteOffset += 1;
        return this.buffer.readUint8(offset);
    }

    public int32(): number {
        const offset = this.byteOffset;
        this.byteOffset += 4;
        return this.buffer.readInt32BE(offset);
    }

    public int64(): bigint {
        const offset = this.byteOffset;
        this.byteOffset += 8;
        return this.buffer.readBigInt64BE(offset);
    }

    public read(size: number): Buffer {
        const start = this.byteOffset;
        this.byteOffset += size;
        return this.buffer.subarray(start, this.byteOffset);
    }
}
