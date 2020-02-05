import {} from "morphic-ts/lib/batteries/summoner-no-union";
import {} from "morphic-ts/lib/batteries/program";
import {} from "morphic-ts/lib/batteries/program-orderable";

import { effect as T, managed as M } from "@matechs/effect";
import { Aggregate, ReadSideConfig, EventMetaHidden } from "@matechs/cqrs";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { sendEvent, eventStoreTcpConnection } from "./client";
import { readEvents } from "./read";
import { ProgramURI } from "morphic-ts/lib/usage/ProgramType";
import { InterpreterURI } from "morphic-ts/lib/usage/InterpreterResult";
import { AOfTypes } from "morphic-ts/lib/usage/tagged-union";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { ormOffsetStore } from "./offset";
import { pipe } from "fp-ts/lib/pipeable";
import { adaptMeta } from "./meta";
import { isSome } from "fp-ts/lib/Option";

const aggregateRead = <
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NonEmptyArray<keyof Types>,
  Db extends symbol
>(
  agg: Aggregate<Types, Tag, ProgURI, InterpURI, Keys, Db>
) => (config: ReadSideConfig) =>
  M.use(eventStoreTcpConnection, connection =>
    agg.readAll(config)(_ => T.traverseAS(sendEvent(connection)))
  );

export const aggregate = <
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NonEmptyArray<keyof Types>,
  Db extends symbol
>(
  agg: Aggregate<Types, Tag, ProgURI, InterpURI, Keys, Db>
) => ({
  dispatcher: aggregateRead(agg),
  read: (readId: string) => <R2, E2>(
    process: (
      a: AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }> &
        EventMetaHidden
    ) => T.Effect<R2, E2, void>
  ) =>
    readEvents(readId)(`$ce-${agg.aggregate}`)(
      T.liftEither(x => agg.adt.type.decode(x))
    )(a =>
      pipe(adaptMeta(a), meta =>
        isSome(meta)
          ? process({ ...a, ...meta.value })
          : T.raiseAbort(new Error("cannot decode metadata"))
      )
    )(ormOffsetStore(agg.db))(x => agg.db.withORMTransaction(x))
});

export { EventStoreError, EventStoreConfig, eventStoreURI } from "./client";
export { offsetStore, OffsetStore, readEvents } from "./read";
export { TableOffset, ormOffsetStore } from "./offset";
