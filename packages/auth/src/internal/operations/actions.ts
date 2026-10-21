import type * as Effect from "effect/Effect"
import type * as Rpc from "effect/rpc/Rpc"
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"

import { HookDenied } from "../hooks/models.ts"
import { makeSessionContract } from "../sessions/contract.ts"
import { SessionError, SessionSignOutUnavailable } from "../sessions/errors.ts"
import { SessionReadOptions, SessionSignOut } from "../sessions/models.ts"
import type { AuthInvocation } from "./context.ts"
import type { CredentialSlot } from "./credentials.ts"
import { OperationConfigurationError } from "./errors.ts"
import { makeOperation, type OperationReplay } from "./operation.ts"
import type { AuthRevealKind } from "./reveals.ts"

/** Public action data is shared by local, HTTP and reactive callers. Private
 * request fields are supplied by the server when the implementation executes. */
export interface ActionOptions<
  Payload extends Schema.Top,
  Success extends Schema.Top,
  Failure extends Schema.Top,
  Mode extends "query" | "mutation" = "query" | "mutation"
> {
  readonly payload: Payload
  readonly success: Success
  readonly error: Failure
  readonly mode: Mode
  readonly replay?: OperationReplay
  readonly credentials?: boolean
  readonly reveals?: ReadonlyArray<AuthRevealKind>
  readonly method?: string | undefined
  readonly strategy?: string | undefined
  readonly requestFields?: Readonly<Record<string, CredentialSlot>>
  /** This action completes an OAuth browser callback. The HTTP host can mount it
   * directly; it must validate the original state and private request binding. */
  readonly oauthCallback?: true
  readonly subject?: {
    fromSuccess(value: Success["Type"]): string | null | undefined
  }
}

/** Define the schema and behavior of one public method, independently of its
 * implementation. Inputs use the schema's encoded form, matching operation.invoke. */
export const action = <
  Payload extends Schema.Top,
  Success extends Schema.Top,
  Failure extends Schema.Top,
  const Mode extends "query" | "mutation",
  const Method extends string | undefined = undefined,
  const Strategy extends string | undefined = undefined
>(
  options: ActionOptions<Payload, Success, Failure, Mode> & {
    readonly method?: Method | undefined
    readonly strategy?: Strategy | undefined
  }
) =>
  Object.freeze({
    ...options,
    method: options.method,
    strategy: options.strategy,
    requestFields: Object.freeze({ ...options.requestFields }),
    reveals: Object.freeze([...(options.reveals ?? [])])
  })

export type ActionDefinition = ActionOptions<Schema.Top, Schema.Top, Schema.Top>
export type ActionDefinitions = Readonly<Record<string, ActionDefinition>>

/** Reuse a pure operation contract for a named action. Request credential fields
 * are removed from the public schema and restored only by the local request adapter. */
export const fromOperation = <
  Fields extends Schema.Struct.Fields,
  Success extends Schema.Top,
  Failure extends Schema.Top,
  const RequestFields extends Readonly<Record<string, CredentialSlot>> = Record<never, never>,
  const Mode extends "query" | "mutation" = "mutation",
  const Method extends string | undefined = undefined,
  const Strategy extends string | undefined = undefined
>(
  operation: {
    readonly rpc: {
      readonly payloadSchema: Schema.Struct<Fields>
      readonly successSchema: Success
      readonly errorSchema: Failure
    }
    readonly exposure: "public" | "internal"
    readonly replay: OperationReplay
    readonly credentials: boolean
    readonly reveals: ReadonlyArray<AuthRevealKind>
  },
  options: {
    readonly method?: Method | undefined
    readonly strategy?: Strategy | undefined
    readonly requestFields?:
      & RequestFields
      & Record<Exclude<keyof RequestFields, Extract<keyof Fields, string>>, never>
    readonly mode?: Mode
    readonly subject?: { fromSuccess(value: Success["Type"]): string | null | undefined }
  } = {}
) => {
  if (operation.exposure !== "public") {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous action construction rejects invalid static contracts.
    throw OperationConfigurationError.make({
      reason: "internal-exposure",
      operation: options.method ?? "action"
    })
  }

  // Schema fields and their keys remain paired while removing request-only input.
  const fields = Object.fromEntries(
    Object.entries(operation.rpc.payloadSchema.fields).filter(
      ([name]) => !Object.hasOwn(options.requestFields ?? {}, name)
    )
  ) as Omit<Fields, keyof RequestFields>

  return action({
    payload: Schema.Struct(fields),
    success: operation.rpc.successSchema,
    error: operation.rpc.errorSchema,
    replay: operation.replay,
    credentials: operation.credentials,
    reveals: operation.reveals,
    ...options,
    mode: (options.mode ?? "mutation") as Mode
  })
}

const bindAction = <
  const Name extends string,
  Payload extends Schema.Top,
  Success extends Schema.Top,
  Failure extends Schema.Top,
  Mode extends "query" | "mutation"
>(
  namespace: string,
  basePath: `/${string}`,
  name: Name,
  definition: ActionOptions<Payload, Success, Failure, Mode>
) => {
  const requestFields = Object.freeze({ ...definition.requestFields })
  const reveals = Object.freeze([...(definition.reveals ?? [])])

  if (
    !Schema.is(Schema.NonEmptyString.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9]*$/)))(name) ||
    [
      "then",
      "__proto__",
      "constructor",
      "prototype",
      "session",
      "sessionRenewal",
      "lifetime",
      "runtime",
      "client"
    ].includes(name) ||
    (definition.mode === "query" &&
      (definition.credentials === true ||
        reveals.length > 0 ||
        (definition.replay !== undefined && definition.replay !== "read-only")))
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous action construction rejects invalid static contracts.
    throw OperationConfigurationError.make({ reason: "invalid-action", operation: name })
  }

  const operation = makeOperation(`${namespace}/api/${name}`, {
    payload: definition.payload,
    success: definition.success,
    error: Schema.Union([definition.error, SessionError, HookDenied]),
    access: "any",
    exposure: "public",
    replay: definition.mode === "query" ? "read-only" : (definition.replay ?? "non-idempotent"),
    ...(definition.credentials === true ? { credentials: true as const } : {}),
    ...(reveals.length > 0 ? { reveals } : {})
  })

  return Object.freeze({
    route: Object.freeze({
      operation,
      path: `${basePath}/${name}` as const,
      method: definition.mode === "query" &&
          Object.keys(requestFields).length === 0 &&
          (SchemaAST.isVoid(Schema.toEncoded(definition.payload).ast) ||
            SchemaAST.isUndefined(Schema.toEncoded(definition.payload).ast))
        ? ("GET" as const)
        : ("POST" as const),
      credentials: Object.freeze({}),
      reveals
    }),
    mode: definition.mode,
    method: definition.method ?? name,
    strategy: definition.strategy,
    requestFields,
    oauthCallback: definition.oauthCallback,
    subject: definition.subject
  })
}

export interface AnyAuthAction {
  readonly route: {
    readonly operation: {
      readonly rpc: Rpc.AnyWithProps
      readonly exposure: "public" | "internal"
      readonly replay: OperationReplay
      readonly credentials: boolean
      readonly reveals: ReadonlyArray<AuthRevealKind>
      readonly invokeUnknown: (
        invocation: AuthInvocation,
        input: unknown
      ) => Effect.Effect<unknown, unknown, unknown>
    }
    readonly path: `/${string}`
    readonly method: "POST" | "GET"
    readonly credentials: Readonly<Record<never, never>>
    readonly reveals: ReadonlyArray<AuthRevealKind>
  }
  readonly mode: "query" | "mutation"
  readonly method: string
  readonly strategy: string | undefined
  readonly requestFields: Readonly<Record<string, CredentialSlot>>
  readonly oauthCallback?: true | undefined
  readonly subject?: { fromSuccess(value: unknown): string | null | undefined } | undefined
}

export type AuthActions = Readonly<Record<string, AnyAuthAction>>

type Target<Definition, Key extends "method" | "strategy", Default> = Key extends keyof Definition
  ? Exclude<Definition[Key], undefined> | (undefined extends Definition[Key] ? Default : never)
  : Default

export type BoundActions<Definitions extends ActionDefinitions> = {
  readonly [Name in keyof Definitions]: Definitions[Name] extends ActionOptions<
    infer P,
    infer S,
    infer E,
    infer M
  > ?
      & Omit<
        ReturnType<typeof bindAction<Extract<Name, string>, P, S, E, M>>,
        "method" | "strategy"
      >
      & {
        readonly method: Target<Definitions[Name], "method", Extract<Name, string>>
        readonly strategy: Target<Definitions[Name], "strategy", undefined>
      }
    : never
}

const sessionActions = <
  S extends Schema.Codec<{ readonly subjectId: string }, unknown, unknown, unknown>
>(
  session: S
) => ({
  getSession: action({
    payload: Schema.UndefinedOr(SessionReadOptions),
    success: Schema.NullOr(session),
    error: Schema.Never,
    mode: "query",
    subject: { fromSuccess: (value) => value?.subjectId ?? null }
  }),
  requireSession: action({
    payload: Schema.Void,
    success: session,
    error: Schema.Never,
    mode: "query",
    subject: { fromSuccess: (value) => value.subjectId }
  }),
  signOut: action({
    payload: Schema.Void,
    success: Schema.Union([SessionSignOut, SessionSignOutUnavailable]),
    error: Schema.Never,
    mode: "mutation",
    replay: "idempotent",
    credentials: true,
    subject: { fromSuccess: () => null }
  }),
  renewSession: action({
    payload: Schema.Void,
    success: session,
    error: Schema.Never,
    mode: "mutation",
    credentials: true
  })
})

// Only exact contracts constructed here can donate their session operations.
// Structural contracts may have arbitrary `sessions` properties; never trust them.
const ownedSessionContracts = new WeakMap<
  AnyAuthContract,
  { readonly moduleId: string; readonly claims: Schema.Top; readonly contract: unknown }
>()

/** @internal */
export const sessionContractFor = <
  Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  contract: AnyAuthContract,
  moduleId: Id,
  claims: Claims
) => {
  const sessions = ownedSessionContracts.get(contract)

  if (sessions?.moduleId !== moduleId || sessions.claims !== claims) return undefined

  // The identity checks retain the exact constructor's namespace and claims codec.
  return sessions.contract as ReturnType<typeof makeSessionContract<Id, Claims>>
}

/** A browser-safe contract. The action callback only receives schemas; it never
 * receives server configuration, keys, persistence or service implementations. */
export const make = <
  const Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  const Additional extends ActionDefinitions = {}
>(
  namespace: Id,
  options: {
    readonly claims: Claims
    readonly basePath?: `/${string}`
    readonly actions?: (
      schemas: ReturnType<typeof makeSessionContract<`${Id}/sessions`, Claims>>
    ) => Additional
  }
) => {
  if (
    !Schema.is(
      Schema.NonEmptyString.check(Schema.isMaxLength(128), Schema.isPattern(/^[A-Za-z0-9._:/-]+$/))
    )(namespace)
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous action construction rejects invalid static contracts.
    throw OperationConfigurationError.make({ reason: "invalid-action", operation: namespace })
  }

  const basePath = options.basePath ?? "/auth"

  if (
    !Schema.is(Schema.String.check(Schema.isPattern(/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/)))(
      basePath
    )
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous action construction rejects invalid static contracts.
    throw OperationConfigurationError.make({ reason: "invalid-action", operation: namespace })
  }

  const sessions = makeSessionContract(`${namespace}/sessions`, options.claims)
  const defaults = sessionActions(sessions.Session)
  const additional = options.actions?.(sessions) ?? {}

  if (Object.keys(additional).some((name) => Object.hasOwn(defaults, name))) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous action construction rejects invalid static contracts.
    throw OperationConfigurationError.make({ reason: "duplicate-operation", operation: namespace })
  }

  const definitions = { ...defaults, ...additional }

  const actions = Object.fromEntries(
    (Object.entries(definitions) as Array<[string, ActionDefinition]>).map(([name, definition]) => [
      name,
      bindAction(namespace, basePath, name, definition)
    ])
  )

  // Each entry is bound with the exact schemas from the corresponding definition.
  const contract = Object.freeze({
    namespace,
    basePath,
    claims: options.claims,
    sessions,
    actions: Object.freeze(actions) as BoundActions<typeof defaults & Additional>
  })

  ownedSessionContracts.set(contract, {
    moduleId: sessions.moduleId,
    claims: options.claims,
    contract: sessions
  })

  return contract
}

export interface AnyAuthContract {
  readonly namespace: string
  readonly claims: Schema.Codec<unknown, unknown, unknown, unknown>
  readonly actions: AuthActions
}

export type ActionInput<A extends AnyAuthAction> = A["route"]["operation"]["rpc"]["payloadSchema"]["Encoded"]

export type ActionSuccess<A extends AnyAuthAction> = A["route"]["operation"]["rpc"]["successSchema"]["Type"]

export type ActionError<A extends AnyAuthAction> = A["route"]["operation"]["rpc"]["errorSchema"]["Type"]
