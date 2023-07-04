"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScript = exports.loadInscription = exports.loadPointerFromDNS = exports.getRawTx = exports.getLatestBlock = void 0;
const core_1 = require("@ts-bitcoin/core");
const bitcore_lib_1 = require("bitcore-lib");
const dns = require("dns/promises");
const http_errors_1 = require("http-errors");
const provider_1 = require("./provider");
let btcProvider = new provider_1.BtcProvider();
let bsvProvider = new provider_1.JungleBusProvider();
if (process.env.BITCOIN_HOST) {
    bsvProvider = new provider_1.RpcProvider('bsv', process.env.BITCOIN_HOST || '', process.env.BITCOIN_PORT || '8332', process.env.BITCOIN_USER || '', process.env.BITCOIN_PASS || '');
}
if (process.env.BTC_HOST) {
    btcProvider = new provider_1.RpcProvider('btc', process.env.BTC_HOST || '', process.env.BTC_PORT || '8332', process.env.BTC_USER || '', process.env.BTC_PASS || '');
}
async function getLatestBlock(network) {
    switch (network) {
        case 'btc':
            return btcProvider.getBlockchainInfo();
        case 'bsv':
            return bsvProvider.getBlockchainInfo();
        default:
            throw new http_errors_1.NotFound('Network Not Found');
    }
}
exports.getLatestBlock = getLatestBlock;
async function getRawTx(network, txid) {
    switch (network) {
        case 'btc':
            return btcProvider.getRawTx(txid);
        case 'bsv':
            return bsvProvider.getRawTx(txid);
        default:
            throw new http_errors_1.NotFound('Network Not Found');
    }
}
exports.getRawTx = getRawTx;
async function loadPointerFromDNS(hostname) {
    const TXTs = await dns.resolveTxt(hostname);
    const prefix = "ordfs=";
    let pointer = '';
    console.log('Lookup Up:', hostname);
    outer: for (let TXT of TXTs) {
        for (let elem of TXT) {
            if (!elem.startsWith(prefix))
                continue;
            console.log("Elem:", elem);
            pointer = elem.slice(prefix.length);
            console.log("Origin:", pointer);
            break outer;
        }
    }
    if (!pointer) {
        throw new http_errors_1.NotFound();
    }
    return pointer;
}
exports.loadPointerFromDNS = loadPointerFromDNS;
async function loadInscription(pointer) {
    console.log("loadInscription", pointer);
    let script;
    if (pointer.match(/^[0-9a-fA-F]{64}_\d*$/)) {
        const [txid, vout] = pointer.split('_');
        console.log('BSV:', txid, vout);
        const rawtx = await bsvProvider.getRawTx(txid);
        const tx = core_1.Tx.fromBuffer(rawtx);
        script = tx.txOuts[parseInt(vout, 10)].script;
    }
    else if (pointer.match(/^[0-9a-fA-F]{64}i\d+$/) && btcProvider) {
        const [txid, vin] = pointer.split('i');
        console.log('BTC', txid, vin);
        const rawtx = await btcProvider.getRawTx(txid);
        const tx = new bitcore_lib_1.Transaction(rawtx);
        script = core_1.Script.fromBuffer(tx.inputs[parseInt(vin, 10)].witnesses[1]);
    }
    else
        throw new Error('Invalid Pointer');
    if (!script)
        throw new http_errors_1.NotFound();
    const file = parseScript(script);
    if (!file)
        throw new http_errors_1.NotFound();
    return file;
}
exports.loadInscription = loadInscription;
function parseScript(script) {
    var _a, _b, _c;
    let opFalse = 0;
    let opIf = 0;
    let opORD = 0;
    const lock = new core_1.Script();
    for (let [i, chunk] of script.chunks.entries()) {
        if (chunk.opCodeNum === core_1.OpCode.OP_FALSE) {
            opFalse = i;
        }
        if (chunk.opCodeNum === core_1.OpCode.OP_IF) {
            opIf = i;
        }
        if ((_a = chunk.buf) === null || _a === void 0 ? void 0 : _a.equals(Buffer.from('ord', 'utf8'))) {
            if (opFalse === i - 2 && opIf === i - 1) {
                opORD = i;
                lock.chunks = script.chunks.slice(0, i - 2);
                break;
            }
        }
        lock.chunks.push(chunk);
    }
    let type = 'application/octet-stream';
    let data = Buffer.alloc(0);
    for (let i = opORD + 1; i < script.chunks.length; i++) {
        // console.log(script.chunks[i])
        switch (script.chunks[i].opCodeNum) {
            case core_1.OpCode.OP_FALSE:
                while (((_b = script.chunks[i + 1]) === null || _b === void 0 ? void 0 : _b.opCodeNum) >= 1 &&
                    ((_c = script.chunks[i + 1]) === null || _c === void 0 ? void 0 : _c.opCodeNum) <= core_1.OpCode.OP_PUSHDATA4) {
                    data = Buffer.concat([data, script.chunks[i + 1].buf]);
                    i++;
                }
                break;
            case 1:
                // console.log(script.chunks[i].toString('hex'))
                if (script.chunks[i].buf[0] != 1)
                    return;
            case core_1.OpCode.OP_TRUE:
                type = script.chunks[i + 1].buf.toString('utf8');
                // console.log("Type:", type)
                i++;
                break;
            case core_1.OpCode.OP_ENDIF:
                return { type, data };
            default:
                return;
        }
    }
    return { type, data };
}
exports.parseScript = parseScript;
//# sourceMappingURL=lib.js.map