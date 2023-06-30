import * as express from 'express';
import { Response } from 'express';
import { NotFound } from 'http-errors';
import { File, OrdFS, loadInscription, loadOutpointFromDNS } from './lib';
import { Outpoint } from './outpoint';

function sendFile(file: File, res: Response) {
    res.header('Content-Type', file.type || '');
    res.header('Cache-Control', 'public,immutable,max-age=31536000')
    res.status(200).send(file.data);
}

export function RegisterRoutes(app: express.Express) {
    app.get("/", async (req, res, next) => {
        try {
            const outpoint = await loadOutpointFromDNS(req.hostname);
            let file = await loadInscription(outpoint)
            if (file.type === 'ord-fs/json' && !req.query['raw']) {
                req.res?.redirect('index.html');
                return
            }
            sendFile(file, res);
        } catch (err) {
            next(err);
        }
    });

    app.get("/:filename", async (req, res, next) => {
        const filename = req.params.filename;
        try {
            let outpoint: Outpoint;
            let file: File;
            try {
                console.log('filename', filename)
                outpoint = Outpoint.fromString(filename)
                file = await loadInscription(outpoint)
                if (file.type === 'ord-fs/json') {
                    req.res?.redirect(`${outpoint.toString()}/index.html`);
                    return
                }
            } catch (e: any) {
                console.error('Outpoint Error', filename, e);
                outpoint = await loadOutpointFromDNS(req.hostname);
                const dirData = await loadInscription(outpoint);
                const dir = JSON.parse(dirData.data!.toString('utf8'));
                if (!dir[filename]) {
                    throw new NotFound()
                }
                outpoint = Outpoint.fromString((dir[filename] as string).slice(6))
                file = await loadInscription(outpoint)
            }
            sendFile(file, res);
        } catch (err) {
            next(err);
        }
    });

    app.get("/:outpoint/:filename", async (req, res, next) => {
        try {
            let outpoint = Outpoint.fromString(req.params.outpoint);
            const filename = req.params.filename;
            const dirData = await loadInscription(outpoint);
            const dir: OrdFS = JSON.parse(dirData.data!.toString('utf8'));
            if (!dir[filename]) {
                throw new NotFound()
            }
            if (dir[filename].startsWith('ord://')) {
                outpoint = Outpoint.fromString(dir[filename].slice(6))
            } else {
                outpoint = Outpoint.fromString(dir[filename]);
            }
            const file = await loadInscription(outpoint)
            sendFile(file, res);
        } catch (err) {
            next(err);
        }
    });
}