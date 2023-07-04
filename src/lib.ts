import { OpCode, Script, Tx } from "@ts-bitcoin/core";
import { Transaction } from 'bitcore-lib';
import * as dns from 'dns/promises'
import { NotFound } from 'http-errors';
import { BtcProvider, ITxProvider, JungleBusProvider, RpcProvider } from "./provider";

let btcProvider: ITxProvider = new BtcProvider();
let bsvProvider: ITxProvider = new JungleBusProvider();

if (process.env.BITCOIN_HOST) {
    bsvProvider = new RpcProvider(
        'bsv',
        process.env.BITCOIN_HOST || '',
        process.env.BITCOIN_PORT || '8332',
        process.env.BITCOIN_USER || '',
        process.env.BITCOIN_PASS || '',
    );
}

if (process.env.BTC_HOST) {
    btcProvider = new RpcProvider(
        'btc',
        process.env.BTC_HOST || '',
        process.env.BTC_PORT || '8332',
        process.env.BTC_USER || '',
        process.env.BTC_PASS || '',
    );
}

export async function getLatestBlock(network: string): Promise<{height: number, hash: string}> {
    switch (network) {
        case 'btc':
            return btcProvider.getBlockchainInfo();
        case 'bsv':
            return bsvProvider.getBlockchainInfo();
        default:
            throw new NotFound('Network Not Found');
    }
}

export async function getRawTx(network: string, txid: string): Promise<Buffer> {
    switch (network) {
        case 'btc':
            return btcProvider.getRawTx(txid);
        case 'bsv':
            return bsvProvider.getRawTx(txid);
        default:
            throw new NotFound('Network Not Found');
    }
}

export async function loadPointerFromDNS(hostname: string): Promise<string> {
    const lookupDomain = `_ordfs.${hostname}`;
    const TXTs = await dns.resolveTxt(lookupDomain);
    const prefix = "ordfs=";
    let pointer = '';
    console.log('Lookup Up:', lookupDomain);
    outer:
    for (let TXT of TXTs) {
        for (let elem of TXT) {
            if (!elem.startsWith(prefix)) continue;
            console.log("Elem:", elem)
            pointer = elem.slice(prefix.length)
            console.log("Origin:", pointer)
            break outer;
        }
    }

    if (!pointer) {
        throw new NotFound()
    }
    return pointer;
}

export async function loadInscription(pointer: string): Promise<File> {
    console.log("loadInscription", pointer)
    let script: Script | undefined
    if (pointer.match(/^[0-9a-fA-F]{64}_\d*$/)) {
        const [txid, vout] = pointer.split('_');
        console.log('BSV:', txid, vout)
        const rawtx = await bsvProvider.getRawTx(txid);
        const tx = Tx.fromBuffer(rawtx);
        script = tx.txOuts[parseInt(vout, 10)].script;
    } else if (pointer.match(/^[0-9a-fA-F]{64}i\d+$/) && btcProvider) {
        const [txid, vin] = pointer.split('i');
        console.log('BTC', txid, vin);
        const rawtx = await btcProvider.getRawTx(txid);
        const tx = new Transaction(rawtx);
        script = Script.fromBuffer(tx.inputs[parseInt(vin, 10)].witnesses[1])
    } else throw new Error('Invalid Pointer')

    if (!script) throw new NotFound();

    const file = parseScript(script);
    if (!file) throw new NotFound();
    return file;
}

export interface File {
    type: string;
    data: Buffer;
}

export interface OrdFS {
    [filename: string]: string;
}

export function parseScript(script: Script): File | undefined {
    let opFalse = 0;
    let opIf = 0;
    let opORD = 0;
    const lock = new Script();
    for (let [i, chunk] of script.chunks.entries()) {
        if (chunk.opCodeNum === OpCode.OP_FALSE) {
            opFalse = i;
        }
        if (chunk.opCodeNum === OpCode.OP_IF) {
            opIf = i;
        }
        if (chunk.buf?.equals(Buffer.from('ord', 'utf8'))) {
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
            case OpCode.OP_FALSE:
                while (script.chunks[i + 1]?.opCodeNum >= 1 &&
                    script.chunks[i + 1]?.opCodeNum <= OpCode.OP_PUSHDATA4) {
                    data = Buffer.concat([data, script.chunks[i + 1].buf!])
                    i++;
                }
                break;
            case 1:
                // console.log(script.chunks[i].toString('hex'))
                if (script.chunks[i].buf![0] != 1) return;
            case OpCode.OP_TRUE:
                type = script.chunks[i + 1]!.buf!.toString('utf8');
                // console.log("Type:", type)
                i++;
                break;
            case OpCode.OP_ENDIF:
                return { type, data };
            default:
                return;
        }
    }

    return { type, data };
}