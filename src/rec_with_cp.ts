import {Row} from "./row.js";


export class RecWitchCP {
    public readonly recs: Array<Row>;
    public readonly startCP: string;
    public readonly endCP: string;
    public readonly hasContinuation: boolean;
    public constructor(v: Partial<RecWitchCP> = {}) {
        this.recs = v.recs || [];
        this.startCP = v.startCP || "";
        this.endCP = v.endCP || "";
        this.hasContinuation = v.hasContinuation || false;
    }
}
