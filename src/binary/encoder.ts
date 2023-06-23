export class Encoder {

    public readonly buffer: Buffer;
    public byteOffset: number;

    public constructor(b: Buffer, offset: number = 0) {
        this.buffer = b;
        this.byteOffset = offset;
    }

    public remains(): Buffer {
        return this.buffer.subarray(this.byteOffset);
    }

    public boolean(value: boolean) {
        const b: number = value ? 1 : 0;
        this.byteOffset = this.buffer.writeUint8(b, this.byteOffset);
    }

    public string(value: string) {
        this.byteOffset = this.buffer.writeInt32BE(value.length, this.byteOffset);
        this.byteOffset += this.buffer.write(value, this.byteOffset);
    }

    public uint8(value: number) {
        this.byteOffset = this.buffer.writeUint8(value, this.byteOffset);
    }

    public uint32(value: number) {
        this.byteOffset = this.buffer.writeUInt32BE(value, this.byteOffset);
    }

    public int16(value: number) {
        this.byteOffset = this.buffer.writeInt16BE(value, this.byteOffset);
    }

    public int32(value: number) {
        this.byteOffset = this.buffer.writeInt32BE(value, this.byteOffset);
    }

    public int64(value: bigint) {
        this.byteOffset = this.buffer.writeBigInt64BE(value, this.byteOffset);
    }

    public write(value: Buffer, start?: number, end?: number) {
        this.byteOffset += value.copy(this.buffer, this.byteOffset, start, end);
    }
}
