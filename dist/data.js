"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScript = exports.loadFileByTxid = exports.loadFileByInpoint = exports.loadFileByOutpoint = exports.getBlockByHash = exports.getBlockByHeight = exports.getBlockchainInfo = exports.loadTx = exports.getRawTx = void 0;
const core_1 = require("@ts-bitcoin/core");
const bitcore_lib_1 = require("bitcore-lib");
const createError = require("http-errors");
const http_errors_1 = require("http-errors");
const ioredis_1 = require("ioredis");
const provider_1 = require("./provider");
let bsvProvider = new provider_1.ProxyProvider();
let btcProvider = new provider_1.BtcProvider();
if (process.env.BITCOIN_HOST) {
    bsvProvider = new provider_1.RpcProvider("bsv", process.env.BITCOIN_HOST || "", process.env.BITCOIN_PORT || "8332", process.env.BITCOIN_USER || "", process.env.BITCOIN_PASS || "");
}
if (process.env.BTC_HOST) {
    btcProvider = new provider_1.RpcProvider("btc", process.env.BTC_HOST || "", process.env.BTC_PORT || "8332", process.env.BTC_USER || "", process.env.BTC_PASS || "");
}
const B = Buffer.from("19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut");
const ORD = Buffer.from("ord");
let redis;
if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379;
    console.log("Connecting to redis:", host, port);
    redis = new ioredis_1.Redis(port, host);
}
async function getRawTx(txid) {
    let rawtx = await (redis === null || redis === void 0 ? void 0 : redis.getBuffer(txid));
    if (!rawtx) {
        try {
            rawtx = await bsvProvider.getRawTx(txid);
        }
        catch (_a) { }
        // const url = `http://${BITCOIN_HOST}:${BITCOIN_PORT}/rest/tx/${txid}.bin`
        // const resp = await fetch(url);
        // if (!resp.ok) {
        //     throw createError(resp.status, resp.statusText)
        // }
        // rawtx = Buffer.from(await resp.arrayBuffer());
    }
    if (!rawtx) {
        try {
            rawtx = await btcProvider.getRawTx(txid);
        }
        catch (_b) { }
    }
    if (!rawtx) {
        throw new http_errors_1.NotFound();
    }
    return rawtx;
}
exports.getRawTx = getRawTx;
async function loadTx(txid) {
    return core_1.Tx.fromBuffer(await getRawTx(txid));
}
exports.loadTx = loadTx;
async function getBlockchainInfo(network) {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockchainInfo();
        case "btc":
            return btcProvider.getBlockchainInfo();
    }
    throw new Error("Invalid Network");
}
exports.getBlockchainInfo = getBlockchainInfo;
async function getBlockByHeight(network, height) {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockByHeight(height);
        case "btc":
            return btcProvider.getBlockByHeight(height);
    }
    throw new Error("Invalid Network");
}
exports.getBlockByHeight = getBlockByHeight;
async function getBlockByHash(network, hash) {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockByHash(hash);
        case "btc":
            return btcProvider.getBlockByHash(hash);
    }
    throw new Error("Invalid Network");
}
exports.getBlockByHash = getBlockByHash;
async function loadFileByOutpoint(outpoint, fuzzy = false) {
    const url = `https://ordinals.gorillapool.io/content/${outpoint.toString()}${fuzzy ? "?fuzzy=true" : ""}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw createError(resp.status, resp.statusText);
    }
    return {
        data: Buffer.from(await resp.arrayBuffer()),
        type: resp.headers.get("content-type") || "",
    };
}
exports.loadFileByOutpoint = loadFileByOutpoint;
async function loadFileByInpoint(inpoint) {
    const [txid, vout] = inpoint.split("i");
    const rawtx = await getRawTx(txid);
    const tx = new bitcore_lib_1.Transaction(rawtx);
    return parseScript(tx.txIns[parseInt(vout, 10)].script);
}
exports.loadFileByInpoint = loadFileByInpoint;
async function loadFileByTxid(txid) {
    const tx = await loadTx(txid);
    for (const txOut of tx.txOuts) {
        try {
            const data = await parseScript(txOut.script);
            if (data)
                return data;
        }
        catch (_a) { }
    }
    throw new http_errors_1.NotFound();
}
exports.loadFileByTxid = loadFileByTxid;
function parseScript(script) {
    var _a, _b, _c, _d;
    let opFalse = 0;
    let opIf = 0;
    for (const [i, chunk] of script.chunks.entries()) {
        if (chunk.opCodeNum === core_1.OpCode.OP_FALSE) {
            opFalse = i;
        }
        if (chunk.opCodeNum === core_1.OpCode.OP_IF) {
            opIf = i;
        }
        if (((_a = chunk.buf) === null || _a === void 0 ? void 0 : _a.equals(ORD)) && opFalse === i - 2 && opIf === i - 1) {
            const file = {};
            for (let j = i + 1; j < script.chunks.length; j += 2) {
                if (script.chunks[j].buf)
                    break;
                switch (script.chunks[j].opCodeNum) {
                    case core_1.OpCode.OP_0:
                        file.data = script.chunks[j + 1].buf;
                        return file;
                    case core_1.OpCode.OP_1:
                        file.type = (_b = script.chunks[j + 1].buf) === null || _b === void 0 ? void 0 : _b.toString("utf8");
                        break;
                    case core_1.OpCode.OP_ENDIF:
                        break;
                }
            }
        }
        if ((_c = chunk.buf) === null || _c === void 0 ? void 0 : _c.equals(B)) {
            return {
                data: script.chunks[i + 1].buf,
                type: (_d = script.chunks[i + 2].buf) === null || _d === void 0 ? void 0 : _d.toString("utf8"),
            };
        }
    }
    throw new http_errors_1.NotFound();
}
exports.parseScript = parseScript;
//# sourceMappingURL=data.js.map