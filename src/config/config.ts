import { types as msTypes } from "mediasoup";

const mediaCodecs: msTypes.RtpCodecCapability[] = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 1000,
        },
    },
    {
        kind: "video",
        mimeType: "video/VP9",
        clockRate: 90000,
        parameters: {
            "profile-id": 2,
            "x-google-start-bitrate": 1000,
        },
    },
    {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "4d0032",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
        },
    },
    {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
        },
    },
];

const listenIps: msTypes.TransportListenIp[] = [
    {
        ip: "127.0.0.1",
    },
];

export default {
    listenPort: 8000,
    mediasoup: {
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: "warn",
            logTags: [
                "info",
                "ice",
                "dtls",
                "rtp",
                "srtp",
                "rtcp",
                // 'rtx',
                // 'bwe',
                // 'score',
                // 'simulcast',
                // 'svc'
            ],
        },
        router: {
            mediaCodecs,
        },
        webRtcTransport: {
            listenIps,
            maxIncomingBitrate: 838860800,
            initialAvailableOutgoingBitrate: 838860800,
        },
    },
};
