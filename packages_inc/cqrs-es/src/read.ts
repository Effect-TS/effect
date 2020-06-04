import {} from "@morphic-ts/batteries/lib/summoner-ESBAST"
import {} from "@morphic-ts/batteries/lib/program"
import {} from "@morphic-ts/batteries/lib/program-orderable"

import Long from "long"
import { ResolvedEvent } from "node-eventstore-client"

import { eventStoreTcpConnection, accessConfig, EventStoreError } from "./client"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"

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

export type SubError<E, E2, E3> = DecodeError<E> | ProcessError<E2> | OffsetError<E3>

export type ReadError<E, E2, E3, E4> = SubError<E, E2, E3> | ProviderError<E4>

export interface OffsetStore<S1, S2, R, E, R2, E2> {
  set: (readId: string, streamId: string, offset: bigint) => T.Effect<S1, R, E, void>
  get: (readId: string, streamId: string) => T.Effect<S2, R2, E2, bigint>
}

export const esMetaURI = "@matechs/cqrs-es/esMetaURI"

export interface ESMeta {
  [esMetaURI]: {
    raw: ResolvedEvent
  }
}

export const readEvents = (readId: string) => (streamId: string) => <S, R, E, A>(
  decode: (u: unknown) => T.Effect<S, R, E, A>
) => <S2, R2, E2>(process: (a: A & ESMeta) => T.Effect<S2, R2, E2, void>) => <
  S3,
  S4,
  OR,
  OE,
  OR2,
  OE2
>(
  store: OffsetStore<S3, S4, OR, OE, OR2, OE2>
) => <SF, RF, EF>(
  provider: (
    _: T.Effect<S3 | S | S2, OR & R2 & R, SubError<E, E2, OE>, void>
  ) => T.Effect<S3 | S | S2 | SF, RF & R, SubError<E, E2, OE> | EF, void>
) =>
  M.use(eventStoreTcpConnection, (connection) =>
    pipe(
      T.sequenceT(
        accessConfig,
        store.get(readId, streamId),
        T.accessEnvironment<R & RF>()
      ),
      T.chain(([config, from, r]) =>
        T.async<EventStoreError | ReadError<E, E2, OE, EF>, never>((done) => {
          const subscription = connection.subscribeToStreamFrom(
            streamId,
            Long.fromString(BigInt(from).toString(10), false, 10),
            true,
            (_, event) => {
              if (event.event && event.event.data) {
                return T.runToPromise(
                  pipe(
                    decode(JSON.parse(event.event.data.toString("utf-8"))),
                    T.mapError(
                      (e): SubError<E, E2, OE> => ({
                        type: "decode",
                        error: e
                      })
                    ),
                    T.chain((x) =>
                      pipe(
                        { ...x, [esMetaURI]: { raw: event } },
                        process,
                        T.mapError(
                          (e): SubError<E, E2, OE> => ({
                            type: "process",
                            error: e
                          })
                        )
                      )
                    ),
                    T.chainTap((_) =>
                      pipe(
                        store.set(
                          readId,
                          event.originalStreamId,
                          BigInt(event.originalEventNumber.toString(10))
                        ),
                        T.mapError(
                          (e): SubError<E, E2, OE> => ({
                            type: "offset",
                            error: e
                          })
                        )
                      )
                    ),
                    provider,
                    T.mapError(
                      (x): ReadError<E, E2, OE, EF> =>
                        "type" in x ? x : { type: "provider", error: x }
                    ),
                    T.provide(r)
                  )
                )
              } else {
                return Promise.resolve()
              }
            },
            () => {
              // live
            },
            (_, _reason, error: Error | ReadError<E, E2, OE, EF> | undefined) => {
              if (error) {
                done(
                  "type" in error
                    ? E.left(error)
                    : E.left<EventStoreError>({
                        type: "EventStoreError",
                        message: error["message"]
                      })
                )
              } else {
                done(
                  E.left<EventStoreError>({
                    type: "EventStoreError",
                    message: _reason
                  })
                )
              }
            },
            config.settings.defaultUserCredentials
          )

          return () => {
            subscription.stop()
          }
        })
      )
    )
  )

export const offsetStore = <S1, S2, R, E, R2, E2>(
  _: OffsetStore<S1, S2, R, E, R2, E2>
) => _
