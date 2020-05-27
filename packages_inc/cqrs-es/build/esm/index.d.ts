import { ElemType } from "@morphic-ts/adt/es6/utils"
import { AOfTypes } from "@morphic-ts/batteries/es6/usage/tagged-union"
import * as T from "@matechs/core/Effect"
import * as NEA from "@matechs/core/NonEmptyArray"
import { Aggregate, ReadSideConfig, EventMetaHidden } from "@matechs/cqrs"
export declare const aggregate: <
  Types extends { [k in keyof Types]: [any, any] },
  Tag extends string,
  ProgURI extends "ProgramNoUnionURI" | "ProgramUnionURI" | "ProgramOrderableURI",
  InterpURI extends "ESBASTInterpreterURI",
  Keys extends NEA.NonEmptyArray<keyof Types>,
  Db extends string | symbol,
  Env
>(
  agg: Aggregate<Types, Tag, ProgURI, InterpURI, Keys, Db, Env>
) => {
  dispatcher: (
    config: ReadSideConfig
  ) => T.Effect<
    unknown,
    import("./client").EventStoreConfig &
      import("../../../packages_sys/logger/build/Logger").Logger &
      import("../../../packages_be/orm/build").Pool<Db> &
      import("../../../packages_be/orm/build").Manager<Db>,
    import("./client").EventStoreError,
    never
  >
  read: (
    readId: string
  ) => <S2, R2, E2>(
    process: (
      a: { [k_1 in Extract<keyof Types, ElemType<Keys>>]: Types[k_1] }[Extract<
        keyof Types,
        ElemType<Keys>
      >][1] &
        EventMetaHidden
    ) => T.Effect<S2, R2, E2, void>
  ) => T.Effect<
    unknown,
    import("./client").EventStoreConfig &
      import("../../../packages/core/build/Base/Apply").UnionToIntersection<
        | import("./client").EventStoreConfig
        | import("../../../packages_be/orm/build").ORM<Db>
        | (unknown extends import("../../../packages_be/orm/build").Pool<Db> &
            import("../../../packages_be/orm/build").Manager<Db> &
            R2
            ? never
            : import("../../../packages_be/orm/build").Pool<Db> &
                import("../../../packages_be/orm/build").Manager<Db> &
                R2)
      >,
    | import("./client").EventStoreError
    | import("../../../packages_be/orm/build").TaskError
    | import("./read").DecodeError<import("io-ts").Errors>
    | import("./read").ProcessError<E2>
    | import("./read").OffsetError<import("../../../packages_be/orm/build").TaskError>
    | import("./read").ProviderError<
        import("../../../packages_be/orm/build").TaskError
      >,
    never
  >
}
export { EventStoreError, EventStoreConfig, eventStoreURI } from "./client"
export { offsetStore, OffsetStore, readEvents } from "./read"
export { TableOffset, ormOffsetStore } from "./offset"
