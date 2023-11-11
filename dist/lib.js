"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadInscription = exports.loadPointerFromDNS = void 0;
const dns = require("dns/promises");
const cross_fetch_1 = require("cross-fetch");
const http_errors_1 = require("http-errors");
const createError = require("http-errors");
const data_1 = require("./data");
const outpoint_1 = require("./models/outpoint");
async function loadPointerFromDNS(hostname) {
    const lookupDomain = `_ordfs.${hostname}`;
    const TXTs = await dns.resolveTxt(lookupDomain);
    const prefix = "ordfs=";
    let pointer = "";
    console.log("Lookup Up:", lookupDomain);
    for (const TXT of TXTs) {
        for (const elem of TXT) {
            if (!elem.startsWith(prefix))
                continue;
            console.log("Elem:", elem);
            pointer = elem.slice(prefix.length);
            console.log("Origin:", pointer);
            return pointer;
        }
    }
    throw new http_errors_1.NotFound();
}
exports.loadPointerFromDNS = loadPointerFromDNS;
async function loadInscription(pointer, metadata = false, fuzzy = false) {
    console.log("loadInscription", pointer);
    let file;
    if (pointer.match(/^[0-9a-fA-F]{64}$/)) {
        file = await (0, data_1.loadFileByTxid)(pointer);
    }
    else if (pointer.match(/^[0-9a-fA-F]{64}i\d+$/)) {
        file = await (0, data_1.loadFileByInpoint)(pointer);
    }
    else if (pointer.match(/^[0-9a-fA-F]{64}_\d+$/)) {
        file = await (0, data_1.loadFileByOutpoint)(outpoint_1.Outpoint.fromString(pointer), fuzzy);
        if (file && metadata) {
            try {
                const url = `https://v3.ordinals.gorillapool.io/api/txos/${pointer}`;
                const resp = await (0, cross_fetch_1.default)(url);
                if (!resp.ok) {
                    throw createError(resp.status, resp.statusText);
                }
                const data = await resp.json();
                const { hash } = await (0, data_1.getBlockByHeight)('bsv', data.height);
                file.meta = Object.assign(Object.assign({}, data), { hash });
            }
            catch (_a) { }
            ;
        }
    }
    else
        throw new http_errors_1.BadRequest("Invalid Pointer");
    if (!file)
        throw new http_errors_1.NotFound();
    return file;
}
exports.loadInscription = loadInscription;
//# sourceMappingURL=lib.js.map