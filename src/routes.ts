import * as express from "express";
import { Response } from "express";
import { BadRequest, NotFound } from "http-errors";
import { File, OrdFS } from "./models/models";
import { loadInscription, loadPointerFromDNS } from "./lib";
import { getBlockByHash, getBlockByHeight, getBlockchainInfo, getRawTx } from "./data";

const { ORDFS_DOMAINS, ORDFS_HOST } = process.env;
function sendFile(file: File, res: Response, immutable = true) {
  res.header("Content-Type", file.type || "");
  if (file.meta) {
    res.header('ordfs-meta', JSON.stringify(file.meta))
  }
  if (immutable && !file.meta) {
    res.header("Cache-Control", "public,immutable,max-age=31536000");
  }
  res.status(200).send(file.data);
}

export function RegisterRoutes(app: express.Express) {
  app.get("/", async (req, res) => {
    let outpoint: string;
    if(ORDFS_DOMAINS && req.hostname != ORDFS_HOST) {
      try {
        outpoint = await loadPointerFromDNS(req.hostname);
        const file = await loadInscription(outpoint);
        if (file.type === "ord-fs/json" && !req.query["raw"]) {
          req.res?.redirect("index.html");
          return;
        }
        sendFile(file, res, false);
      } catch (err) {
        // TODO: inscription not found
        res.render("pages/404");
      }
    }
  });

  app.get("/v1/:network/block/latest", async (req, res, next) => {
    try {
      res.json(await getBlockchainInfo());
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/block/height/:height", async (req, res, next) => {
    try {
      res.json(
        await getBlockByHeight(
          parseInt(req.params.height, 10)
        )
      );
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/block/hash/:hash", async (req, res, next) => {
    try {
      res.json(await getBlockByHash(req.params.hash));
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/tx/:txid", async (req, res) => {
    res.set("Content-type", "application/octet-stream");
    res.send(await getRawTx(req.params.txid));
  });
  app.get("/:fileOrPointer", getInscriptionOrDnsFile);
  app.get("/content/:pointer", getInscription);
  app.get("/preview/:b64HtmlData", previewHtmlFromB64Data);
  app.get("/:pointer/:filename", getOrdfsFile);
  app.get("/content/:pointer/:filename", getOrdfsFile);

  async function previewHtmlFromB64Data(req, res, next) {
    try {
      const b64HtmlData = req.params.b64HtmlData;
      const htmlData = Buffer.from(b64HtmlData, "base64").toString("utf8");
      res.render("pages/preview", { htmlData });
    } catch (err) {
      next(err);
    }
  }

  async function getInscriptionOrDnsFile(req, res, next) {
    let pointer = req.params.fileOrPointer!;
    let file: File | undefined;
    let immutable = true;
    try {
      try {
        file = await loadInscription(pointer, req.query.meta);
      } catch (err) {
        if (!(err instanceof BadRequest)) {
          throw err;
        }
        if(ORDFS_DOMAINS && req.hostname != ORDFS_HOST) {
          const filename = pointer;
          pointer = await loadPointerFromDNS(req.hostname);
          const dirData = await loadInscription(pointer);
          const dir = JSON.parse(dirData.data!.toString("utf8"));
          if (!dir[filename]) {
            throw new NotFound();
          }
          pointer = dir[filename].slice(6);
          file = await loadInscription(pointer, req.query.meta);
        }
      }
      if(!file) {
        throw new NotFound();
      }
      sendFile(file, res, immutable);
    } catch (err) {
      next(err);
    }
  }

  async function getInscription(req, res, next) {
    const pointer = req.params.pointer;
    try {
      const file = await loadInscription(pointer, req.query.meta);
      // check if its an ordfs directory
      if (file.type === "ord-fs/json" && !req.query.raw) {
        req.res?.redirect(`/${pointer}/index.html`);
        return;
      }
      sendFile(file, res, true);
    } catch (err) {
      next(err);
    }
  }

  async function getOrdfsFile(req, res, next) {
    try {
      let pointer = req.params.pointer;
      const filename = req.params.filename;
      const dirData = await loadInscription(pointer);
      const dir: OrdFS = JSON.parse(dirData.data!.toString("utf8"));
      if (!dir[filename]) {
        throw new NotFound();
      }
      if (dir[filename].startsWith("ord://")) {
        pointer = dir[filename].slice(6);
      } else {
        pointer = dir[filename];
      }
      const file = await loadInscription(pointer, req.query.meta);
      sendFile(file, res, true);
    } catch (err) {
      next(err);
    }
  }
}
