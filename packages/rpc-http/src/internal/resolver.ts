import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type {
  FetchResolverOptions,
  RpcFetchError,
} from "@effect/rpc-http/Resolver"
import type { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"

/** @internal */
export function make(
  options: FetchResolverOptions,
): Resolver.RpcResolver<never> {
  return Resolver.make((requests) =>
    pipe(
      Effect.tryCatchPromiseInterrupt(
        (signal) => {
          const headers = new Headers(options.init?.headers)
          headers.set("Content-Type", "application/json; charset=utf-8")
          return fetch(options.url, {
            ...(options.init || {}),
            method: "POST",
            headers,
            body: JSON.stringify(requests),
            signal,
          })
        },
        (error): RpcFetchError => ({
          _tag: "RpcFetchError",
          reason: "FetchError",
          error,
        }),
      ),
      Effect.flatMap((response) =>
        Effect.tryCatchPromise(
          () => response.json(),
          (error): RpcFetchError => ({
            _tag: "RpcFetchError",
            reason: "JsonDecodeError",
            error,
          }),
        ),
      ),
      Effect.mapError(
        (error): RpcTransportError => ({
          _tag: "RpcTransportError",
          error,
        }),
      ),
    ),
  )
}
