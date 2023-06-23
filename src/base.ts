export const FS_FS        = "fs";    // Файл базы пишется единым сегментом
export const FS_MULTIPART = "fs_mp"; // Файл бары разбивается по кускам 1 гб
export const FS_MEMORY    = "mem_fs";

export class Base {

    public name: string;
    public path: string;
    public comment: string;
    public status: bigint;
    public dataSize: number;
    public looping: Looping;
    public dbSize: string;
    public fsType: string;
    public autoAddSeries: boolean;
    public autoSave: boolean;
    public autoSaveDuration: string;
    public autoSaveInterval: string;

    public constructor(b: Partial<Base> = {}) {
        this.name = b.name || "";
        this.comment = b.comment || "";
        this.path = b.path || "";
        this.dataSize = b.dataSize || 0;
        this.status = b.status || 0n;
        this.looping = b.looping || {
            type: 0,
            lt: "",
            lifeTime: 0,
        };
        this.dbSize = b.dbSize || "";
        this.fsType = b.fsType || "";
        this.autoAddSeries = b.autoAddSeries || false;
        this.autoSave = b.autoSave || false;
        this.autoSaveDuration = b.autoSaveDuration || "";
        this.autoSaveInterval = b.autoSaveInterval || "";
    }
}

export class Looping {

    public type: number
    public lt: string
    public lifeTime: number

    public constructor() {
        this.type = 0;
        this.lt = "";
        this.lifeTime = 0;
    }
}
