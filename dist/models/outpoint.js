"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outpoint = void 0;
class Outpoint {
    constructor(txid, vout) {
        this.txid = Buffer.alloc(32);
        this.vout = 0;
        if (txid)
            this.txid = txid;
        if (vout)
            this.vout = vout;
    }
    toString() {
        return this.txid.toString('hex') + '_' + this.vout;
    }
    toBuffer() {
        return Buffer.concat([
            this.txid,
            Buffer.from(this.vout.toString(16).padStart(8, '0'), 'hex'),
        ]);
    }
    static fromString(str) {
        const origin = new Outpoint();
        if (!str.match(/^[0-9a-fA-F]{64}_\d+$/))
            throw new Error('invalid outpoint');
        origin.txid = Buffer.from(str.slice(0, 64), 'hex');
        origin.vout = parseInt(str.slice(65), 10);
        return origin;
    }
    static fromBuffer(buf) {
        const origin = new Outpoint();
        origin.txid = buf.slice(0, 32);
        origin.vout = parseInt(buf.slice(32).toString('hex'), 16);
        return origin;
    }
    toJSON() {
        return this.toString();
    }
}
exports.Outpoint = Outpoint;
//# sourceMappingURL=outpoint.js.map