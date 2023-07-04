"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcProvider = exports.JungleBusProvider = exports.RpcProvider = void 0;
const js_junglebus_1 = require("@gorillapool/js-junglebus");
const Client = require("bitcoin-core");
require("cross-fetch/polyfill");
const http_errors_1 = require("http-errors");
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
            extension: "bin",
        });
    }
    async getBlockchainInfo() {
        const info = await this.client.getBlockchainInfo();
        return {
            height: info.blocks,
            hash: info.bestblockhash,
        };
    }
}
exports.RpcProvider = RpcProvider;
class JungleBusProvider {
    constructor() {
        this.network = "bsv";
    }
    async getRawTx(txid) {
        const jb = new js_junglebus_1.JungleBusClient("https://junglebus.gorillapool.io");
        const txnData = await jb.GetTransaction(txid);
        return Buffer.from(txnData.transaction, "base64");
    }
    async getBlockchainInfo() {
        const resp = await fetch("https://api.whatsonchain.com/v1/bsv/main/block/headers");
        if (!resp.ok) {
            throw (0, http_errors_1.default)(resp.status, resp.statusText);
        }
        const info = await resp.json();
        return {
            height: info[0].height,
            hash: info[0].hash,
        };
    }
}
exports.JungleBusProvider = JungleBusProvider;
class BtcProvider {
    constructor() {
        this.network = "btc";
    }
    async getRawTx(txid) {
        const resp = await fetch(`https://ordinals.shruggr.cloud/v1/btc/tx/${txid}`);
        if (!resp.ok) {
            throw (0, http_errors_1.default)(resp.status, resp.statusText);
        }
        return Buffer.from(await resp.arrayBuffer());
    }
    async getBlockchainInfo() {
        const resp = await fetch("https://ordinals.shruggr.cloud/v1/btc/block/latest");
        if (!resp.ok) {
            throw (0, http_errors_1.default)(resp.status, resp.statusText);
        }
        return resp.json();
    }
}
exports.BtcProvider = BtcProvider;
//# sourceMappingURL=provider.js.map