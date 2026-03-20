/*! https://github.com/mathiasbynens/utf8.js v3.0.0 by @mathias */
declare function utf8encode(string: any): string;
declare function utf8decode(byteString: any): string;
declare const root: {
    version: string;
    encode: typeof utf8encode;
    decode: typeof utf8decode;
};
export default root;
//# sourceMappingURL=utf8.d.ts.map