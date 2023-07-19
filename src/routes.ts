import * as express from "express";
import { Response } from "express";
import createError from "http-errors";
import {
  File,
  OrdFS,
  getBlockByHash,
  getBlockByHeight,
  getLatestBlock,
  getRawTx,
  loadInscription,
  loadPointerFromDNS,
} from "./lib";

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
    try {
      outpoint = await loadPointerFromDNS(req.hostname);
    } catch (e: any) {
      // DNS pointer not found
      res.render("pages/index");
      return;
    }
    try {
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
  });

  app.get("/v1/:network/block/latest", async (req, res, next) => {
    try {
      res.json(await getLatestBlock(req.params.network));
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/block/height/:height", async (req, res, next) => {
    try {
      res.json(
        await getBlockByHeight(
          req.params.network,
          parseInt(req.params.height, 10)
        )
      );
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/block/hash/:hash", async (req, res, next) => {
    try {
      res.json(await getBlockByHash(req.params.network, req.params.hash));
    } catch (e) {
      next(e);
    }
  });

  app.get("/v1/:network/tx/:txid", async (req, res) => {
    res.set("Content-type", "application/octet-stream");
    res.send(await getRawTx(req.params.network, req.params.txid));
  });
  app.get("/:filename", getInscriptionOrDnsFile);
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
    const filename = req.params.filename;
    try {
      let pointer: string;
      let file: File;
      let immutable = true;
      try {
        // check if its an ordfs directory
        file = await loadInscription(filename, req.query.meta);
        if (file.type === "ord-fs/json" && !req.query.raw) {
          req.res?.redirect(`/${filename}/index.html`);
          return;
        }
      } catch (e: any) {
        console.error("Outpoint Error", filename, e.message);
        pointer = await loadPointerFromDNS(req.hostname);
        const dirData = await loadInscription(pointer);
        const dir = JSON.parse(dirData.data!.toString("utf8"));
        if (!dir[filename]) {
          throw new createError.NotFound();
        }
        pointer = dir[filename].slice(6);
        file = await loadInscription(pointer, req.query.meta);
        immutable = false;
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
        throw new createError.NotFound();
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
