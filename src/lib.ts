import * as dns from "dns/promises";
import fetch from "cross-fetch";
import { BadRequest, NotFound } from "http-errors";
import * as createError from "http-errors";

import { File } from "./models/models";
import { getBlockByHeight, loadFileByOutpoint, loadFileByTxid } from "./data";
import { Outpoint } from "./models/outpoint";

export async function loadPointerFromDNS(hostname: string): Promise<string> {
  const lookupDomain = `_ordfs.${hostname}`;
  const TXTs = await dns.resolveTxt(lookupDomain);
  const prefix = "ordfs=";
  let pointer = "";
  console.log("Lookup Up:", lookupDomain);
  for (const TXT of TXTs) {
    for (const elem of TXT) {
      if (!elem.startsWith(prefix)) continue;
      console.log("Elem:", elem);
      pointer = elem.slice(prefix.length);
      console.log("Origin:", pointer);
      return pointer
    }
  }
  throw new NotFound();
}

export async function loadInscription(pointer: string, metadata = false): Promise<File> {
  console.log("loadInscription", pointer);
  let file: File | undefined;

  if (pointer.match(/^[0-9a-fA-F]{64}$/)) {
    file = await loadFileByTxid(pointer);
  } else if (pointer.match(/^[0-9a-fA-F]{64}_\d+$/)) {
    file = await loadFileByOutpoint(Outpoint.fromString(pointer))
    if (file && metadata) {
      try {
        const url =`https://v3.ordinals.gorillapool.io/api/txos/${pointer}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          throw createError(resp.status, resp.statusText);
        }
        const data = await resp.json();
        const { hash } = await getBlockByHeight(data!.height);

        file.meta = {
          ...data,
          hash
        };
      } catch {};
    }
  } else throw new BadRequest("Invalid Pointer");

  if (!file) throw new NotFound();
  return file;
}
export { File };

