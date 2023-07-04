import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { HttpError, NotFound } from "http-errors";
import { RegisterRoutes } from "./routes";
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

server.set("view engine", "ejs");
server.use("/public", express.static("public"));

server.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

RegisterRoutes(server);

server.use((req, res, next) => {
  console.log(req.path);
  next(new NotFound("Not Found"));
});

const errorMiddleware = ((
  err: TypeError | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(req.path, (err as HttpError).status || 500, err.message);
  res.status((err as HttpError).status || 500).json({ message: err.message });
}) as ErrorRequestHandler;

server.use(errorMiddleware);
main().catch(console.error);
