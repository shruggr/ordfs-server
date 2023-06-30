"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRoutes = void 0;
const http_errors_1 = require("http-errors");
const lib_1 = require("./lib");
const outpoint_1 = require("./outpoint");
function sendFile(file, res) {
    res.header('Content-Type', file.type || '');
    res.header('Cache-Control', 'public,immutable,max-age=31536000');
    res.status(200).send(file.data);
}
function RegisterRoutes(app) {
    app.get("/", async (req, res, next) => {
        var _a;
        try {
            const outpoint = await (0, lib_1.loadOutpointFromDNS)(req.hostname);
            let file = await (0, lib_1.loadInscription)(outpoint);
            if (file.type === 'ord-fs/json' && !req.query['raw']) {
                (_a = req.res) === null || _a === void 0 ? void 0 : _a.redirect('index.html');
                return;
            }
            sendFile(file, res);
        }
        catch (err) {
            next(err);
        }
    });
    app.get("/:filename", async (req, res, next) => {
        var _a;
        const filename = req.params.filename;
        try {
            let outpoint;
            let file;
            try {
                console.log('filename', filename);
                outpoint = outpoint_1.Outpoint.fromString(filename);
                file = await (0, lib_1.loadInscription)(outpoint);
                if (file.type === 'ord-fs/json') {
                    (_a = req.res) === null || _a === void 0 ? void 0 : _a.redirect(`${outpoint.toString()}/index.html`);
                    return;
                }
            }
            catch (e) {
                console.error('Outpoint Error', filename, e);
                outpoint = await (0, lib_1.loadOutpointFromDNS)(req.hostname);
                const dirData = await (0, lib_1.loadInscription)(outpoint);
                const dir = JSON.parse(dirData.data.toString('utf8'));
                if (!dir[filename]) {
                    throw new http_errors_1.NotFound();
                }
                outpoint = outpoint_1.Outpoint.fromString(dir[filename].slice(6));
                file = await (0, lib_1.loadInscription)(outpoint);
            }
            sendFile(file, res);
        }
        catch (err) {
            next(err);
        }
    });
    app.get("/:outpoint/:filename", async (req, res, next) => {
        try {
            let outpoint = outpoint_1.Outpoint.fromString(req.params.outpoint);
            const filename = req.params.filename;
            const dirData = await (0, lib_1.loadInscription)(outpoint);
            const dir = JSON.parse(dirData.data.toString('utf8'));
            if (!dir[filename]) {
                throw new http_errors_1.NotFound();
            }
            if (dir[filename].startsWith('ord://')) {
                outpoint = outpoint_1.Outpoint.fromString(dir[filename].slice(6));
            }
            else {
                outpoint = outpoint_1.Outpoint.fromString(dir[filename]);
            }
            const file = await (0, lib_1.loadInscription)(outpoint);
            sendFile(file, res);
        }
        catch (err) {
            next(err);
        }
    });
}
exports.RegisterRoutes = RegisterRoutes;
//# sourceMappingURL=routes.js.map