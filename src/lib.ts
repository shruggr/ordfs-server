import { JungleBusClient } from "@gorillapool/js-junglebus";
import { OpCode, Script, Tx } from "@ts-bitcoin/core";;
import * as dns from 'dns/promises'
import { NotFound } from 'http-errors';
import { Outpoint } from "./outpoint";

const jb = new JungleBusClient('https://junglebus.gorillapool.io');

export async function loadOutpointFromDNS(hostname: string): Promise<Outpoint> {
    const TXTs = await dns.resolveTxt(hostname);
    const prefix = "ordfs=";
    let origin = '';
    for (let TXT of TXTs) {
        for (let elem of TXT) {
            if (!elem.startsWith(prefix)) continue;
            console.log("Elem:", elem)
            origin = elem.slice(prefix.length)
            console.log("Origin:", origin)
        }
    }

    if (!origin) {
        throw new NotFound()
    }
    return Outpoint.fromString(origin)
}

export async function loadInscription(outpoint: Outpoint): Promise<File> {
    const txnData = await jb.GetTransaction(outpoint.txid.toString('hex'));
    const tx = Tx.fromBuffer(Buffer.from(txnData?.transaction || '', 'base64'));
    return parseOutputScript(tx.txOuts[outpoint.vout].script);
}

export interface File {
    type: string;
    data: Buffer;
}

export interface OrdFS {
    [filename: string]: string;
}

export async function parseOutputScript(script: Script): Promise<File> {
    let opFalse = 0;
    let opIf = 0;
    let opORD = 0;
    const lock = new Script();
    for(let [i, chunk] of script.chunks.entries()) {
        if(chunk.opCodeNum === OpCode.OP_FALSE) {
            opFalse = i;
        }
        if(chunk.opCodeNum === OpCode.OP_IF) {
            opIf = i;
        }
        if(chunk.buf?.equals(Buffer.from('ord', 'utf8'))) {
            if (opFalse === i - 2 && opIf === i - 1) {
                opORD = i;
                lock.chunks = script.chunks.slice(0, i - 2);
                break;
            }
        }
        lock.chunks.push(chunk);
    }

    let type = 'application/octet-stream';
    let data: Buffer | undefined;

    for(let i = opORD + 1; i < script.chunks.length; i+=2) {
        if (script.chunks[i].buf) break;
        switch(script.chunks[i].opCodeNum) {
            case OpCode.OP_0:
                data = script.chunks[i+1]!.buf!;
                break;
            case OpCode.OP_1:
                type = script.chunks[i+1]!.buf!.toString('utf8');
                break;
            case OpCode.OP_ENDIF:
                break;
        }
    }

    if (!data) {
        throw new NotFound("Inscription not found");
    }
    return { type, data };
}