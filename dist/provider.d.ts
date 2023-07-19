/// <reference types="node" />
export interface ITxProvider {
    network: string;
    getRawTx: (string: any) => Promise<Buffer>;
    getBlockchainInfo: () => Promise<{
        height: number;
        hash: string;
    }>;
    getBlockByHeight: (number: any) => Promise<{
        height: number;
        hash: string;
    }>;
    getBlockByHash: (string: any) => Promise<{
        height: number;
        hash: string;
    }>;
}
export declare class JungleBusProvider implements ITxProvider {
    network: string;
    getRawTx(txid: string): Promise<Buffer>;
    getBlockchainInfo(): Promise<{
        height: number;
        hash: string;
    }>;
    getBlockByHeight(height: number): Promise<{
        height: number;
        hash: string;
    }>;
    getBlockByHash(hash: string): Promise<{
        height: number;
        hash: string;
    }>;
}
