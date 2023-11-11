import { Transaction } from "bitcore-lib";
import { Redis } from "ioredis";
import { OpCode, Script, Tx } from "@ts-bitcoin/core";
import { NotFound } from "http-errors";
import * as createError from "http-errors";
import { Outpoint } from "./models/outpoint";
import { File } from "./models/models";
import { BtcProvider, ITxProvider, ProxyProvider, RpcProvider } from "./provider";

let bsvProvider: ITxProvider = new ProxyProvider();
let btcProvider: ITxProvider = new BtcProvider();

if (process.env.BITCOIN_HOST) {
    bsvProvider = new RpcProvider(
        "bsv",
        process.env.BITCOIN_HOST || "",
        process.env.BITCOIN_PORT || "8332",
        process.env.BITCOIN_USER || "",
        process.env.BITCOIN_PASS || ""
    );
}

if (process.env.BTC_HOST) {
    btcProvider = new RpcProvider(
        "btc",
        process.env.BTC_HOST || "",
        process.env.BTC_PORT || "8332",
        process.env.BTC_USER || "",
        process.env.BTC_PASS || ""
    );
}

const B = Buffer.from("19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut");
const ORD = Buffer.from("ord");

let redis: Redis;
if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379;
    console.log("Connecting to redis:", host, port);
    redis = new Redis(port, host);
}

export async function getRawTx(txid: string): Promise<Buffer> {
    let rawtx = await redis?.getBuffer(txid);
    if (!rawtx) {
        try {
            rawtx = await bsvProvider.getRawTx(txid);
        } catch {}
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
        } catch {}
    }
    if (!rawtx) {
        throw new NotFound();
    }
    return rawtx;
}

export async function loadTx(txid: string): Promise<Tx> {
    return Tx.fromBuffer(await getRawTx(txid));
}

export async function getBlockchainInfo(network: string): Promise<{ height: number; hash: string }> {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockchainInfo();
        case "btc":
            return btcProvider.getBlockchainInfo();
    }
    throw new Error("Invalid Network");
}

export async function getBlockByHeight(
    network: string,
    height: number
): Promise<{ height: number; hash: string }> {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockByHeight(height);
        case "btc":
            return btcProvider.getBlockByHeight(height);
    }
    throw new Error("Invalid Network");
}

export async function getBlockByHash(
    network: string,
    hash: string
): Promise<{ height: number; hash: string }> {
    switch (network) {
        case "bsv":
            return bsvProvider.getBlockByHash(hash);
        case "btc":
            return btcProvider.getBlockByHash(hash);
    }
    throw new Error("Invalid Network");
}

export async function loadFileByOutpoint(outpoint: Outpoint, fuzzy = false): Promise<File> {
    const url = `https://v3.ordinals.gorillapool.io/content/${outpoint.toString()}${fuzzy ? '?fuzzy=true' : ''}`
    const resp = await fetch(url);
    if (!resp.ok) {
        throw createError(resp.status, resp.statusText);
    }
    return {
        data: Buffer.from(await resp.arrayBuffer()),
        type: resp.headers.get('content-type') || '',
    };
}

export async function loadFileByInpoint(inpoint: string): Promise<File> {
    const [txid, vout] = inpoint.split('i');
    const rawtx = await getRawTx(txid);
    const tx = new Transaction(rawtx);
    return parseScript(tx.txIns[parseInt(vout, 10)].script);
}

export async function loadFileByTxid(txid: string): Promise<File> {
    const tx = await loadTx(txid);
    for (let txOut of tx.txOuts) {
        try {
            const data = await parseScript(txOut.script);
            if (data) return data;
        } catch { }
    }
    throw new NotFound();
}

export function parseScript(script: Script): File {
    let opFalse = 0;
    let opIf = 0;
    for (let [i, chunk] of script.chunks.entries()) {
        if (chunk.opCodeNum === OpCode.OP_FALSE) {
            opFalse = i;
        }
        if (chunk.opCodeNum === OpCode.OP_IF) {
            opIf = i;
        }
        if (chunk.buf?.equals(ORD) && opFalse === i - 2 && opIf === i - 1) {
            let file = {} as File;
            for (let j = i + 1; j < script.chunks.length; j += 2) {
                if (script.chunks[j].buf) break;
                switch (script.chunks[j].opCodeNum) {
                    case OpCode.OP_0:
                        file.data = script.chunks[j + 1].buf;
                        return file;
                    case OpCode.OP_1:
                        file.type = script.chunks[j + 1].buf?.toString('utf8');
                        break;
                    case OpCode.OP_ENDIF:
                        break;
                }
            }
        }
        if (chunk.buf?.equals(B)) {
            return {
                data: script.chunks[i + 1].buf,
                type: script.chunks[i + 2].buf?.toString('utf8'),
            };
        }
    }
    throw new NotFound();
}

