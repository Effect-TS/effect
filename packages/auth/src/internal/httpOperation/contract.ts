import type * as Effect from "effect/Effect"
import type * as Rpc from "effect/rpc/Rpc"
import * as Schema from "effect/Schema"

import type { AuthInvocation } from "../operations/context.ts"
import type { CredentialSlot } from "../operations/credentials.ts"
import type { OperationExposure, OperationReplay } from "../operations/operation.ts"
import type { AuthRevealKind } from "../operations/reveals.ts"
import { OperationHttpConfigurationError } from "./errors.ts"

export interface HttpOperation {
  readonly rpc: Rpc.AnyWithProps
  readonly exposure: OperationExposure
  readonly replay: OperationReplay
  readonly credentials: boolean
  readonly reveals: ReadonlyArray<AuthRevealKind>
  readonly invokeUnknown: (
    invocation: AuthInvocation,
    input: unknown
  ) => Effect.Effect<unknown, unknown, unknown>
}

export type CredentialFields<O extends HttpOperation> = Readonly<
  Partial<Record<Extract<keyof O["rpc"]["payloadSchema"]["Encoded"], string>, CredentialSlot>>
>

export interface OperationHttpRoute<
  O extends HttpOperation,
  Fields extends Readonly<Record<string, CredentialSlot>> = Record<never, never>,
  Method extends "POST" | "GET" = "POST"
> {
  readonly operation: O
  readonly path: string
  readonly method: Method
  readonly credentials: Fields
  readonly reveals: ReadonlyArray<AuthRevealKind>
}

export const route = <
  O extends HttpOperation,
  const Fields extends Readonly<Record<string, CredentialSlot>> = Record<never, never>
>(
  operation: O,
  options: {
    readonly path: string
    readonly credentials?:
      & Fields
      & Record<
        Exclude<keyof Fields, Extract<keyof O["rpc"]["payloadSchema"]["Encoded"], string>>,
        never
      >
    readonly allowInternal?: true
    readonly reveals?: ReadonlyArray<AuthRevealKind>
  }
): OperationHttpRoute<O, NoInfer<Fields>> => {
  if (!Schema.is(Schema.String.check(Schema.isPattern(/^\/(?:[A-Za-z0-9_-]+\/?)*$/)))(options.path)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous route construction rejects invalid static contracts.
    throw OperationHttpConfigurationError.make({ reason: "route" })
  }
  if (operation.exposure !== "public" && options.allowInternal !== true) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous route construction rejects invalid static contracts.
    throw OperationHttpConfigurationError.make({ reason: "internal-operation" })
  }
  const reveals = [...(options.reveals ?? [])]

  if (
    new Set(reveals).size !== reveals.length ||
    reveals.some((kind) => !operation.reveals.includes(kind))
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous route construction rejects invalid static contracts.
    throw OperationHttpConfigurationError.make({ reason: "credentials" })
  }

  return Object.freeze({
    operation,
    path: options.path,
    method: "POST",
    credentials: Object.freeze({ ...options.credentials }) as Fields,
    reveals: Object.freeze(reveals)
  })
}

export type AnyRoute = OperationHttpRoute<
  HttpOperation,
  Readonly<Record<string, CredentialSlot>>,
  "POST" | "GET"
>

export type RouteInput<R extends AnyRoute> = keyof R["credentials"] extends never
  ? R["operation"]["rpc"]["payloadSchema"]["Encoded"]
  : Omit<R["operation"]["rpc"]["payloadSchema"]["Encoded"], keyof R["credentials"]>

export type RouteSuccess<R extends AnyRoute> = R["operation"]["rpc"]["successSchema"]["Type"]
export type RouteFailure<R extends AnyRoute> = R["operation"]["rpc"]["errorSchema"]["Type"]

export type RouteRequirements<R extends AnyRoute> =
  | Effect.Services<ReturnType<R["operation"]["invokeUnknown"]>>
  | R["operation"]["rpc"]["successSchema"]["EncodingServices"]
  | R["operation"]["rpc"]["errorSchema"]["EncodingServices"]

export const make = <const Routes extends Readonly<Record<string, AnyRoute>>>(routes: Routes) => {
  const paths = new Set<string>()
  const tags = new Set<string>()

  for (const value of Object.values(routes)) {
    if (paths.has(value.path)) {
      // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous route construction rejects invalid static contracts.
      throw OperationHttpConfigurationError.make({ reason: "duplicate-route" })
    }
    if (tags.has(value.operation.rpc._tag)) {
      // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous route construction rejects invalid static contracts.
      throw OperationHttpConfigurationError.make({ reason: "duplicate-operation" })
    }
    paths.add(value.path)
    tags.add(value.operation.rpc._tag)
  }

  return Object.freeze({ routes: Object.freeze({ ...routes }) as Routes })
}

/** @internal */
export const HttpRequestBody = Schema.Struct({ payload: Schema.optionalKey(Schema.Json) })
