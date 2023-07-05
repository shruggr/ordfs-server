import * as express from "express";
import { Response } from "express";
import { NotFound } from "http-errors";
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
  if (immutable) {
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
  app.get("/:filename", loadFileOrOrdfs);
  app.get("/content/:filename", loadFileOrOrdfs);
  app.get("/preview/:b64HtmlData", previewHtmlFromB64Data);
  app.get("/:pointer/:filename", loadFile);
  app.get("/content/:pointer/:filename", loadFile);

  async function previewHtmlFromB64Data(req, res, next) {
    try {
      const b64HtmlData = req.params.b64HtmlData;
      const htmlData = Buffer.from(b64HtmlData, "base64").toString("utf8");
      res.render("pages/preview", { htmlData });
    } catch (err) {
      next(err);
    }
  }

  async function loadFileOrOrdfs(req, res, next) {
    const filename = req.params.filename;
    try {
      let pointer: string;
      let file: File;
      let immutable = true;
      try {
        // check if its an ordfs directory
        file = await loadInscription(filename);
        if (file.type === "ord-fs/json" && !req.query.raw) {
          req.res?.redirect(`/${filename}/index.html`);
          return;
        }
      } catch (e: any) {
        console.error("Outpoint Error", filename, e);
        pointer = await loadPointerFromDNS(req.hostname);
        const dirData = await loadInscription(pointer);
        const dir = JSON.parse(dirData.data!.toString("utf8"));
        if (!dir[filename]) {
          throw new NotFound();
        }
        pointer = dir[filename].slice(6);
        file = await loadInscription(pointer);
        immutable = false;
      }
      sendFile(file, res, immutable);
    } catch (err) {
      next(err);
    }
  }

  async function loadFile(req, res, next) {
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
      const file = await loadInscription(pointer);
      sendFile(file, res, true);
    } catch (err) {
      next(err);
    }
  }
}
