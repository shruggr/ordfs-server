"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const path = require("path");
const http_errors_1 = require("http-errors");
const routes_1 = require("./routes");
dotenv.config();
const server = express();
async function main() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
server.set("trust proxy", true);
server.use(cors({ origin: true }));
server.set("views", path.resolve(__dirname, "../views"));
server.set("view engine", "ejs");
const pubPath = path.resolve(__dirname, "../public");
console.log("pubPath", pubPath);
server.use("/public", express.static(pubPath));
server.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});
(0, routes_1.RegisterRoutes)(server);
server.use((req, res, next) => {
    console.log(req.path);
    next(new http_errors_1.NotFound("Not Found"));
});
const errorMiddleware = ((err, req, res) => {
    console.error(req.path, err.status || 500, err.message);
    res.status(err.status || 500).json({ message: err.message });
});
server.use(errorMiddleware);
main().catch(console.error);
//# sourceMappingURL=server.js.map