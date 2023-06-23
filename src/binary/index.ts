export const writeStringBE = (b: Buffer, s: string, offset: number = 0): number => {
    const length = Buffer.byteLength(s);
    offset = b.writeInt32BE(length, offset);
    offset += b.write(s, offset);
    return offset;
};

export const sizeStringBE = (s: string, offset: number = 0): number => {
    offset += 4;
    offset += Buffer.byteLength(s);
    return offset;
};
