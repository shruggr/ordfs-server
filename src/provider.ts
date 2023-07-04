import { JungleBusClient } from "@gorillapool/js-junglebus";
import * as Client from "bitcoin-core";
import "cross-fetch/polyfill";
import createError from "http-errors";

export interface ITxProvider {
  network: string;
  getRawTx: (string) => Promise<Buffer>;
  getBlockchainInfo: () => Promise<{ height: number; hash: string }>;
}

export class RpcProvider implements ITxProvider {
  private client: Client;

  constructor(
    public network: string,
    host: string,
    port: string,
    username: string,
    password: string
  ) {
    this.client = new Client({
      host,
      port,
      username,
      password,
    });
  }

  async getRawTx(txid: string): Promise<Buffer> {
    return this.client.getTransactionByHash(txid, {
      extension: "bin",
    });
  }

  async getBlockchainInfo(): Promise<{ height: number; hash: string }> {
    const info = await this.client.getBlockchainInfo();
    return {
      height: info.blocks,
      hash: info.bestblockhash,
    };
  }
}

export class JungleBusProvider implements ITxProvider {
  public network = "bsv";

  async getRawTx(txid: string): Promise<Buffer> {
    const jb = new JungleBusClient("https://junglebus.gorillapool.io");
    const txnData = await jb.GetTransaction(txid);
    return Buffer.from(txnData!.transaction, "base64");
  }

  async getBlockchainInfo(): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      "https://api.whatsonchain.com/v1/bsv/main/block/headers"
    );
    if (!resp.ok) {
      throw createError(resp.status, resp.statusText);
    }
    const info = await resp.json();
    return {
      height: info[0].height,
      hash: info[0].hash,
    };
  }
}

export class BtcProvider implements ITxProvider {
  public network = "btc";

  async getRawTx(txid: string): Promise<Buffer> {
    const resp = await fetch(
      `https://ordinals.shruggr.cloud/v1/btc/tx/${txid}`
    );
    if (!resp.ok) {
      throw createError(resp.status, resp.statusText);
    }
    return Buffer.from(await resp.arrayBuffer());
  }

  async getBlockchainInfo(): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      "https://ordinals.shruggr.cloud/v1/btc/block/latest"
    );
    if (!resp.ok) {
      throw createError(resp.status, resp.statusText);
    }
    return resp.json();
  }
}
