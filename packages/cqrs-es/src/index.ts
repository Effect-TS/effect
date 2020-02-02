import { effect as T, managed as M } from "@matechs/effect";
import { Aggregate, ReadSideConfig } from "@matechs/cqrs";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { sendEvent, eventStoreTcpConnection } from "./client";

const aggregateRead = <
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
>(
  agg: Aggregate<E, A, Tag, Keys, Db>
) => (config: ReadSideConfig) =>
  M.use(eventStoreTcpConnection, connection =>
    agg.readAll(config)(_ => T.traverseAS(sendEvent(connection)))
  );

export const eventStore = <
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
>(
  agg: Aggregate<E, A, Tag, Keys, Db>
) => ({
  dispatcher: aggregateRead(agg)
});

export { EventStoreError, EventStoreConfig, eventStoreURI } from "./client";
