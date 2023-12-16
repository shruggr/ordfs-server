import * as Client from "bitcoin-core";
import "cross-fetch/polyfill";
import * as createError from "http-errors";
import { NotFound } from "http-errors";
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
  getRawTx: (rawtx: string) => Promise<Buffer>;
  getBlockchainInfo: () => Promise<{ height: number; hash: string }>;
  getBlockByHeight: (
    height: number
  ) => Promise<{ height: number; hash: string }>;
  getBlockByHash: (hash: string) => Promise<{ height: number; hash: string }>;
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
    let rawtx = await redis?.getBuffer(txid);
    if (!rawtx) {
      rawtx = await this.client.getTransactionByHash(txid, {
        extension: "bin",
      });
      if (!rawtx) {
        throw new NotFound();
      }
      redis?.set(txid, rawtx);
    }
    return rawtx;
  }

  async getBlockchainInfo(): Promise<{ height: number; hash: string }> {
    const info = await this.client.getBlockchainInfo();
    return {
      height: info.blocks,
      hash: info.bestblockhash,
    };
  }

  async getBlockByHeight(
    height: number
  ): Promise<{ height: number; hash: string }> {
    const hash = await this.client.getBlockHash(height);
    return { height, hash };
  }

  async getBlockByHash(
    hash: string
  ): Promise<{ height: number; hash: string }> {
    const info = await this.client.getBlockHeader(hash);
    return {
      height: info.height,
      hash,
    };
  }
}

export class ProxyProvider implements ITxProvider {
  public network = "bsv";

  async getRawTx(txid: string): Promise<Buffer> {
    let rawtx = await redis?.getBuffer(txid);
    if (!rawtx) {
      const resp = await fetch(
        `https://junglebus.gorillapool.io/v1/transaction/get/${txid}/bin`
      );
      if (!resp.ok) {
        throw createError(resp.status, resp.statusText);
      }
      rawtx = Buffer.from(await resp.arrayBuffer());
      redis?.set(txid, rawtx);
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

export class BtcProvider implements ITxProvider {
  public network = "btc";

  async getRawTx(txid: string): Promise<Buffer> {
    let rawtx = await redis?.getBuffer(txid);
    if (!rawtx) {
      // TODO: Make this configuration based
      const resp = await fetch(
        `https://ordfs.gorillapool.io/v1/btc/tx/${txid}`
      );
      if (!resp.ok) {
        throw createError(resp.status, resp.statusText);
      }
      rawtx = Buffer.from(await resp.arrayBuffer());
      redis?.set(txid, rawtx);
    }
    return rawtx;
  }

  async getBlockchainInfo(): Promise<{ height: number; hash: string }> {
    // TODO: Make this configuration based
    const resp = await fetch(
      "https://ordfs.gorillapool.io/v1/btc/block/latest"
    );
    if (!resp.ok) {
      throw createError(resp.status, resp.statusText);
    }

    return resp.json();
  }

  async getBlockByHeight(
    height: number
  ): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      `https://ordfs.gorillapool.io/v1/btc/block/height/${height}`
    );
    const info = await resp.json();
    return { height, hash: info.hash };
  }

  async getBlockByHash(
    hash: string
  ): Promise<{ height: number; hash: string }> {
    const resp = await fetch(
      `https://ordfs.gorillapool.io/v1/btc/block/hash/${hash}`
    );
    const info = await resp.json();

    return {
      height: info.height,
      hash,
    };
  }
}
