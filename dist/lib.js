"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOutputScript = exports.loadInscription = exports.loadOutpointFromDNS = void 0;
const js_junglebus_1 = require("@gorillapool/js-junglebus");
const core_1 = require("@ts-bitcoin/core");
;
const dns = require("dns/promises");
const http_errors_1 = require("http-errors");
const outpoint_1 = require("./outpoint");
const jb = new js_junglebus_1.JungleBusClient('https://junglebus.gorillapool.io');
async function loadOutpointFromDNS(hostname) {
    const TXTs = await dns.resolveTxt(hostname);
    const prefix = "1sat-origin=";
    let origin = '';
    for (let TXT of TXTs) {
        for (let elem of TXT) {
            if (!elem.startsWith(prefix))
                continue;
            console.log("Elem:", elem);
            origin = elem.slice(prefix.length);
            console.log("Origin:", origin);
        }
    }
    if (!origin) {
        throw new http_errors_1.NotFound();
    }
    return outpoint_1.Outpoint.fromString(origin);
}
exports.loadOutpointFromDNS = loadOutpointFromDNS;
async function loadInscription(outpoint) {
    const txnData = await jb.GetTransaction(outpoint.txid.toString('hex'));
    const tx = core_1.Tx.fromBuffer(Buffer.from((txnData === null || txnData === void 0 ? void 0 : txnData.transaction) || '', 'base64'));
    return parseOutputScript(tx.txOuts[outpoint.vout].script);
}
exports.loadInscription = loadInscription;
async function parseOutputScript(script) {
    var _a;
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
    let data;
    for (let i = opORD + 1; i < script.chunks.length; i += 2) {
        if (script.chunks[i].buf)
            break;
        switch (script.chunks[i].opCodeNum) {
            case core_1.OpCode.OP_0:
                data = script.chunks[i + 1].buf;
                break;
            case core_1.OpCode.OP_1:
                type = script.chunks[i + 1].buf.toString('utf8');
                break;
            case core_1.OpCode.OP_ENDIF:
                break;
        }
    }
    if (!data) {
        throw new http_errors_1.NotFound("Inscription not found");
    }
    return { type, data };
}
exports.parseOutputScript = parseOutputScript;
//# sourceMappingURL=lib.js.map