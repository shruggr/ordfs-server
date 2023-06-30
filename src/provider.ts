import * as Client from "bitcoin-core";
import { JungleBusClient } from "@gorillapool/js-junglebus";

export interface ITxProvider {
    network: string;
    getRawTx: (string) => Promise<Buffer>
}

export class RpcProvider implements ITxProvider {
    private client: Client;

    constructor(public network: string, host: string, port: string, username: string, password: string) {
        this.client = new Client({
            host,
            port,
            username,
            password,
        })
    }

    async getRawTx(txid: string): Promise<Buffer> {
        return  this.client.getTransactionByHash(txid, {
            extension: 'bin'
        })
    }
}
export class JungleBusProvider implements ITxProvider {
    public network = 'bsv';

    async getRawTx(txid: string): Promise<Buffer> {
        const jb = new JungleBusClient('https://junglebus.gorillapool.io');
        const txnData = await jb.GetTransaction(txid);
        return Buffer.from(txnData!.transaction, 'base64');
    }
}