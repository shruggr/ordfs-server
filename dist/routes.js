"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRoutes = void 0;
const axios_1 = require("axios");
const http_errors_1 = require("http-errors");
const lib_1 = require("./lib");
function sendFile(file, res, immutable = true) {
    res.header("Content-Type", file.type || "");
    if (immutable) {
        res.header("Cache-Control", "public,immutable,max-age=31536000");
    }
    res.status(200).send(file.data);
}
function RegisterRoutes(app) {
    app.get("/", async (req, res, next) => {
        var _a;
        let outpoint;
        try {
            outpoint = await (0, lib_1.loadPointerFromDNS)(req.hostname);
        }
        catch (e) {
            // DNS pointer not found
            res.render("pages/index");
            return;
        }
        try {
            let file = await (0, lib_1.loadInscription)(outpoint);
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
    });
    app.get('/rest/*', async (req, res, next) => {
        try {
            const resp = await axios_1.default.get(`http://${process.env.BITCOIN_HOST}:8332${req.originalUrl}`, {
                responseType: 'stream'
            });
            resp.headers;
            for (let [k, v] of Object.entries(resp.headers)) {
                res.set(k, v);
            }
            resp.data.pipe(res);
        }
        catch (e) {
            let status = 500;
            if (e.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(e.response.data);
                console.log(e.response.status);
                console.log(e.response.headers);
                status = e.response.status;
            }
            else if (e.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(e.request);
            }
            else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', e.message);
            }
            console.log(e.config);
            next(new Error(`${status} ${e.message}`));
        }
        ;
    });
    app.get("/v1/:network/block/latest", async (req, res, next) => {
        try {
            res.json(await (0, lib_1.getLatestBlock)(req.params.network));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/block/height/:height", async (req, res, next) => {
        try {
            res.json(await (0, lib_1.getBlockByHeight)(req.params.network, parseInt(req.params.height, 10)));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/block/hash/:hash", async (req, res, next) => {
        try {
            res.json(await (0, lib_1.getBlockByHash)(req.params.network, req.params.hash));
        }
        catch (e) {
            next(e);
        }
    });
    app.get("/v1/:network/tx/:txid", async (req, res, next) => {
        res.set("Content-type", "application/octet-stream");
        res.send(await (0, lib_1.getRawTx)(req.params.network, req.params.txid));
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
        }
        catch (err) {
            next(err);
        }
    }
    async function loadFileOrOrdfs(req, res, next) {
        var _a;
        const filename = req.params.filename;
        try {
            let pointer;
            let file;
            let immutable = true;
            try {
                // check if its an ordfs directory
                file = await (0, lib_1.loadInscription)(filename);
                if (file.type === "ord-fs/json" && !req.query.raw) {
                    (_a = req.res) === null || _a === void 0 ? void 0 : _a.redirect(`/${filename}/index.html`);
                    return;
                }
            }
            catch (e) {
                console.error("Outpoint Error", filename, e);
                pointer = await (0, lib_1.loadPointerFromDNS)(req.hostname);
                const dirData = await (0, lib_1.loadInscription)(pointer);
                const dir = JSON.parse(dirData.data.toString("utf8"));
                if (!dir[filename]) {
                    throw new http_errors_1.NotFound();
                }
                pointer = dir[filename].slice(6);
                file = await (0, lib_1.loadInscription)(pointer);
                immutable = false;
            }
            sendFile(file, res, immutable);
        }
        catch (err) {
            next(err);
        }
    }
    async function loadFile(req, res, next) {
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
            const file = await (0, lib_1.loadInscription)(pointer);
            sendFile(file, res, true);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RegisterRoutes = RegisterRoutes;
//# sourceMappingURL=routes.js.map