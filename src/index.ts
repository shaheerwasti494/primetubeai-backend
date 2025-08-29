// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes.js"; // <-- IMPORTANT

const app = express();
app.use(cors());
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => res.json({ ok: true }));
app.use(routes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
