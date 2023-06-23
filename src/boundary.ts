export class Boundary {
    public readonly min: bigint;
    public readonly max: bigint;
    public readonly rowCount: bigint;
    public readonly startCP: string;
    public readonly endCP: string;
    public constructor(v: Partial<Boundary> = {}) {
        this.min = v.min || 0n;
        this.max = v.max || 0n;
        this.rowCount = v.rowCount || 0n;
        this.startCP = v.startCP || "";
        this.endCP = v.endCP || "";
    }
}
