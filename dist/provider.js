"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcProvider = exports.ProxyProvider = exports.RpcProvider = void 0;
const Client = require("bitcoin-core");
require("cross-fetch/polyfill");
const createError = require("http-errors");
const http_errors_1 = require("http-errors");
const ioredis_1 = require("ioredis");
let redis;
if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379;
    console.log("Connecting to redis:", host, port);
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
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(txid));
        if (!rawtx) {
            rawtx = await this.client.getTransactionByHash(txid, {
                extension: "bin",
            });
            if (!rawtx) {
                throw new http_errors_1.NotFound();
            }
            redis === null || redis === void 0 ? void 0 : redis.set(txid, rawtx);
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
    async getBlockByHeight(height) {
        const hash = await this.client.getBlockHash(height);
        return { height, hash };
    }
    async getBlockByHash(hash) {
        const info = await this.client.getBlockHeader(hash);
        return {
            height: info.height,
            hash,
        };
    }
}
exports.RpcProvider = RpcProvider;
class ProxyProvider {
    constructor() {
        this.network = "bsv";
    }
    async getRawTx(txid) {
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(txid));
        if (!rawtx) {
            const resp = await fetch(`https://junglebus.gorillapool.io/v1/transaction/get/${txid}/bin`);
            if (!resp.ok) {
                throw createError(resp.status, resp.statusText);
            }
            rawtx = Buffer.from(await resp.arrayBuffer());
            redis === null || redis === void 0 ? void 0 : redis.set(txid, rawtx);
        }
        return rawtx;
    }
    async getBlockchainInfo() {
        const resp = await fetch("https://api.whatsonchain.com/v1/bsv/main/block/headers");
        if (!resp.ok) {
            throw createError(resp.status, resp.statusText);
        }
        const info = await resp.json();
        return {
            height: info[0].height,
            hash: info[0].hash,
        };
    }
    async getBlockByHeight(height) {
        const resp = await fetch(`https://api.whatsonchain.com/v1/bsv/main/block/height/${height}`);
        const info = await resp.json();
        return { height, hash: info.hash };
    }
    async getBlockByHash(hash) {
        const resp = await fetch(`https://api.whatsonchain.com/v1/bsv/main/block/hash/${hash}`);
        const info = await resp.json();
        return {
            height: info.height,
            hash,
        };
    }
}
exports.ProxyProvider = ProxyProvider;
class BtcProvider {
    constructor() {
        this.network = "btc";
    }
    async getRawTx(txid) {
        let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(txid));
        if (!rawtx) {
            // TODO: Make this configuration based
            const resp = await fetch(`https://ordfs.gorillapool.io/v1/btc/tx/${txid}`);
            if (!resp.ok) {
                throw createError(resp.status, resp.statusText);
            }
            rawtx = Buffer.from(await resp.arrayBuffer());
            redis === null || redis === void 0 ? void 0 : redis.set(txid, rawtx);
        }
        return rawtx;
    }
    async getBlockchainInfo() {
        // TODO: Make this configuration based
        const resp = await fetch("https://ordfs.gorillapool.io/v1/btc/block/latest");
        if (!resp.ok) {
            throw createError(resp.status, resp.statusText);
        }
        return resp.json();
    }
    async getBlockByHeight(height) {
        const resp = await fetch(`https://ordfs.gorillapool.io/v1/btc/block/height/${height}`);
        const info = await resp.json();
        return { height, hash: info.hash };
    }
    async getBlockByHash(hash) {
        const resp = await fetch(`https://ordfs.gorillapool.io/v1/btc/block/hash/${hash}`);
        const info = await resp.json();
        return {
            height: info.height,
            hash,
        };
    }
}
exports.BtcProvider = BtcProvider;
//# sourceMappingURL=provider.js.map