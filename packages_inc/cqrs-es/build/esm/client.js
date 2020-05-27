import Long from "long";
import client from "node-eventstore-client";
import * as T from "@matechs/core/Effect";
import * as E from "@matechs/core/Either";
import * as M from "@matechs/core/Managed";
import { pipe } from "@matechs/core/Pipe";
import { metaURI } from "@matechs/cqrs";
export const eventStoreURI = "@matechs/cqrs-es/eventStoreURI";
export const accessConfig = T.access((r) => r[eventStoreURI]);
export const eventStoreTcpConnection = M.bracket(pipe(accessConfig, T.chain(({ connectionName, endPointOrGossipSeed, settings }) => T.async((r) => {
    const conn = client.createConnection(settings, endPointOrGossipSeed, connectionName);
    conn
        .connect()
        .then(() => {
        r(E.right(conn));
    })
        .catch((e) => {
        r(E.left({ type: "EventStoreError", message: e.message }));
    });
    return () => {
        conn.close();
    };
}))), (c) => T.sync(() => {
    c.close();
}));
export const sendEventToEventStore = (event) => (connection) => T.fromPromiseMap((e) => ({
    type: "EventStoreError",
    message: e.message
}))(() => connection.appendToStream(event.streamId, Long.fromString(event.expectedStreamVersion.toString(10), false, 10), client.createJsonEventData(event.eventId, event.data, event.eventMetadata, event.eventType)));
export const adaptEvent = (event) => {
    const esE = {};
    esE.data = Object.assign({}, event);
    delete esE.data[metaURI];
    esE.eventId = event[metaURI].id;
    esE.eventType = event[metaURI].kind;
    esE.streamId = `${event[metaURI].aggregate}-${event[metaURI].root}`;
    esE.expectedStreamVersion = BigInt(event[metaURI].sequence) - BigInt(1);
    esE.eventMetadata = {
        createdAt: event[metaURI].createdAt,
        aggregate: event[metaURI].aggregate,
        root: event[metaURI].root,
        sequence: BigInt(event[metaURI].sequence).toString(10)
    };
    return esE;
};
export const sendEvent = (connection) => (event) => T.asUnit(sendEventToEventStore(adaptEvent(event))(connection));
