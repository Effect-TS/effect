import { ResolvedEvent } from "node-eventstore-client"
import { EventStoreError } from "./client"
import * as T from "@matechs/core/Effect"
export interface DecodeError<E> {
  type: "decode"
  error: E
}
export interface ProcessError<E> {
  type: "process"
  error: E
}
export interface OffsetError<E> {
  type: "offset"
  error: E
}
export interface ProviderError<E> {
  type: "provider"
  error: E
}
export declare type SubError<E, E2, E3> =
  | DecodeError<E>
  | ProcessError<E2>
  | OffsetError<E3>
export declare type ReadError<E, E2, E3, E4> = SubError<E, E2, E3> | ProviderError<E4>
export interface OffsetStore<S1, S2, R, E, R2, E2> {
  set: (readId: string, streamId: string, offset: bigint) => T.Effect<S1, R, E, void>
  get: (readId: string, streamId: string) => T.Effect<S2, R2, E2, bigint>
}
export declare const esMetaURI = "@matechs/cqrs-es/esMetaURI"
export interface ESMeta {
  [esMetaURI]: {
    raw: ResolvedEvent
  }
}
export declare const readEvents: (
  readId: string
) => (
  streamId: string
) => <S, R, E, A>(
  decode: (u: unknown) => T.Effect<S, R, E, A>
) => <S2, R2, E2>(
  process: (a: A & ESMeta) => T.Effect<S2, R2, E2, void>
) => <S3, S4, OR, OE, OR2, OE2>(
  store: OffsetStore<S3, S4, OR, OE, OR2, OE2>
) => <SF, RF, EF>(
  provider: (
    _: T.Effect<S | S2 | S3, OR & R2 & R, SubError<E, E2, OE>, void>
  ) => T.Effect<
    S | S2 | S3 | SF,
    RF & R,
    EF | DecodeError<E> | ProcessError<E2> | OffsetError<OE>,
    void
  >
) => T.Effect<
  unknown,
  import("./client").EventStoreConfig &
    import("../../../packages/core/build/Base/Apply").UnionToIntersection<
      | import("./client").EventStoreConfig
      | (unknown extends OR2 ? never : OR2)
      | (unknown extends R & RF ? never : R & RF)
    >,
  | EventStoreError
  | OE2
  | DecodeError<E>
  | ProcessError<E2>
  | OffsetError<OE>
  | ProviderError<EF>,
  never
>
export declare const offsetStore: <S1, S2, R, E, R2, E2>(
  _: OffsetStore<S1, S2, R, E, R2, E2>
) => OffsetStore<S1, S2, R, E, R2, E2>
