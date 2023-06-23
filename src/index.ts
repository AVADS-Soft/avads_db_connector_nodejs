import { Base, FS_FS } from "./base.js";
import {baseGetList,baseRemove,baseCreate,baseUpdate,baseGetInfo} from "./lib.js";
import { Socket } from "./socket.js";

const main = async () => {
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
        console.log(bases);
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
        console.log("end");
    };
    socket.connect(options, listener);

    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
};
