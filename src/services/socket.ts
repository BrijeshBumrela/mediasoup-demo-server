import { Server, Socket } from "socket.io";
import { types as msTypes } from "mediasoup";
import Meet from "../models/Meet";
import User from "../models/User";
import meetingUtils from "../utils/helpers";
import { createWebRTCTransport, createConsumer } from "./mediasoup";
import config from "../config/config";

export default async (
    socket: Socket,
    meetings: Meet[],
    io: Server,
    workers: msTypes.Worker[]
) => {
    const { findUserAndMeeting, findMeeting, findUser } = meetingUtils(
        meetings
    );
    const queryParams = socket.handshake.query;

    const name = queryParams["name"] as string;
    const meetingId = queryParams["meetingId"] as string;

    const selectedWorker = workers[Math.floor(Math.random() * workers.length)];
    const router = await selectedWorker.createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
    });

    const user = new User(name, socket.id);
    let meeting = findMeeting(meetingId);

    if (!meeting) {
        meeting = new Meet(meetingId, router);
        meetings.push(meeting);
    }

    console.log(`${name}-${socket.id} joined ${meetingId}`);

    meeting.addUser(user);
    socket.join(meetingId);

    socket.on("getRouterCapabilities", (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        callback(meeting.router.rtpCapabilities);
    });

    socket.on("createProducerTransport", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const { params, transport } = await createWebRTCTransport(
            meeting.router
        );
        user.producerTransport = transport;
        callback(params);
    });

    socket.on("connectProducerTransport", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const transport = user.producerTransport;

        if (!transport) throw new Error("Transport not found");

        try {
            await transport.connect({ dtlsParameters: data.dtlsParameters });
        } catch (e) {
            console.error(e);
        } finally {
            callback();
        }
    });

    socket.on("createConsumerTransport", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const { params, transport } = await createWebRTCTransport(
            meeting.router
        );

        user.consumerTransport = transport;
        callback(params);
    });

    socket.on("connectConsumerTransport", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const transport = user.consumerTransport;
        if (!transport) throw new Error("Transport not found");

        try {
            await transport.connect({ dtlsParameters: data.dtlsParameters });
        } catch (e) {
            console.error(e);
        } finally {
            callback();
        }
    });

    socket.on("produce", async (data, callback) => {
        const {
            kind,
            rtpParameters,
        }: {
            kind: msTypes.MediaKind;
            rtpParameters: msTypes.RtpParameters;
        } = data;
        const [user, meeting] = findUserAndMeeting(socket.id);

        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        if (!user.producerTransport)
            throw new Error("transport not found while producing");

        user.producing = true;

        try {
            const producer = await user.producerTransport.produce({
                kind,
                rtpParameters,
            });

            if (kind === "audio") {
                user.audioProducer = producer;
            } else if (kind === "video") {
                user.videoProducer = producer;
            }

            callback({ id: producer.id });

            socket.to(meeting.id).emit("newProducer", {
                socketId: socket.id,
                kind,
            });
        } catch (e) {
            callback({ error: e.message });
        }
    });

    socket.on("consume", async (data, callback) => {
        const {
            rtpCapabilities,
            userId,
            kind,
        }: {
            rtpCapabilities: msTypes.RtpCapabilities;
            userId: string;
            kind: msTypes.MediaKind;
        } = data;
        const [user, meeting] = findUserAndMeeting(socket.id);

        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const producerUser = findUserAndMeeting(userId)[0];

        if (!user.consumerTransport)
            throw new Error("transport not found while consuming");

        if (!producerUser)
            throw new Error("Producer for this consumer does not exist");

        let producer;

        if (kind === "audio") {
            producer = producerUser.audioProducer;
        } else if (kind === "video") {
            producer = producerUser.videoProducer;
        }

        const router = meeting.router;

        if (!producer) throw new Error("Producer peer is not producing");

        const result = await createConsumer(
            producer,
            rtpCapabilities,
            user.consumerTransport,
            router
        );
        if (!result) throw new Error("Some error occured");

        const { consumer, meta } = result;

        consumer.on("producerpause", async () => {
            await consumer.pause();
            socket.to(user.id).emit("consumerPause", {
                producerId: consumer.producerId,
                kind: consumer.kind,
            });
        });

        consumer.on("producerresume", async () => {
            await consumer.resume();
            socket.to(user.id).emit("consumerResume", {
                producerId: consumer.producerId,
                kind: consumer.kind,
            });
        });

        user.consumers.push(consumer);

        callback(meta);
    });

    socket.on("getExistingAudioProducers", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);

        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const filteredUsers = meeting.users
            .filter((each) => each.id !== socket.id && each.audioProducer)
            .map((each) => ({ producerId: each.id }));

        callback(filteredUsers);
    });

    socket.on("getExistingVideoProducers", async (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);

        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const filteredUsers = meeting.users
            .filter((each) => each.id !== socket.id && each.videoProducer)
            .map((each) => ({ producerId: each.id }));

        callback(filteredUsers);
    });

    socket.on("resume", async (data, callback) => {
        const {
            consumerId,
            socketId,
            kind,
        }: {
            consumerId: string;
            socketId: string;
            kind: msTypes.MediaKind;
        } = data;

        const [user, meeting] = findUserAndMeeting(socket.id);

        if (!user) throw new Error("User not found");
        if (!meeting) throw new Error("Meeting not found");
        if (!meeting.router) throw new Error("User is not connected");

        const producerUser = findUserAndMeeting(socketId)[0];

        if (kind === "audio") {
            if (!producerUser || !producerUser.audioProducer)
                throw new Error("Producer not found");
        } else if (kind === "video") {
            if (!producerUser || !producerUser.videoProducer)
                throw new Error("Producer not found");
        }

        const consumer = user.getConsumer(consumerId);
        if (!consumer) throw new Error("Consumer object not found");
        await consumer.resume();

        callback();
    });

    socket.on("disconnect", () => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (meeting instanceof Meet && user instanceof User) {
            const user = findUser(socket.id);
            if (!user) throw new Error("User not found");
            meeting.removeUser(user);
            io.in(meeting.id).emit("UserLeft", { id: user.id });
            console.log(`${name}-${socket.id} left ${meetingId}`);
        }
    });

    socket.on("getusers", (data, callback) => {
        const [user, meeting] = findUserAndMeeting(socket.id);
        if (!meeting || !user) throw new Error("Meeting not found");
        const prevUsers = meeting.users.filter(
            (friend) => friend.id !== user.id
        );

        callback(prevUsers);
    });

    io.to(meetingId).emit("UserAdded", { name: user.name, id: user.id });
};
