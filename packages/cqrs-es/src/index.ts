import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import { Aggregate, ReadSideConfig } from "@matechs/cqrs";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { sendEvent, EventStoreConfig } from "./client";

const aggregateRead = <
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
>(
  agg: Aggregate<E, A, Tag, Keys, Db>
) => (config: ReadSideConfig) =>
  agg.readAll(config)(_ => T.traverseAS(sendEvent));

export const EventStore = {
  aggregate: {
    read: aggregateRead
  }
};

export {
  EventStoreError,
  EventStoreConfig,
  eventStoreConfigURI
} from "./client";

export type EventStoreEnv = EventStoreConfig & H.Http & H.MiddlewareStack;
