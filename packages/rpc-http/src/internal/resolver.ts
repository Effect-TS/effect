import * as Body from "@effect/platform/Http/Body"
import type * as Client from "@effect/platform/Http/Client"
import * as ClientRequest from "@effect/platform/Http/ClientRequest"
import { RpcTransportError } from "@effect/rpc/Error"
import * as Resolver from "@effect/rpc/Resolver"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

/** @internal */
export function make(
  client: Client.Client.Default
): Resolver.RpcResolver<never> {
  return Resolver.make((requests) =>
    pipe(
      client(ClientRequest.post("", { body: Body.unsafeJson(requests) })),
      Effect.flatMap((response) => response.json),
      Effect.mapError((error) => RpcTransportError({ error }))
    )
  )
}
