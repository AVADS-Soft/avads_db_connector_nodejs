export class Sizer {

    public byteOffset: number;

    public constructor(offset: number = 0) {
        this.byteOffset = offset;
    }

    public boolean(_: boolean) {
        this.byteOffset += 1;
    }

    public string(value: string) {
        this.byteOffset += 4;
        this.byteOffset += value.length;
    }

    public uint8(_: number) {
        this.byteOffset += 1;
    }

    public uint32(_: number) {
        this.byteOffset += 4;
    }

    public int16(_: number) {
        this.byteOffset += 2;
    }

    public int32(_: number) {
        this.byteOffset += 4;
    }

    public int64(_: bigint) {
        this.byteOffset += 8;
    }

    public write(b: Buffer, start: number = 0, end: number = b.byteLength) {
        this.byteOffset += end - start;
    }
}
