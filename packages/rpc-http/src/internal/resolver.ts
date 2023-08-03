import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type * as resolver from "@effect/rpc-http/Resolver"
import { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import { withConstructorTagged, withTo } from "@effect/rpc/SchemaC"
import * as S from "@effect/schema/Schema"

const RpcFetchError_ = withConstructorTagged(
  S.struct({
    _tag: S.literal("RpcFetchError"),
    reason: S.union(S.literal("FetchError"), S.literal("JsonDecodeError")),
    error: S.unknown
  }),
  "RpcFetchError"
)

/** @internal */
export const RpcFetchError = withTo<resolver.RpcFetchError>()(RpcFetchError_)

/** @internal */
export function make(
  options: resolver.FetchResolverOptions
): Resolver.RpcResolver<never> {
  return Resolver.make((requests) =>
    pipe(
      Effect.tryPromise({
        try: (signal) => {
          const headers = new Headers(options.init?.headers)
          headers.set("Content-Type", "application/json; charset=utf-8")
          return fetch(options.url, {
            ...(options.init || {}),
            method: "POST",
            headers,
            body: JSON.stringify(requests),
            signal
          })
        },
        catch: (error) => RpcFetchError({ reason: "FetchError", error })
      }),
      Effect.flatMap((response) =>
        Effect.tryPromise({
          try: () => response.json(),
          catch: (error) => RpcFetchError({ reason: "JsonDecodeError", error })
        })
      ),
      Effect.mapError((error) => RpcTransportError({ error }))
    )
  )
}
