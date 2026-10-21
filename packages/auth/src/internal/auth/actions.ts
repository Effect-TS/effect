import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { ActionError, ActionInput, ActionSuccess, AnyAuthAction, AuthActions } from "../operations/actions.ts"
import { guest } from "../operations/context.ts"
import {
  type AuthCredentialCommand,
  AuthCredentialCommandCollector,
  AuthRevealCommandCollectorService
} from "../operations/credentials.ts"
import { InvalidOperationInput } from "../operations/errors.ts"
import { type makeOperation, provideOperationHandler } from "../operations/operation.ts"
import type { AuthRevealCommand } from "../operations/reveals.ts"
import { AuthConfigurationError } from "./authConfigurationError.ts"
import { AuthRequest } from "./authRequest.ts"

type Method = (...input: Array<never>) => Effect.Effect<unknown, unknown, unknown>
type Methods = Readonly<Record<string, Method>>
type Implementations = Readonly<Record<string, Methods>>
type Lookup<Table, Key> = Table extends unknown ? string extends Key ? Table[keyof Table]
  : Key extends keyof Table ? Table[Key]
  : never
  : never
type Selection<Action extends AnyAuthAction, Default> =
  | Exclude<Action["strategy"], undefined>
  | (undefined extends Action["strategy"] ? Default : never)
type Implementation<
  Action extends AnyAuthAction,
  Sessions extends Methods,
  Strategies extends Implementations,
  Default
> =
  | Lookup<Sessions, Action["method"]>
  | Lookup<Lookup<Strategies, Selection<Action, Default>>, Action["method"]>
type Requirements<Method> = Method extends (
  ...args: Array<never>
) => Effect.Effect<unknown, unknown, infer R> ? R
  : never
type Codecs<Action extends AnyAuthAction> = Action["route"]["operation"]["rpc"][
  | "payloadSchema"
  | "successSchema"
  | "errorSchema"
]
type SchemaServices<Action extends AnyAuthAction> = Codecs<Action>[
  | "DecodingServices"
  | "EncodingServices"
]

export type LocalActionApi<
  Actions extends AuthActions,
  Sessions extends Methods,
  Strategies extends Implementations,
  Default
> = {
  readonly [Name in keyof Actions]: (
    ...args: undefined extends ActionInput<Actions[Name]> ? [input?: ActionInput<Actions[Name]>]
      : [input: ActionInput<Actions[Name]>]
  ) => Effect.Effect<
    ActionSuccess<Actions[Name]>,
    ActionError<Actions[Name]>,
    | AuthRequest
    | SchemaServices<Actions[Name]>
    | Requirements<Implementation<Actions[Name], Sessions, Strategies, Default>>
  >
}

/**
 * Bind shared schemas to local capabilities. The chosen implementation is fixed
 * at construction; credentials and all execution services are resolved per call.
 *
 * @internal
 */
export const makeActionApi = Effect.fn("Auth.makeActionApi")(function*<
  Sessions extends Methods,
  Strategies extends Implementations,
  Default extends keyof Strategies | undefined,
  Actions extends AuthActions
>(
  sessions: Sessions,
  strategies: Strategies,
  defaultStrategy: Default | undefined,
  actions: Actions
) {
  type RawMethod = Sessions[keyof Sessions] | Strategies[keyof Strategies][string]
  type R = Requirements<RawMethod>

  const entries: Array<
    readonly [string, (input: unknown) => Effect.Effect<unknown, unknown, R | AuthRequest>]
  > = []

  for (const [name, action] of Object.entries(actions)) {
    const selected = action.strategy ?? defaultStrategy

    const methods = Object.hasOwn(sessions, action.method)
      ? sessions
      : typeof selected === "string" && Object.hasOwn(strategies, selected)
      ? strategies[selected]
      : undefined

    if (methods === undefined || !Object.hasOwn(methods, action.method)) {
      return yield* AuthConfigurationError.make({ reason: "method" })
    }

    // Indexed iteration hides the paired input/result types, but keeps the union
    // of implementation requirements. The shared operation validates both sides.
    const method = methods[action.method] as (input: unknown) => Effect.Effect<unknown, unknown, R>

    if (!Predicate.isFunction(method)) {
      return yield* AuthConfigurationError.make({ reason: "method" })
    }

    const run = Effect.fn(`Auth.action.${name}`)(function*(input: unknown) {
      const request = yield* AuthRequest

      // The action has decoded and validated the complete public codec. Existing
      // strategy methods accept encoded inputs at their own operation boundary.
      // The heterogeneous action table erases codec services here; LocalActionApi restores each action's exact schema services.
      const encoded = yield* Schema.encodeEffect(action.route.operation.rpc.payloadSchema)(
        input
      ).pipe(Effect.mapError(() => InvalidOperationInput.make({})))

      const fields = Object.entries(action.requestFields)

      if (fields.length > 0 && !Predicate.isObject(encoded)) {
        return yield* InvalidOperationInput.make({})
      }

      const payload = fields.length === 0 ? encoded : { ...(encoded as Record<string, unknown>) }

      for (const [field, slot] of fields) {
        const credential = request.credentials[slot]

        if (credential === undefined) return yield* InvalidOperationInput.make({})
        ;(payload as Record<string, unknown>)[field] = Redacted.value(credential)
      }

      const credentialCommands: Array<AuthCredentialCommand> = []
      const revealCommands: Array<AuthRevealCommand> = []

      const sink = (commands: ReadonlyArray<AuthCredentialCommand>) =>
        Effect.sync(() => {
          credentialCommands.push(...commands)
        })

      const collector = {
        supportedKinds: action.route.reveals,
        accept: (commands: ReadonlyArray<AuthRevealCommand>) =>
          Effect.sync(() => {
            revealCommands.push(...commands)
          })
      }

      // The selected method's existential error is validated by the exact operation error schema before leaving LocalActionApi.
      const value = yield* method(payload).pipe(
        Effect.provideService(AuthRequest, {
          ...request,
          actionMode: request.actionMode === "mutation" ? "mutation" : action.mode,
          credentialCommandSink: sink,
          revealCommandCollector: collector
        }),
        Effect.provideService(AuthCredentialCommandCollector, sink),
        Effect.provideService(AuthRevealCommandCollectorService, collector)
      )

      if (
        (!action.route.operation.credentials && credentialCommands.length > 0) ||
        (action.route.reveals.length === 0 && revealCommands.length > 0)
      ) {
        return yield* Effect.die(AuthConfigurationError.make({ reason: "method" }))
      }

      return { value, credentialCommands, revealCommands }
    })

    // Restore the invocation contract hidden by the heterogeneous descriptor.
    const operation = action.route.operation as unknown as ReturnType<
      typeof makeOperation<string, Schema.Top, Schema.Top, Schema.Top>
    >

    const provideHandler = provideOperationHandler(operation.rpc._tag, run)

    entries.push([
      name,
      Effect.fn(`Auth.${name}`)(function*(input: unknown) {
        const request = yield* AuthRequest

        if (action.mode === "mutation" && request.beforeMutation !== undefined) {
          yield* request.beforeMutation
        }

        // Reject private input before schema projection can remove unknown fields.
        if (
          Predicate.isObject(input) &&
          Object.keys(action.requestFields).some((field) => Object.hasOwn(input, field))
        ) {
          return yield* InvalidOperationInput.make({})
        }

        // Indexed iteration erases the paired contract; LocalActionApi retains the exact per-action errors and services.
        return yield* operation.invokeUnknown(guest, input).pipe(
          provideHandler,
          Effect.provideService(AuthCredentialCommandCollector, request.credentialCommandSink),
          Effect.provideService(
            AuthRevealCommandCollectorService,
            request.revealCommandCollector ?? {
              supportedKinds: [],
              accept: () => Effect.void
            }
          )
        )
      }) as (input: unknown) => Effect.Effect<unknown, unknown, R | AuthRequest>
    ])
  }

  // Every entry invokes the exact operation and implementation selected above.
  return Object.freeze(Object.fromEntries(entries)) as LocalActionApi<
    Actions,
    Sessions,
    Strategies,
    Default
  >
})
