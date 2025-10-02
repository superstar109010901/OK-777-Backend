import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import seamless from './api/seamless';
import cors from 'cors';
import * as middlewares from './middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { startObserverTron } from "./blockchain/tron";
import { watchEth } from "./blockchain/ether";
import { startWatchSolana } from "./blockchain/solana";
import { startGames } from "./games/games";
import { Prisma } from "./generated/prisma";
require('dotenv').config();

Prisma.Decimal.prototype.toJSON = function () {
  return this.toNumber()
}

const app = express();

// app.use(morgan('dev'));
// app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))


// ----------------- Global CORS + CORP -----------------
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS"); // Allowed methods
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Allowed headers
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // CORP
  next();
});
// Serve uploads with proper headers
// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "uploads"), {
//     setHeaders: (res, filePath) => {
//       console.log(filePath)
//       res.setHeader("Access-Control-Allow-Origin", "*"); // CORS
//       res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // CORP
//       res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//       res.setHeader("Pragma", "no-cache");
//       res.setHeader("Expires", "0");
//     },
//   })
// );


const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
  });
});

app.use('/api/v1', api);
app.use('/v1/api/seamless', seamless);
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

startObserverTron();
watchEth();
startWatchSolana();
startGames();

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});


export default app;
