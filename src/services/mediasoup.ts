import { types as msTypes } from "mediasoup";
import * as mediasoup from "mediasoup";
import os from "os";
import config from "../config/config";

const createMsWorkers = async (workers: msTypes.Worker[]) => {
    for (let i = 0; i < os.cpus().length; i++) {
        const worker = await mediasoup.createWorker({
            logLevel: "debug",
            rtcMinPort: 10000,
            rtcMaxPort: 20100,
        });
        workers.push(worker);
    }
};

const createWebRTCTransport = async (router: msTypes.Router) => {
    const {
        maxIncomingBitrate,
    } = config.mediasoup.webRtcTransport;

    const transport = await router.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
    });

    if (maxIncomingBitrate) {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    }

    const { iceParameters, iceCandidates, dtlsParameters } = transport;

    return {
        params: {
            id: transport.id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
        },
        transport,
    };
};

const createConsumer = async (
    producer: msTypes.Producer,
    rtpCapabilities: msTypes.RtpCapabilities,
    transport: msTypes.Transport,
    router: msTypes.Router
) => {
    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        console.error("router can not consume");
        return;
    }

    try {
        const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: true,
        });

        if (consumer.type === "simulcast") {
            await consumer.setPreferredLayers({
                spatialLayer: 2,
                temporalLayer: 2,
            });
        }

        return {
            consumer,
            meta: {
                producerId: producer.id,
                id: consumer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                type: consumer.type,
                producerPaused: consumer.producerPaused,
            },
        };
    } catch (error) {
        console.error("consume failed", error);
        return;
    }
};

export { createConsumer, createMsWorkers, createWebRTCTransport };
