import * as H from "@matechs/http-client";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { EventMetaHidden, metaURI } from "@matechs/cqrs";

export interface EventStoreEvent {
  streamId: string;
  eventId: string;
  expectedStreamVersion: bigint;
  eventType: string;
  eventMetadata: {};
  data: {};
}

export const eventStoreConfigURI: unique symbol = Symbol();

export interface EventStoreConfig {
  [eventStoreConfigURI]: {
    baseUrl: string;
  };
}

export const accessConfig = T.access(
  (c: EventStoreConfig) => c[eventStoreConfigURI]
);

export interface EventStoreError {
  type: "EventStoreError";
  message: string;
}

export const postEvent = (event: EventStoreEvent) =>
  pipe(
    accessConfig,
    T.chain(({ baseUrl }) =>
      pipe(
        H.post(`${baseUrl}/streams/${event.streamId}`, [
          {
            eventId: event.eventId,
            eventType: event.eventType,
            metadata: event.eventMetadata,
            data: event.data
          }
        ]),
        H.withHeaders({
          "Content-Type": "application/vnd.eventstore.events+json",
          "ES-ExpectedVersion": event.expectedStreamVersion.toString(10)
        }),
        T.provideR((r: EventStoreConfig & H.HttpEnv) => ({
          ...r,
          ...H.jsonDeserializer
        }))
      )
    ),
    T.mapError(
      (x): EventStoreError => ({
        type: "EventStoreError",
        message:
          x._tag === "HttpErrorRequest"
            ? "unknown request error"
            : `http status ${x.response.status}`
      })
    ),
    T.asUnit
  );

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
    createdAt: event[metaURI].createdAt
  };

  return esE;
};

export const sendEvent = <T>(event: T & EventMetaHidden) =>
  postEvent(adaptEvent(event));
