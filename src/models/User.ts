import { types } from 'mediasoup';

export default class User {
    producerTransport: types.Transport | null;
    consumerTransport: types.Transport | null;
    videoProducer: types.Producer | null;
    audioProducer: types.Producer | null;
    producing: boolean;
    consumers: types.Consumer[] = []

    constructor(public name: string, public id: string) {
        this.producerTransport = null;
        this.consumerTransport = null;
        this.videoProducer = null;
        this.audioProducer = null;
        this.producing = false;
    }

    public getConsumer(id: string) {
        return this.consumers.find(consumer => consumer.id === id);
    }
}
