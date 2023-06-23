import * as net from "net";

import {protocolVersion,loginGetKeys,loginValidPass} from "./lib.js";

export class Socket extends net.Socket {

    public readonly login: string;
    public readonly pass: string;
    public protocolVersion: number;
    public sessionKey: string;

    public constructor(login: string, pass: string, options?: net.SocketConstructorOpts) {
        super(options);
        this.login = login;
        this.pass = pass;
        this.protocolVersion = 0;
        this.sessionKey = "";
    }

    public async handshake() {
        this.protocolVersion = await protocolVersion(this);
        const [ , hash ] = await loginGetKeys(this, this.login, this.pass);
        this.sessionKey = await loginValidPass(this, hash);
    }
}
