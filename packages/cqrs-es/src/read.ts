import {} from "@morphic-ts/batteries/lib/summoner-ESBAST";
import {} from "@morphic-ts/batteries/lib/program";
import {} from "@morphic-ts/batteries/lib/program-orderable";

import Long from "long";
import { effect as T, managed as M } from "@matechs/effect";
import { eventStoreTcpConnection, accessConfig, EventStoreError } from "./client";
import { pipe } from "fp-ts/lib/pipeable";
import { left } from "fp-ts/lib/Either";
import { sequenceT } from "fp-ts/lib/Apply";
import { ResolvedEvent } from "node-eventstore-client";

export interface DecodeError<E> {
  type: "decode";
  error: E;
}

export interface ProcessError<E> {
  type: "process";
  error: E;
}

export interface OffsetError<E> {
  type: "offset";
  error: E;
}

export interface ProviderError<E> {
  type: "provider";
  error: E;
}

export type SubError<E, E2, E3> = DecodeError<E> | ProcessError<E2> | OffsetError<E3>;

export type ReadError<E, E2, E3, E4> = SubError<E, E2, E3> | ProviderError<E4>;

export interface OffsetStore<R, E, R2, E2> {
  set: (readId: string, streamId: string, offset: bigint) => T.Effect<R, E, void>;
  get: (readId: string, streamId: string) => T.Effect<R2, E2, bigint>;
}

export const esMetaURI = "@matechs/cqrs-es/esMetaURI";

export interface ESMeta {
  [esMetaURI]: {
    raw: ResolvedEvent;
  };
}

export const readEvents = (readId: string) => (streamId: string) => <R, E, A>(
  decode: (u: unknown) => T.Effect<R, E, A>
) => <R2, E2>(process: (a: A & ESMeta) => T.Effect<R2, E2, void>) => <OR, OE, OR2, OE2>(
  store: OffsetStore<OR, OE, OR2, OE2>
) => <RF, EF>(
  provider: <AF>(
    _e: T.Effect<R2 & OR & R, OE | SubError<E, E2, OE>, AF>
  ) => T.Effect<RF & R, SubError<E, E2, OE> | EF, AF>
) =>
  M.use(eventStoreTcpConnection, (connection) =>
    pipe(
      sequenceT(T.effect)(accessConfig, store.get(readId, streamId), T.accessEnvironment<R & RF>()),
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
                    T.provideAll(r)
                  )
                );
              } else {
                return Promise.resolve();
              }
            },
            () => {
              // live
            },
            (_, _reason, error: Error | ReadError<E, E2, OE, EF> | undefined) => {
              if (error) {
                done(
                  "type" in error
                    ? left(error)
                    : left<EventStoreError>({
                        type: "EventStoreError",
                        message: error["message"]
                      })
                );
              } else {
                done(
                  left<EventStoreError>({
                    type: "EventStoreError",
                    message: _reason
                  })
                );
              }
            },
            config.settings.defaultUserCredentials
          );

          return () => {
            subscription.stop();
          };
        })
      )
    )
  );

export const offsetStore = <R, E, R2, E2>(_: OffsetStore<R, E, R2, E2>) => _;
