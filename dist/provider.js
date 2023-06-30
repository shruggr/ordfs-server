"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JungleBusProvider = exports.RpcProvider = void 0;
const Client = require("bitcoin-core");
const js_junglebus_1 = require("@gorillapool/js-junglebus");
class RpcProvider {
    constructor(network, host, port, username, password) {
        this.network = network;
        this.client = new Client({
            host,
            port,
            username,
            password,
        });
    }
    async getRawTx(txid) {
        return this.client.getTransactionByHash(txid, {
            extension: 'bin'
        });
    }
}
exports.RpcProvider = RpcProvider;
class JungleBusProvider {
    constructor() {
        this.network = 'bsv';
    }
    async getRawTx(txid) {
        const jb = new js_junglebus_1.JungleBusClient('https://junglebus.gorillapool.io');
        const txnData = await jb.GetTransaction(txid);
        return Buffer.from(txnData.transaction, 'base64');
    }
}
exports.JungleBusProvider = JungleBusProvider;
//# sourceMappingURL=provider.js.map