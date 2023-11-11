"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRoutes = void 0;
const http_errors_1 = require("http-errors");
const lib_1 = require("./lib");
const data_1 = require("./data");
const { ORDFS_DOMAINS, ORDFS_HOST } = process.env;
function sendFile(file, res, immutable = true) {
    res.header("Content-Type", file.type || "");
    if (file.meta) {
        res.header('ordfs-meta', JSON.stringify(file.meta));
    }
    if (immutable && !file.meta) {
        res.header("Cache-Control", "public,immutable,max-age=31536000");
    }
    res.status(200).send(file.data);
}
function RegisterRoutes(app) {
    app.get("/", async (req, res) => {
        var _a;
        let outpoint;
        if (ORDFS_DOMAINS && req.hostname != ORDFS_HOST) {
            try {
                outpoint = await (0, lib_1.loadPointerFromDNS)(req.hostname);
                const file = await (0, lib_1.loadInscription)(outpoint);
                if (file.type === "ord-fs/json" && !req.query["raw"]) {
                    (_a = req.res) === null || _a === void 0 ? void 0 : _a.redirect("index.html");
                    return;
                }
                sendFile(file, res, false);
            }
            catch (err) {
                // TODO: inscription not found
                res.render("pages/404");
            }
        }
        res.render("pages/index");
    });
    app.get("/v1/:network/block/latest", async (req, res, next) => {
        try {
            res.json(await (0, data_1.getBlockchainInfo)(req.params.network));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/block/height/:height", async (req, res, next) => {
        try {
            res.json(await (0, data_1.getBlockByHeight)(req.params.network, parseInt(req.params.height, 10)));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/block/hash/:hash", async (req, res, next) => {
        try {
            res.json(await (0, data_1.getBlockByHash)(req.params.network, req.params.hash));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/tx/:txid", async (req, res) => {
        res.set("Content-type", "application/octet-stream");
        res.send(await (0, data_1.getRawTx)(req.params.txid));
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
        }
        catch (err) {
            next(err);
        }
    }
    async function getInscriptionOrDnsFile(req, res, next) {
        let pointer = req.params.fileOrPointer;
        let file;
        let immutable = true;
        try {
            try {
                file = await (0, lib_1.loadInscription)(pointer, req.query.meta, true);
            }
            catch (err) {
                if (!(err instanceof http_errors_1.BadRequest)) {
                    throw err;
                }
                if (ORDFS_DOMAINS && req.hostname != ORDFS_HOST) {
                    const filename = pointer;
                    pointer = await (0, lib_1.loadPointerFromDNS)(req.hostname);
                    const dirData = await (0, lib_1.loadInscription)(pointer);
                    const dir = JSON.parse(dirData.data.toString("utf8"));
                    if (!dir[filename]) {
                        throw new http_errors_1.NotFound();
                    }
                    pointer = dir[filename].slice(6);
                    file = await (0, lib_1.loadInscription)(pointer, req.query.meta);
                }
            }
            if (!file) {
                throw new http_errors_1.NotFound();
            }
            sendFile(file, res, immutable);
        }
        catch (err) {
            next(err);
        }
    }
    async function getInscription(req, res, next) {
        var _a;
        const pointer = req.params.pointer;
        try {
            const file = await (0, lib_1.loadInscription)(pointer, req.query.meta);
            // check if its an ordfs directory
            if (file.type === "ord-fs/json" && !req.query.raw) {
                (_a = req.res) === null || _a === void 0 ? void 0 : _a.redirect(`/${pointer}/index.html`);
                return;
            }
            sendFile(file, res, true);
        }
        catch (err) {
            next(err);
        }
    }
    async function getOrdfsFile(req, res, next) {
        try {
            let pointer = req.params.pointer;
            const filename = req.params.filename;
            const dirData = await (0, lib_1.loadInscription)(pointer);
            const dir = JSON.parse(dirData.data.toString("utf8"));
            if (!dir[filename]) {
                throw new http_errors_1.NotFound();
            }
            if (dir[filename].startsWith("ord://")) {
                pointer = dir[filename].slice(6);
            }
            else {
                pointer = dir[filename];
            }
            const file = await (0, lib_1.loadInscription)(pointer, req.query.meta);
            sendFile(file, res, true);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RegisterRoutes = RegisterRoutes;
//# sourceMappingURL=routes.js.map