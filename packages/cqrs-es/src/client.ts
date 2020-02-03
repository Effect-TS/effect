import client from "node-eventstore-client";
import Long from "long";
import { EventMetaHidden, metaURI } from "@matechs/cqrs";
import { effect as T, managed as M } from "@matechs/effect";
import { right, left } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";

export const eventStoreURI: unique symbol = Symbol();

export interface EventStoreConfig {
  [eventStoreURI]: {
    settings: client.ConnectionSettings;
    endPointOrGossipSeed: string | client.TcpEndPoint | client.GossipSeed[];
    connectionName?: string | undefined;
  };
}

export const accessConfig = T.access((r: EventStoreConfig) => r[eventStoreURI]);

export const eventStoreTcpConnection = M.bracket(
  pipe(
    accessConfig,
    T.chain(({ endPointOrGossipSeed, settings, connectionName }) =>
      T.async<EventStoreError, client.EventStoreNodeConnection>(r => {
        const conn = client.createConnection(
          settings,
          endPointOrGossipSeed,
          connectionName
        );

        conn
          .connect()
          .then(() => {
            r(right(conn));
          })
          .catch(e => {
            r(left({ type: "EventStoreError", message: e.message }));
          });

        return () => {
          conn.close();
        };
      })
    )
  ),
  c =>
    T.sync(() => {
      c.close();
    })
);

export const sendEventToEventStore = (event: EventStoreEvent) => (
  connection: client.EventStoreNodeConnection
) =>
  T.fromPromiseMap(
    (e): EventStoreError => ({
      type: "EventStoreError",
      message: (e as Error).message
    })
  )(() =>
    connection.appendToStream(
      event.streamId,
      Long.fromString(event.expectedStreamVersion.toString(10), false, 10),
      client.createJsonEventData(
        event.eventId,
        event.data,
        event.eventMetadata,
        event.eventType
      )
    )
  );

export interface EventStoreEvent {
  streamId: string;
  eventId: string;
  expectedStreamVersion: bigint;
  eventType: string;
  eventMetadata: {};
  data: {};
}

export interface EventStoreAggregateEventMetadata {
  createdAt: string;
  aggregate: string;
  root: string;
  sequence: string;
}

export interface EventStoreError {
  type: "EventStoreError";
  message: string;
}

export const adaptEvent = <T>(event: T & EventMetaHidden): EventStoreEvent => {
  const esE = {} as EventStoreEvent;

  esE.data = {
    ...event
  };

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
  } as EventStoreAggregateEventMetadata;

  return esE;
};

export const sendEvent = (connection: client.EventStoreNodeConnection) => <T>(
  event: T & EventMetaHidden
) => T.asUnit(sendEventToEventStore(adaptEvent(event))(connection));
