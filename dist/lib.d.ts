/// <reference types="node" />
import { Script } from "@ts-bitcoin/core";
export declare function getLatestBlock(network: string): Promise<{
    height: number;
    hash: string;
}>;
export declare function getBlockByHeight(network: string, height: number): Promise<{
    height: number;
    hash: string;
}>;
export declare function getBlockByHash(network: string, hash: string): Promise<{
    height: number;
    hash: string;
}>;
export declare function getRawTx(network: string, txid: string): Promise<Buffer | undefined>;
export declare function loadPointerFromDNS(hostname: string): Promise<string>;
export declare function loadInscription(pointer: string, metadata?: boolean): Promise<File>;
export interface Meta {
    height?: number;
    hash?: string;
    txid: string;
    v: number;
    MAP?: {
        [key: string]: any;
    };
}
export interface File {
    type: string;
    data: Buffer;
    meta?: Meta;
}
export interface OrdFS {
    [filename: string]: string;
}
export declare function parseScript(script: Script): File | undefined;
