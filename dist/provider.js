"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcProvider = exports.JungleBusProvider = exports.RpcProvider = void 0;
const js_junglebus_1 = require("@gorillapool/js-junglebus");
const Client = require("bitcoin-core");
require("cross-fetch/polyfill");
const http_errors_1 = require("http-errors");
const ioredis_1 = require("ioredis");
let redis;
if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT ?
        parseInt(process.env.REDIS_PORT, 10) :
        6379;
    console.log('Connecting to redis:', host, port);
    redis = new ioredis_1.Redis(port, host);
}
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
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(`rawtx:${txid}`));
        if (!rawtx) {
            rawtx = await this.client.getTransactionByHash(txid, {
                extension: "bin",
            });
            if (!rawtx) {
                throw new http_errors_1.NotFound();
            }
            redis === null || redis === void 0 ? void 0 : redis.set(`rawtx:${txid}`, rawtx);
        }
        return rawtx;
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
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(`rawtx:${txid}`));
        if (!rawtx) {
            const jb = new js_junglebus_1.JungleBusClient("https://junglebus.gorillapool.io");
            const txnData = await jb.GetTransaction(txid);
            rawtx = Buffer.from(txnData.transaction, "base64");
            redis === null || redis === void 0 ? void 0 : redis.set(`rawtx:${txid}`, rawtx);
        }
        return rawtx;
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
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(`rawtx:${txid}`));
        if (!rawtx) {
            const resp = await fetch(`https://ordinals.shruggr.cloud/v1/btc/tx/${txid}`);
            if (!resp.ok) {
                throw (0, http_errors_1.default)(resp.status, resp.statusText);
            }
            rawtx = Buffer.from(await resp.arrayBuffer());
            redis === null || redis === void 0 ? void 0 : redis.set(`rawtx:${txid}`, rawtx);
        }
        return rawtx;
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