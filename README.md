LiteDB connector for NodeJS

# Примеры использования

## Работа с базой
```typescript
import {Socket} from "../socket.js";
import {baseCreate, baseGetInfo, baseGetList, baseRemove, baseUpdate} from "../lib.js";
import {Base, FS_FS} from "../base.js";

const address: string = "127.0.0.1";
const port: number = 7777;
const login = "admin";
const pass = "admin";

console.log("address:", address);
console.log("port:", port);
console.log("login:", login);
console.log("pass:", pass);

const socket = new Socket(login, pass);
const options = {
    port: port,
    host: address,
};
const listener = async () => {
    await socket.handshake();
    console.log("protocol version:", socket.protocolVersion);
    console.log("session key:", socket.sessionKey);
    const bases = await baseGetList(socket);
    const baseInstName = "test tcp api";
    for (const base of bases) {
        const name = base.name;
        if (name.startsWith(baseInstName)) {
            await baseRemove(socket, name);
        }
    }
    const baseInst = new Base();
    baseInst.name = baseInstName;
    baseInst.comment = baseInstName;
    baseInst.path = "./db/test_tcp_api";
    baseInst.looping = {
        type: 0,
        lt: "",
        lifeTime: 0,
    };
    baseInst.dbSize = "100m";
    baseInst.fsType = FS_FS;
    baseInst.autoAddSeries = true;
    baseInst.autoSave = false;

    await baseCreate(socket, baseInst);

    const oldName = baseInst.name;
    baseInst.name = "test tcp api changed";
    baseInst.comment = baseInst.name;
    await baseUpdate(socket, oldName, baseInst);

    const getBaseInst = await baseGetInfo(socket, baseInst.name);
    if (getBaseInst.name !== baseInst.name) {
        throw new Error("names not equal");
    }
    done();
};
socket.connect(options, listener);
```

## Чтение из базы

```typescript
import {Socket} from "../socket.js";
import {
    baseCreate,
    baseOpen,
    baseRemove,
    dataAddRow,
    dataGetBoundary,
    seriesCreate,
    baseGetInfo,
    dataAddRowCache,
    writeRow,
    dataAddRows,
    dataGetValueAtTime,
    dataGetRangeDirection,
    dataDeleteRows,
    dataGetCP,
    dataGetFromCP, dataGetRangeFromCP, baseClose
} from "../lib.js";
import {Base, FS_FS} from "../base.js";
import {Series} from "../series.js";
import {BlobClass, LINT, SimpleClass, STRING} from "../types.js";

const address: string = "127.0.0.1";
const port: number = 7777;
const login = "admin";
const pass = "admin";

console.log("address:", address);
console.log("port:", port);
console.log("login:", login);
console.log("pass:", pass);

const baseName = "test tcp api";
const baseId: bigint = 222n;
const series0: bigint = 0n;
const series1: bigint = 1n;
const series2: bigint = 2n;
const series3: bigint = 3n;
const class0 = 0;

const socket = new Socket(login, pass);
const options = {
    port: port,
    host: address,
};
const listener = async () => {
    await socket.handshake();
    console.log("protocol version:", socket.protocolVersion);
    console.log("session key:", socket.sessionKey);
    const baseInfo = await baseGetInfo(socket, baseName)
        .then(console.log)
        .then(() => baseRemove(socket, baseName))
        .then(() => console.log("remove"))
        .catch(console.log);
    const base = new Base({
        name: baseName,
        comment: baseName,
        path: "./db/test_tcp_api",
        dbSize: "100m",
        fsType: FS_FS,
        autoAddSeries: true,
    });
    await baseCreate(socket, base);
    console.log("create");

    let series = new Series({
        name: "LINT_single",
        type: LINT,
        id: series0,
    });
    await seriesCreate(socket, baseName, series);
    series = new Series({
        name: "LINT_cache",
        type: LINT,
        id: series1,
    });
    await seriesCreate(socket, baseName, series);
    series = new Series({
        name: "LINT_multi",
        type: LINT,
        id: series2,
    });
    await seriesCreate(socket, baseName, series);
    series = new Series({
        name: "STRING_multi",
        type: STRING,
        id: series3,
        class: 1,
    });
    await seriesCreate(socket, baseName, series);

    await baseOpen(socket, baseId, baseName);

    for (let i = 0; i < 10; i++) {
        await dataAddRow(socket, baseId, series0, class0, BigInt(i), 92, i);
    }

    const list = new Array<Buffer>(10);
    for (let i = 0; i < 10; i++) {
        list[i] = writeRow(series1, SimpleClass, BigInt(i), 92, i);
    }
    let count = await dataAddRowCache(socket, baseId, Buffer.concat(list).toString());
    console.log(count);

    for (let i = 0; i < 10; i++) {
        list[i] = writeRow(series2, SimpleClass, BigInt(i), 92, i);
    }
    await dataAddRows(socket, baseId, Buffer.concat(list).toString());

    for (let i = 0; i < 10; i++) {
        const value = `Разкудрить твою налева все четыре колеса ${i} раз`
        list[i] = writeRow(series3, BlobClass, BigInt(i), 92, value);
    }
    await dataAddRows(socket, baseId, Buffer.concat(list).toString());

    const boundary = await dataGetBoundary(socket, baseId, series0);
    console.log(boundary);

    const rec = await dataGetValueAtTime(socket, baseId, series2, 2n, SimpleClass);
    console.log(rec);

    let recRange = await dataGetRangeDirection(socket, baseId, series2, SimpleClass, 1, 100n, 0n, 10n, 0);
    console.log(recRange);

    count = await dataDeleteRows(socket, baseId, series2, 5n, 7n);
    console.log(count);

    recRange = await dataGetRangeDirection(socket, baseId, series2, SimpleClass, 1, 100n, 0n, 10n, 0);
    console.log(recRange);

    let cp = await dataGetCP(socket, baseId, series2, 4n);
    console.log(cp);

    let recs = await dataGetFromCP(socket, baseId, cp, 1, 2n, SimpleClass);
    console.log(recs);

    recs = await dataGetRangeFromCP(socket, baseId, cp, 1, 10n, SimpleClass, 2n, 8n, 0);
    console.log(recs);

    cp = await dataGetCP(socket, baseId, series3, 4n);
    console.log(cp);

    recs = await dataGetRangeFromCP(socket, baseId, cp, 1, 10n, BlobClass, 2n, 8n, 0);
    console.log(recs);

    await baseClose(socket, baseId);
    console.log(`base ${baseId} closed`);
};
socket.on("error", console.log);
socket.connect(options, () => {
    listener()
        .catch(console.log)
        .then(done);
});
```
