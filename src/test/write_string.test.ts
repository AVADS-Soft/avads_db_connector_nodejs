import test from "node:test";

import {sizeStringBE, writeStringBE} from "../binary/index.js";

test("write string test", (_, done) => {
    let offset: number = 0;
    const s = "test text абвгд 12345 !@#$%";
    const size = sizeStringBE(s);
    console.log(`size: ${size}`);
    const b = Buffer.alloc(size);
    offset = writeStringBE(b, s, offset);
    console.log(`offset: ${offset}`);
    let err: Error|undefined = undefined;
    if (offset !== size) {
        err = new Error(`not equal: size: ${size} offset: ${offset}`);
    }
    done(err);
});