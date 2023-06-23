export class Row {
    public readonly t: bigint;
    public readonly value: Buffer;
    public readonly q: Buffer;
    public constructor(v: Partial<Row> = {}) {
        this.t = v.t || 0n;
        this.value = v.value || Buffer.alloc(0);
        this.q = v.q || Buffer.alloc(0);
    }
}
