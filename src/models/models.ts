export interface Meta {
    height?: number;
    hash?: string;
    txid: string;
    v: number;
    MAP?: {[key:string]:any}
  }
  
  export interface File {
    type?: string;
    data?: Buffer;
    meta?: Meta;
  }
  
  export interface OrdFS {
    [filename: string]: string;
  }
  