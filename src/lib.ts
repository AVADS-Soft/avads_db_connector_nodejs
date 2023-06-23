import * as net from "net";
import * as crypto from "crypto";
import {Buffer} from "buffer";

import {Encoder} from "./binary/encoder.js";
import {Base} from "./base.js";
import {Decoder} from "./binary/decoder.js";
import {Sizer} from "./binary/sizer.js";
import {sizeStringBE, writeStringBE} from "./binary/index.js";
import {Series} from "./series.js";
import {BlobClass, SimpleClass} from "./types.js";
import {Row} from "./row.js";
import {RecWitchCP} from "./rec_with_cp.js";

const LoginGetKeys = 0;
const LoginValidPass = 1;
const RestoreSession = 2;
const GetProtocolVersion = 254;

const Disconnect            = 0;
const BaseCreate            = 1;
const BaseOpen              = 2;
const BaseGetInfo           = 3;
const BaseGetList           = 4;
const BaseRemove            = 5;
const BaseUpdate            = 6;
const BaseClose             = 7;
const SeriesCreate          = 8;
const SeriesRemove          = 9;
const SeriesUpdate          = 10;
const SeriesGetAll          = 11;
const SeriesGetInfo         = 12;
const UserGetList           = 13;
const UserGetInfo           = 14;
const UserCreate            = 15;
const UserRemove            = 16;
const UserUpdate            = 17;
const PropsGetList          = 18;
const PropsGetInfo          = 19;
const PropsSet              = 20;
const DataGetBoundary       = 21;
const DataGetCP             = 22;
const DataGetFromCP         = 23;
const DateGetRangeFromCP    = 24;
const DateGetRangeDirection = 25;
const DataAddRow            = 26;
const DataDeleteRow         = 27;
const DataDeleteRows        = 28;
const DataAddRowCache       = 29;
const DataGetValueAtTime    = 30;
const DataMathFunc          = 31;
const DataAddRows           = 32;
const DataGetLastValue      = 33;

export const decodeBase = (dec: Decoder, base: Base) => {
    base.name = dec.string();
    base.path = dec.string();
    base.comment = dec.string();
    base.status = dec.int64();
    base.looping.type = dec.uint8();
    base.looping.lt = dec.string();
    base.dbSize = dec.string();
    base.fsType = dec.string();
    base.autoAddSeries = dec.boolean();
    base.autoSave = dec.boolean();
    base.autoSaveDuration = dec.string();
    base.autoSaveInterval = dec.string();
};

export const send = async (s: net.Socket, b: Buffer): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        s.once("error", reject);
        s.once("data", (data: Buffer) => {
            s.removeListener("error", reject);
            resolve(data);
        });
        s.write(b, (err) => err && reject(err));
    });
}

export const protocolVersion = async (s: net.Socket): Promise<number> => {
    let b = Buffer.alloc(1);
    b.writeUint8(GetProtocolVersion);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        throw new Error("protocol version error: " + dec.string());
    }
    return dec.uint8();
}

export const loginGetKeys = async (s: net.Socket, login: string = "", pass: string = ""): Promise<[string, string]> => {
    let b =Buffer.alloc(1+sizeStringBE(login));
    b.writeUint8(LoginGetKeys);
    writeStringBE(b, login, 1);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "login get keys error: " + dec.string();
        throw new Error(msg);
    }
    b = dec.remains();
    const i = b.indexOf(0);
    const salt = crypto
        .createHash("md5")
        .update(Buffer.concat([Buffer.from(pass), b.subarray(0, i)]))
        .digest("hex");
    const hash = crypto
        .createHash("md5")
        .update(Buffer.concat([Buffer.from(salt), b.subarray(i+1)]))
        .digest("hex");
    return [salt, hash];
}

export const loginValidPass = async (s: net.Socket, hash: string = ""): Promise<string> => {
    let b = Buffer.alloc(1+sizeStringBE(hash));
    b.writeUint8(LoginValidPass);
    writeStringBE(b, hash, 1);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "login valid pass error: " + dec.string();
        throw new Error(msg);
    }
    return dec.string();
}

export const baseGetList = async (s: net.Socket): Promise<Array<Base>> => {
    let b = Buffer.alloc(1);
    b.writeUint8(BaseGetList);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "base get list error: " + dec.string();
        throw new Error(msg);
    }
    const count: number = Number(dec.int64());
    const bases: Array<Base> = new Array<Base>(count);
    for (let i = 0; i < count; i++) {
        const base = new Base();
        decodeBase(dec, base);
        bases[i] = base;
    }
    return bases;
}

export const baseOpen = async (s: net.Socket, id: bigint = 0n, name: string = "") => {
    const pckLength = 8+sizeStringBE(name);
    let b = Buffer.alloc(1+4+pckLength);
    let offset: number = 0;
    offset = b.writeUint8(BaseOpen, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = b.writeBigInt64BE(id, offset);
    offset = writeStringBE(b, name, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "base open error: " + dec.string();
        throw new Error(msg);
    }
}

export const baseRemove = async (s: net.Socket, name: string = "") => {
    let b = Buffer.alloc(1+4+sizeStringBE(name));
    let offset: number = 0;
    offset = b.writeUint8(BaseRemove, offset);
    offset = b.writeInt32BE(sizeStringBE(name), offset);
    offset = writeStringBE(b, name, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "base remove error: " + dec.string();
        throw new Error(msg);
    }
}

export const baseCreate = async (s: net.Socket, base: Base = new Base()) => {
    const sizer = new Sizer();
    sizer.string(base.name);
    sizer.string(base.comment);
    sizer.string(base.path);
    sizer.string(base.fsType);
    sizer.string(base.dbSize);
    sizer.uint8(base.looping.type);
    sizer.string(base.looping.lt);
    sizer.boolean(base.autoAddSeries);
    sizer.boolean(base.autoSave);
    sizer.string(base.autoSaveDuration);
    sizer.string(base.autoSaveInterval);
    const size = sizer.byteOffset;
    let b = Buffer.alloc(size+5);
    const enc = new Encoder(b);
    enc.uint8(BaseCreate);
    enc.int32(size);
    enc.string(base.name);
    enc.string(base.comment);
    enc.string(base.path);
    enc.string(base.fsType);
    enc.string(base.dbSize);
    enc.uint8(base.looping.type);
    enc.string(base.looping.lt);
    enc.boolean(base.autoAddSeries);
    enc.boolean(base.autoSave);
    enc.string(base.autoSaveDuration);
    enc.string(base.autoSaveInterval);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "base create error: " + dec.string();
        throw new Error(msg);
    }
}

export const baseUpdate = async (s: net.Socket, name: string = "", base: Base = new Base()) => {
    let offset = 0;
    const pckLength = sizeStringBE(name)+
        sizeStringBE(base.name)+
        sizeStringBE(base.comment)+
        sizeStringBE(base.path)+
        sizeStringBE(base.dbSize)+1+
        sizeStringBE(base.looping.lt)+1+1+
        sizeStringBE(base.autoSaveDuration)+
        sizeStringBE(base.autoSaveInterval);
    let b = Buffer.alloc(1+4+pckLength);
    offset = b.writeUint8(BaseUpdate, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = writeStringBE(b, name, offset);
    offset = writeStringBE(b, base.name, offset);
    offset = writeStringBE(b, base.comment, offset);
    offset = writeStringBE(b, base.path, offset);
    offset = writeStringBE(b, base.dbSize, offset);
    offset = b.writeUint8(base.looping.type, offset);
    offset = writeStringBE(b, base.looping.lt, offset);
    offset = b.writeUint8(base.autoAddSeries?1:0, offset);
    offset = b.writeUint8(base.autoSave?1:0, offset);
    offset = writeStringBE(b, base.autoSaveDuration, offset);
    offset = writeStringBE(b, base.autoSaveInterval, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "base update error: " + dec.string();
        throw new Error(msg);
    }
}

export const baseGetInfo = async (s: net.Socket, name: string = ""): Promise<Base> => {
    const pckLength = sizeStringBE(name);
    let b = Buffer.alloc(1+4+pckLength);
    let offset = 0;
    offset = b.writeUint8(BaseGetInfo, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = writeStringBE(b, name, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "base get info error: " + dec.string();
        throw new Error(msg);
    }
    const base = new Base();
    decodeBase(dec, base);
    return base;
}

export const seriesCreate = async (s: net.Socket, baseName: string = "", series: Series = new Series()) => {
    const sizer = new Sizer();
    sizer.string(baseName);
    sizer.int64(series.id);
    sizer.string(series.name);
    sizer.int64(series.type);
    sizer.uint8(series.viewTimeMod);
    sizer.string(series.comment);
    sizer.uint8(series.looping.type);
    sizer.string(series.looping.lt);
    const size = sizer.byteOffset;
    let b = Buffer.alloc(5+size);
    const enc = new Encoder(b);
    enc.uint8(SeriesCreate);
    enc.int32(size);
    enc.string(baseName);
    enc.int64(series.id);
    enc.string(series.name);
    enc.int64(series.type);
    enc.uint8(series.viewTimeMod);
    enc.string(series.comment);
    enc.uint8(series.looping.type);
    enc.string(series.looping.lt);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "series create error: " + dec.string();
        throw new Error(msg);
    }
}

export const dataAddRow = async (
    s: net.Socket,
    baseId: bigint = 0n,
    seriesId: bigint = 0n,
    cl: number = 0,
    t: bigint = 0n,
    q: number = 0,
    val: any = 0,
) => {
    const sizer = new Sizer();
    sizer.int64(baseId);
    sizer.int64(seriesId);
    sizer.uint8(cl);
    sizer.int64(t);
    let bb: Buffer;
    if (cl === 0) {
        bb = Buffer.alloc(8);
        valToBinaryAs(val, bb);
        sizer.write(bb);
    } else {
        bb = valToBinary(val);
        sizer.int32(bb.byteLength);
        sizer.write(bb);
    }
    sizer.uint32(q);
    const size = sizer.byteOffset;
    let b = Buffer.alloc(5+size);
    const enc = new Encoder(b);
    enc.uint8(DataAddRow);
    enc.int32(size);
    enc.int64(baseId);
    enc.int64(seriesId);
    enc.uint8(cl);
    enc.int64(t);

    if (cl === 0) {
        enc.write(bb);
    } else {
        enc.int32(bb.byteLength);
        enc.write(bb);
    }

    enc.uint32(q);

    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "data add row error: " + dec.string();
        throw new Error(msg);
    }
}

export const valToBinaryAs = (v: any, b: Buffer, offset: number = 0): number => {
    const t = typeof v;
    switch (t) {
        case "boolean":
            let u: bigint = 0n;
            if (v) {
                u = 1n
            }
            offset = b.writeBigUInt64BE(u, offset);
            return offset;
        case "number":
            offset = b.writeBigUInt64BE(BigInt(v), offset);
            return offset;
        case "bigint":
            offset = b.writeBigInt64BE(v, offset);
            return offset;
        case "string":
            offset += b.write(v, offset);
            return offset;
        case "object":
            if (v instanceof Buffer) {
                offset = v.copy(b, offset);
                return offset;
            }
    }
    throw new Error("value to binary as error: invalid typeof " + t);
};

export const valToBinary = (v: any): Buffer => {
    let b: Buffer;
    const t = typeof v;
    switch (t) {
        case "boolean":
            let u: bigint = 0n;
            if (v) {
                u = 1n
            }
            b = Buffer.alloc(8);
            b.writeBigUInt64BE(u);
            return b;
        case "number":
            b = Buffer.alloc(8);
            b.writeBigUInt64BE(BigInt(v));
            return b;
        case "bigint":
            b = Buffer.alloc(8);
            b.writeBigInt64BE(v);
            return b;
        case "string":
            b = Buffer.alloc(v.length);
            b.write(v);
            return b;
        case "object":
            if (v instanceof Buffer) {
                return v;
            }
    }
    throw new Error("value to binary error: invalid typeof " + t);
};

export const dataGetBoundary = async (s: net.Socket, baseId: bigint = 0n, seriesId: bigint = 0n): Promise<Boundary> => {
    let b = Buffer.alloc(1+4+8+8);
    b.writeUint8(DataGetBoundary);
    b.writeInt32BE(8+8, 1);
    b.writeBigInt64BE(baseId, 1+4);
    b.writeBigInt64BE(seriesId, 1+4+8);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data get boundary error: " + dec.string();
        throw new Error(msg);
    }
    const min = dec.int64();
    const max = dec.int64();
    const rowCount = dec.int64();
    const startCP = dec.string();
    const endCP = dec.string();
    return new Boundary({
        min: min,
        max: max,
        rowCount: rowCount,
        startCP: startCP,
        endCP: endCP,
    });
}

class Boundary {
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

export const dataAddRowCache = async (s: net.Socket, baseId: bigint, data: string): Promise<bigint> => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8+Buffer.byteLength(data));
    offset = b.writeUint8(DataAddRowCache, offset);
    offset = b.writeInt32BE(8+Buffer.byteLength(data), offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset += b.write(data, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data add row cache error: " + dec.string();
        throw new Error(msg);
    }
    return dec.int64();
}

export const dataAddRows = async (s: net.Socket, baseId: bigint, data: string) => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8+Buffer.byteLength(data));
    offset = b.writeUint8(DataAddRows, offset);
    offset = b.writeInt32BE(8+Buffer.byteLength(data), offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset += b.write(data, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "data add rows error: " + dec.string();
        throw new Error(msg);
    }
}

export const writeRow = (seriesId: bigint, cl: number, t: bigint, q: number, value: any): Buffer => {
    let b: Buffer;
    let offset: number = 0;
    switch (cl) {
        case SimpleClass:
            b = Buffer.alloc(8+1+8+8+4);
            offset = b.writeBigInt64BE(seriesId, offset);
            offset = b.writeUint8(cl, offset);
            offset = b.writeBigInt64BE(t, offset);
            offset = valToBinaryAs(value, b, offset);
            offset = b.writeUint32BE(q, offset);
            return b;
        case BlobClass:
            b = Buffer.alloc(8+1+8+sizeStringBE(value)+4);
            offset = b.writeBigInt64BE(seriesId, offset);
            offset = b.writeUint8(cl, offset);
            offset = b.writeBigInt64BE(t, offset);
            switch (typeof value) {
                case "string":
                    offset = writeStringBE(b, value, offset);
                    break;
                default:
                    throw new Error("row encode: invalid typeof value");
            }
            offset = b.writeUint32BE(q, offset);
            return b;
        default:
            throw new Error("row encode: invalid class");
    }
}

export const dataGetValueAtTime = async (s: net.Socket, baseId: bigint, seriesId: bigint, t: bigint, cl: number): Promise<Row> => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8+8+8);
    offset = b.writeUint8(DataGetValueAtTime, offset);
    offset = b.writeInt32BE(8+8+8, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = b.writeBigInt64BE(seriesId, offset);
    offset = b.writeBigInt64BE(t, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "data get value at time error: " + dec.string();
        throw new Error(msg);
    }
    t = dec.int64();
    let value: Buffer;
    switch (cl) {
        case SimpleClass:
            value = dec.read(8);
            break;
        case BlobClass:
            value = Buffer.from(dec.string());
            break
        default:
            const msg = `data get value at time error: invalid class ${cl}`;
            throw new Error(msg);
    }
    const q = dec.read(4);
    return new Row({
        value: value,
        q: q,
        t: t,
    });
}

export const dataGetRangeDirection = async (
    s: net.Socket,
    baseId: bigint,
    seriesId: bigint,
    cl: number,
    direct: number,
    limit: bigint,
    min: bigint,
    max: bigint,
    dpi: number,
): Promise<RecWitchCP> => {
    let offset: number = 0;
    const pckLength = 8+8+1+8+8+8+2;
    let b = Buffer.alloc(1+4+pckLength);
    offset = b.writeUint8(DateGetRangeDirection, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = b.writeBigInt64BE(seriesId, offset);
    offset = b.writeUint8(direct, offset);
    offset = b.writeBigInt64BE(limit, offset);
    offset = b.writeBigInt64BE(min, offset);
    offset = b.writeBigInt64BE(max, offset);
    offset = b.writeInt16BE(dpi, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data get range direction error: " + dec.string();
        throw new Error(msg);
    }
    const startCP = dec.string();
    const endCP = dec.string();
    const hasContinuation = dec.boolean();
    const recsLength = dec.int64();
    const recs: Array<Row> = [];
    for (let i = 0; i < recsLength; i++) {
        const t = dec.int64();
        let value: Buffer;
        switch (cl) {
            case SimpleClass:
                value = dec.read(8);
                break;
            case BlobClass:
                value = Buffer.from(dec.string());
                break;
            default:
                const msg = "data get range direction error: invalid class";
                throw new Error(msg);
        }
        const q = dec.read(4);
        recs.push(new Row({
            value: value,
            t: t,
            q: q,
        }));
    }
    return new RecWitchCP({
        startCP: startCP,
        endCP: endCP,
        hasContinuation: hasContinuation,
        recs: recs,
    });
}

export const dataDeleteRows = async (s: net.Socket, baseId: bigint, seriesId: bigint, timeStart: bigint, timeEnd: bigint): Promise<bigint> => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8+8+8+8);
    offset = b.writeUint8(DataDeleteRows, offset);
    offset = b.writeInt32BE(8+8+8+8, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = b.writeBigInt64BE(seriesId, offset);
    offset = b.writeBigInt64BE(timeStart, offset);
    offset = b.writeBigInt64BE(timeEnd, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data delete rows error: " + dec.string();
        throw new Error(msg);
    }
    return dec.int64();
}

export const dataGetCP = async (s: net.Socket, baseId: bigint, seriesId: bigint, t: bigint): Promise<string> => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8+8+8);
    offset = b.writeUint8(DataGetCP, offset);
    offset = b.writeInt32BE(8+8+8, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = b.writeBigInt64BE(seriesId, offset);
    offset = b.writeBigInt64BE(t, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data get CP error: " + dec.string();
        throw new Error(msg);
    }
    return dec.string();
}

export const dataGetFromCP = async (s: net.Socket, baseId: bigint, cp: string, direct: number, limit: bigint, cl: number): Promise<RecWitchCP> => {
    let offset: number = 0;
    const pckLength = 8+sizeStringBE(cp)+1+8;
    let b = Buffer.alloc(1+4+pckLength);
    offset = b.writeUint8(DataGetFromCP, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = writeStringBE(b, cp, offset);
    offset = b.writeUint8(direct, offset);
    offset = b.writeBigInt64BE(limit, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data get from CP error: " + dec.string();
        throw new Error(msg);
    }
    const startCP = dec.string();
    const endCP = dec.string();
    const hasContinuation = dec.boolean();
    const recsLength = dec.int64();
    const recs: Array<Row> = [];
    for (let i = 0; i < recsLength; i++) {
        const t = dec.int64();
        let value: Buffer;
        switch (cl) {
            case SimpleClass:
                value = dec.read(8);
                break;
            case BlobClass:
                value = Buffer.from(dec.string());
                break;
            default:
                const msg = "data get from CP error: invalid class";
                throw new Error(msg);
        }
        const q = dec.read(4);
        recs.push(new Row({
            value: value,
            t: t,
            q: q,
        }));
    }
    return new RecWitchCP({
        startCP: startCP,
        endCP: endCP,
        hasContinuation: hasContinuation,
        recs: recs,
    });
}

export const dataGetRangeFromCP = async (
    s: net.Socket,
    baseId: bigint,
    cp: string,
    direct: number,
    limit: bigint,
    cl: number,
    min: bigint,
    max: bigint,
    dpi: number,
    ): Promise<RecWitchCP> => {
    let offset: number = 0;
    const pckLength = 8+sizeStringBE(cp)+1+8+8+8+2;
    let b = Buffer.alloc(1+4+pckLength);
    offset = b.writeUint8(DateGetRangeFromCP, offset);
    offset = b.writeInt32BE(pckLength, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    offset = writeStringBE(b, cp, offset);
    offset = b.writeUint8(direct, offset);
    offset = b.writeBigInt64BE(limit, offset);
    offset = b.writeBigInt64BE(min, offset);
    offset = b.writeBigInt64BE(max, offset);
    offset = b.writeInt16BE(dpi, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    dec.int32();
    if (c !== 0) {
        const msg = "data get range from CP error: " + dec.string();
        throw new Error(msg);
    }
    const startCP = dec.string();
    const endCP = dec.string();
    const hasContinuation = dec.boolean();
    const recsLength = dec.int64();
    const recs: Array<Row> = [];
    for (let i = 0; i < recsLength; i++) {
        const t = dec.int64();
        let value: Buffer;
        switch (cl) {
            case SimpleClass:
                value = dec.read(8);
                break;
            case BlobClass:
                const v = dec.string();
                value = Buffer.from(v);
                break;
            default:
                const msg = "data get range from CP error: invalid class";
                throw new Error(msg);
        }
        const q = dec.read(4);
        recs.push(new Row({
            value: value,
            t: t,
            q: q,
        }));
    }
    return new RecWitchCP({
        startCP: startCP,
        endCP: endCP,
        hasContinuation: hasContinuation,
        recs: recs,
    });
}

export const baseClose = async (s: net.Socket, baseId: bigint) => {
    let offset: number = 0;
    let b = Buffer.alloc(1+4+8);
    offset = b.writeUint8(BaseClose, offset);
    offset = b.writeInt32BE(8, offset);
    offset = b.writeBigInt64BE(baseId, offset);
    b = await send(s, b);
    const dec = new Decoder(b);
    const c = dec.uint8();
    if (c !== 0) {
        dec.int32();
        const msg = "base close error: " + dec.string();
        throw new Error(msg);
    }
    return;
}
