import {Looping} from "./base.js";

export class Series {

    public name: string;
    public type: bigint;
    public id: bigint;
    public comment: string;
    public viewTimeMod: number;
    public looping: Looping;
    public class: number;

    public constructor(s: Partial<Series> = {}) {
        this.name = s.name || "";
        this.type = s.type || 0n;
        this.id = s.id || 0n;
        this.comment = s.comment || "";
        this.viewTimeMod = s.viewTimeMod || 0;
        this.looping = s.looping || new Looping();
        this.class = s.class || 0;
    }
}
