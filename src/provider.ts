import fetch from "cross-fetch";
import createError from "http-errors";
import { Redis } from "ioredis";

let redis: Redis;
if (process.env.REDIS_HOST) {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : 6379;
  console.log("Connecting to redis:", host, port);
  redis = new Redis(port, host);
}

export interface ITxProvider {
  network: string;
  getRawTx: (string) => Promise<Buffer>;
  getBlockchainInfo: () => Promise<{ height: number; hash: string }>;
  getBlockByHeight: (number) => Promise<{ height: number; hash: string }>;
  getBlockByHash: (string) => Promise<{ height: number; hash: string }>;
}
export class JungleBusProvider implements ITxProvider {
  public network = "bsv";

  async getRawTx(txid: string): Promise<Buffer> {
    let rawtx = await redis?.getBuffer(`rawtx:${txid}`);
    if (!rawtx) {
      const resp = await fetch(`https://junglebus.gorillapool.io/v1/transaction/get/${txid}/bin`);
      if (!resp.ok) {
        throw createError(resp.status, resp.statusText);
      }
      rawtx = Buffer.from(await resp.arrayBuffer());
      redis?.set(`rawtx:${txid}`, rawtx);
    }
    return rawtx;
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

  async getBlockByHeight(
    height: number
  ): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      `https://api.whatsonchain.com/v1/bsv/main/block/height/${height}`
    );
    const info = await resp.json();
    return { height, hash: info.hash };
  }

  async getBlockByHash(
    hash: string
  ): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      `https://api.whatsonchain.com/v1/bsv/main/block/hash/${hash}`
    );
    const info = await resp.json();

    return {
      height: info.height,
      hash,
    };
  }
}
