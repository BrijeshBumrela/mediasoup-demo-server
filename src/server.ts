import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import { types as msTypes } from "mediasoup";
import socketService from "./services/socket";
import Meet from "./models/Meet";
import { createMsWorkers } from "./services/mediasoup";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(bodyParser.json());
app.use(cors());

server.listen(8000);


// List of meetings that are currently going on
let meetings: Meet[] = [];

const init = async () => {
    // List of workers used by mediasoup to create the routers(rooms)
    const workers: msTypes.Worker[] = [];
    await createMsWorkers(workers);
    io.on("connection", (socket) => socketService(socket, meetings, io, workers));
}

init();





