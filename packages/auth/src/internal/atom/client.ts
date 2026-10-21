import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"
import type * as Stream from "effect/Stream"

import {
  type ActionDecodeServices,
  AuthClientTypeId,
  type ClientDefinition,
  type ClientService
} from "../httpOperation/authClient.ts"
import type { RouteFailure, RouteInput, RouteSuccess } from "../httpOperation/contract.ts"
import { OperationHttpError } from "../httpOperation/errors.ts"
import type { AnyAuthAction, AuthActions } from "../operations/actions.ts"
import { markAuthFailureReported, reportAuthFailure, ReportedOperationDefect } from "../shared/diagnostics.ts"
import { AuthAtomLifetime, type AuthSubjectLifetime } from "./authAtomLifetime.ts"
import { reportAtomDefects } from "./failures.ts"
import type { ReactivityKeys } from "./operations.ts"
import { type AccountBinding, makeScopedRuntime } from "./scopedRuntime.ts"
import { browserActivity, maintainSession } from "./sessionRenewal.ts"

type ActionsWithSession = AuthActions & {
  readonly getSession: AnyAuthAction
  readonly renewSession: AnyAuthAction
}
type DecoderServices<Actions extends AuthActions> = ActionDecodeServices<Actions[keyof Actions]>

export interface AuthAtomOptions<
  Actions extends AuthActions,
  E = never,
  Id extends string = string
> {
  /** Use the application's runtime factory to share Layers and invalidation. */
  readonly runtime?: Atom.RegistryRuntimeFactory | Atom.SharedRuntimeFactory
  /** Client service Layer with its dependencies provided. Defaults to the client's layerFetch. */
  readonly layer?: Layer.Layer<ClientService<Id, Actions>, E>
  /** Additional application queries invalidated by a successful mutation. */
  readonly reactivityKeys?: Partial<
    {
      readonly [
        Name in keyof Actions as Actions[Name]["mode"] extends "mutation" ? Name : never
      ]: ReactivityKeys
    }
  >
  /** Encoded initial display data. Define a separate binding for each SSR request. */
  readonly initialSession?: unknown
  /** Required when action result codecs depend on services. */
  readonly services?: Layer.Layer<DecoderServices<Actions>, E>
  /** Defaults to foreground browser maintenance while session is mounted.
   * Native hosts supply an activity stream; false preserves manual renewal. */
  readonly sessionRenewal?: false | { readonly activity: Stream.Stream<boolean> }
}

type QueryAtom<Action extends AnyAuthAction, E = never> = Atom.Atom<
  AsyncResult.AsyncResult<
    RouteSuccess<Action["route"]>,
    RouteFailure<Action["route"]> | OperationHttpError | E
  >
>

export type AuthActionAtom<Action extends AnyAuthAction, E = never> = Action["mode"] extends "query"
  ? [RouteInput<Action["route"]>] extends [void] ? QueryAtom<Action, E>
  : (
    ...args: undefined extends RouteInput<Action["route"]> ? [input?: RouteInput<Action["route"]>]
      : [input: RouteInput<Action["route"]>]
  ) => QueryAtom<Action, E>
  : Atom.AtomResultFn<
    RouteInput<Action["route"]>,
    RouteSuccess<Action["route"]>,
    RouteFailure<Action["route"]> | OperationHttpError | E
  >

export type AuthAtoms<
  Id extends string,
  Actions extends ActionsWithSession,
  E = never,
  R = never
> =
  & {
    readonly [Name in keyof Actions]: AuthActionAtom<Actions[Name], E>
  }
  & {
    /** Default getSession query, including any initial display data. */
    readonly session: QueryAtom<Actions["getSession"], E>
    /** Status of automatic maintenance, including the complete failure Cause. */
    readonly sessionRenewal: Atom.Atom<
      AsyncResult.AsyncResult<
        void,
        | RouteFailure<Actions["getSession"]["route"]>
        | RouteFailure<Actions["renewSession"]["route"]>
        | OperationHttpError
        | E
      >
    >
    readonly client: ClientDefinition<Id, Actions, R>
    /** Account-scoped queries, effects, state and workflows. Named auth mutations
     * and subject-discovering queries use the host lifetime so their own account
     * change can settle. */
    readonly runtime: Atom.AtomRuntime<
      ClientService<Id, Actions> | AuthAtomLifetime | DecoderServices<Actions>,
      E | OperationHttpError
    >
  }

interface Binding extends AccountBinding {
  readonly seed: unknown
  seedAvailable: boolean
}

class AuthAtomBinding extends Context.Service<AuthAtomBinding, Binding>()(
  "@effect/auth/Atom/Binding"
) {}

/** Define importable atoms without acquiring a client. The host registry owns
 * one client Scope; private account registries are replaced internally. Supply
 * the same runtime factory as other application queries to share invalidation. */
export const make = <
  const Id extends string,
  Actions extends ActionsWithSession,
  E = never,
  R = never
>(
  client: ClientDefinition<Id, Actions, R>,
  ...args: [DecoderServices<Actions> | R] extends [never] ? [options?: AuthAtomOptions<Actions, E, Id>]
    : [
      options:
        & AuthAtomOptions<Actions, E, Id>
        & ([DecoderServices<Actions>] extends [never] ? {}
          : {
            readonly services: Layer.Layer<DecoderServices<Actions>, E>
          })
        & ([R] extends [never] ? {}
          : { readonly layer: Layer.Layer<ClientService<Id, Actions>, E> })
    ]
): AuthAtoms<Id, Actions, E, R> => {
  const options = args[0] ?? {}
  const factory = options.runtime ?? Atom.runtime
  const actions = client.contract.actions
  const queryKeys = [Symbol("effect-auth/client/queries")]

  const extraKeys = options.reactivityKeys as
    | Readonly<Record<string, ReactivityKeys | undefined>>
    | undefined

  // The options tuple requires this Layer whenever codec services are nonempty.
  const services = (options.services ?? Layer.empty) as Layer.Layer<DecoderServices<Actions>, E>

  const acquire = Effect.gen(function*() {
    const controller = (yield* client).auth[AuthClientTypeId]
    const reactivity = yield* Reactivity.Reactivity
    const parent = yield* AtomRegistry.AtomRegistry
    const codecServices = yield* Effect.context<DecoderServices<Actions>>()

    if (
      actions.getSession.mode !== "query" ||
      !Schema.is(Schema.toEncoded(actions.getSession.route.operation.rpc.payloadSchema))(
        undefined
      ) ||
      ["session", "sessionRenewal", "runtime", "client"].some((name) => Object.hasOwn(actions, name)) ||
      Object.values(actions).some(
        ({ mode, route }) =>
          mode === "query" &&
          (route.operation.credentials ||
            route.operation.reveals.length > 0 ||
            route.operation.replay !== "read-only")
      )
    ) {
      return yield* OperationHttpError.make({ reason: "request" })
    }

    const initial = yield* controller.state
    const hasSeed = Object.hasOwn(options, "initialSession")

    if (hasSeed && initial.generation !== 0) {
      return yield* OperationHttpError.make({ reason: "stale-response" })
    }

    const sessionSchema: Actions["getSession"]["route"]["operation"]["rpc"]["successSchema"] =
      actions.getSession.route.operation.rpc.successSchema

    const seed = hasSeed
      ? yield* Effect.uninterruptibleMask((restore) =>
        restore(
          Schema.decodeUnknownEffect(sessionSchema)(options.initialSession).pipe(
            Effect.provide(codecServices)
          )
        ).pipe(
          Effect.catchCause((cause) =>
            reportAuthFailure("client-workflow", cause).pipe(
              Effect.andThen(
                Effect.failCause(
                  markAuthFailureReported(
                    Cause.fromReasons(
                      cause.reasons.map((reason) =>
                        Cause.isInterruptReason(reason)
                          ? reason
                          : Cause.isDieReason(reason)
                          ? Cause.makeDieReason(ReportedOperationDefect.make({}))
                          : Cause.makeFailReason(
                            OperationHttpError.make({ reason: "response" })
                          )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
      : undefined

    const seedSubject = hasSeed
      ? yield* Effect.sync(() => actions.getSession.subject?.fromSuccess(seed))
      : undefined

    const memoMap = Atom.isAtom(factory.memoMap) ? parent.get(factory.memoMap) : factory.memoMap

    const newRegistry = () =>
      AtomRegistry.make({
        initialValues: Atom.isAtom(factory.memoMap)
          ? [Atom.initialValue(factory.memoMap, memoMap)]
          : undefined
      })

    const controlRegistry = AtomRegistry.make()
    let current: AuthSubjectLifetime = { ...initial, registry: newRegistry() }
    const state = Atom.make(current).pipe(Atom.keepAlive)
    const listeners = new Set<(event: { readonly origin?: object }) => void>()
    let closed = false

    const lifetime: AuthAtomLifetime["Service"] = {
      client: controller.transport,
      current: Atom.readable((get) => {
        get.addFinalizer(controlRegistry.subscribe(state, (value) => get.setSelf(value)))

        return controlRegistry.get(state)
      }),
      get: Effect.sync(() => current),
      controlRegistry,
      replaceSubject: controller.replaceSubject,
      completeAuthentication: controller.completeAuthentication
    }

    const binding: Binding = {
      lifetime,
      current: () => current,
      subscribe: (listener) => {
        listeners.add(listener)

        return () => {
          listeners.delete(listener)
        }
      },
      seed,
      seedAvailable: hasSeed
    }

    yield* controller.subscribe(Effect.fnUntraced(function*(event) {
      if (closed) return
      if (event._tag === "Mutation") {
        yield* reactivity.invalidate(queryKeys)
        const keys = extraKeys?.[event.name]

        if (keys !== undefined) yield* reactivity.invalidate(keys)

        return
      }
      if (current.generation === event.state.generation) return
      // Initial verification may acquire the already displayed account before
      // its query publishes the result. Explicit replacement still retires it.
      binding.seedAvailable = binding.seedAvailable &&
        current.generation === 0 &&
        event.action === "getSession" &&
        event.state.subject === seedSubject
      // Retire public views and settle pending dispatch observers before disposal.
      // oxlint-disable-next-line unicorn/no-useless-spread -- Listeners can subscribe or unsubscribe while this snapshot is delivered.
      for (const listener of [...listeners]) listener(event)
      current.registry.dispose()
      current = { ...event.state, registry: newRegistry() }
      controlRegistry.set(state, current)
      // Account-owned workflows may be interrupted during this transition.
      const keys = event.action === undefined ? undefined : extraKeys?.[event.action]

      if (keys !== undefined) yield* reactivity.invalidate(keys)
    }))

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        closed = true
        binding.seedAvailable = false
        try {
          // oxlint-disable-next-line unicorn/no-useless-spread -- Disposal can unsubscribe listeners while this snapshot is delivered.
          for (const listener of [...listeners]) listener({})
        } finally {
          listeners.clear()
        }
      }).pipe(
        Effect.ensuring(Effect.sync(() => current.registry.dispose())),
        Effect.ensuring(Effect.sync(() => controlRegistry.dispose())),
        reportAtomDefects
      )
    )

    return Context.make(AuthAtomBinding, binding).pipe(Context.add(AuthAtomLifetime, lifetime))
  }).pipe(reportAtomDefects)

  // The options tuple requires a fully provided Layer whenever the client needs services.
  const clientLayer = (options.layer ?? client.layerFetch) as Layer.Layer<
    ClientService<Id, Actions>,
    E | OperationHttpError
  >

  const host = factory(
    Layer.effectContext(acquire).pipe(
      Layer.provideMerge(clientLayer),
      Layer.provideMerge(services)
    )
  ).pipe(Atom.keepAlive)

  const runtime = makeScopedRuntime(host, (context) => Context.get(context, AuthAtomBinding))

  const call = Effect.fn("AuthAtom.call")(function*<Name extends keyof Actions>(
    name: Name,
    input: RouteInput<Actions[Name]["route"]>
  ) {
    const instance = yield* client

    return yield* instance.auth[AuthClientTypeId].call(name, input)
  }, reportAtomDefects)

  const mutation = <Name extends keyof Actions>(name: Name) => {
    const active = Atom.make((): { origin?: object | undefined } => ({}))

    const source = host.fn<RouteInput<Actions[Name]["route"]>>()(Effect.fnUntraced(function*(input, get) {
      const binding = yield* AuthAtomBinding
      const instance = yield* client
      const origin = {}
      const state = get(active)

      state.origin = origin

      return yield* Effect.acquireUseRelease(
        Effect.sync(() =>
          binding.subscribe((event) => {
            // A replaced call may still be settling credentials uninterruptibly.
            // Its observer must never interrupt the newer dispatch in this atom.
            if (state.origin !== origin) return
            // Remove any previous account's public result without cancelling the
            // authentication call that owns this admitted transition.
            get.setSelf(AsyncResult.initial(true))
            if (event.origin !== origin) get.registry.set(source, Atom.Interrupt)
          })
        ),
        () => instance.auth[AuthClientTypeId].call(name, input, { origin }),
        (unsubscribe) =>
          Effect.sync(() => {
            if (state.origin === origin) state.origin = undefined
            unsubscribe()
          })
      )
    }, reportAtomDefects))

    return Atom.writable(
      (get) => {
        const context = get(host)
        const state = get(active)

        if (AsyncResult.isSuccess(context)) {
          const binding = Context.get(context.value, AuthAtomBinding)

          get.addFinalizer(
            binding.subscribe(() => {
              if (state.origin === undefined) get.registry.set(source, Atom.Reset)
            })
          )
        }

        return get(source)
      },
      (ctx, input: RouteInput<Actions[Name]["route"]> | Atom.Reset | Atom.Interrupt) => {
        // Each dispatch starts without a previous account result. Native fn
        // captures its previous value when running, before transition callbacks.
        if (input !== Atom.Reset && input !== Atom.Interrupt) ctx.set(source, Atom.Reset)
        ctx.set(source, input)
      }
    ).pipe(Atom.withServerValueInitial)
  }

  const atoms = Object.fromEntries(
    Object.entries(actions).flatMap(([name, action]) => {
      if (action.mode === "mutation") return [[name, mutation(name)]]

      const query = Atom.family((input: RouteInput<Actions[string]["route"]>) => {
        // A subject-discovering read must outlive the account registry it retires.
        // Other transitions still clear its result and restart the request.
        const source = action.subject !== undefined
          ? host.atom(Effect.fnUntraced(function*(get) {
            const binding = yield* AuthAtomBinding
            const instance = yield* client
            const origin = {}

            get.addFinalizer(
              binding.subscribe((event) => {
                get.setSelf(AsyncResult.initial(true))
                if (event.origin !== origin) get.refreshSelf()
              })
            )

            return yield* instance.auth[AuthClientTypeId].call(name, input, { origin })
          }, reportAtomDefects))
          : runtime.atom(call(name, input))

        const session = source.pipe(factory.withReactivity(queryKeys), Atom.withServerValueInitial)

        if (
          name !== "getSession" ||
          input !== undefined ||
          !Object.hasOwn(options, "initialSession")
        ) {
          return session
        }

        return Atom.readable(
          (get) => {
            const result = get(session)
            const context = get(host)

            if (!AsyncResult.isSuccess(context)) return result
            const binding = Context.get(context.value, AuthAtomBinding)

            if (!AsyncResult.isInitial(result)) binding.seedAvailable = false

            return binding.seedAvailable
              ? AsyncResult.success(binding.seed, { waiting: true })
              : result
          },
          (refresh) => refresh(session)
        ).pipe(
          Atom.withServerValue((get) => {
            const context = get(host)

            if (!AsyncResult.isSuccess(context)) return AsyncResult.initial(true)
            const binding = Context.get(context.value, AuthAtomBinding)

            return binding.seedAvailable
              ? AsyncResult.success(binding.seed, { waiting: true })
              : AsyncResult.initial(true)
          })
        )
      })

      // Restore the encoded payload relationship while inspecting heterogeneous actions.
      const payloadSchema = action.route.operation.rpc.payloadSchema as Schema.Top & {
        readonly Encoded: RouteInput<Actions[string]["route"]>
      }

      const payload = Schema.toEncoded(payloadSchema)
      const input: unknown = undefined
      const acceptsDefault = Schema.is(payload)(input)

      const entries = [
        [
          name,
          acceptsDefault && (SchemaAST.isVoid(payload.ast) || SchemaAST.isUndefined(payload.ast))
            ? query(input)
            : query
        ]
      ]

      if (name === "getSession") {
        entries.push([
          "session",
          acceptsDefault
            ? query(input)
            : runtime.atom(Effect.fail(OperationHttpError.make({ reason: "request" })))
        ])
      }

      return entries
    })
  )

  // These entries are produced by the schema-directed table above.
  const session = atoms.session as QueryAtom<Actions["getSession"], E>

  type RenewalError =
    | RouteFailure<Actions["getSession"]["route"]>
    | RouteFailure<Actions["renewSession"]["route"]>
    | OperationHttpError
    | E

  const status = Atom.make<AsyncResult.AsyncResult<void, RenewalError>>(
    AsyncResult.success(undefined)
  ).pipe(Atom.keepAlive)

  const input = <Name extends keyof Actions>(name: Name, value: unknown) =>
    Schema.decodeUnknownEffect(
      // Restore the payload relationship lost by the heterogeneous action table.
      Schema.toEncoded(actions[name].route.operation.rpc.payloadSchema) as Schema.Codec<
        RouteInput<Actions[Name]["route"]>,
        RouteInput<Actions[Name]["route"]>,
        never,
        never
      >
    )(value).pipe(Effect.mapError(() => OperationHttpError.make({ reason: "request" })))

  const renewal = host
    .atom(Effect.fnUntraced(function*(get) {
      if (options.sessionRenewal === false) return
      const controller = (yield* client).auth[AuthClientTypeId]
      const fresh = yield* input("getSession", { fresh: true })
      const renew = yield* input("renewSession", undefined)

      return yield* maintainSession({
        session,
        activity: options.sessionRenewal?.activity ?? browserActivity,
        read: controller.call("getSession", fresh),
        renew: (key, generation) =>
          controller.call("renewSession", renew, {
            automaticRenewal: { key, generation }
          }),
        generation: Effect.map(controller.state, (state) => state.generation),
        lastAttempt: controller.lastRenewalAttempt,
        deadline: controller.renewalDeadline,
        publish: (result) => get.set(status, result)
      })
    }, reportAtomDefects))
    .pipe(Atom.withServerValueInitial)

  const sessionRenewal = Atom.readable((get) => {
    const running = get(renewal)

    return AsyncResult.isFailure(running) ? running : get(status)
  }).pipe(Atom.withServerValueInitial)

  const maintainedSession = options.sessionRenewal === false
    ? session
    : Atom.readable(
      (get) => {
        get(sessionRenewal)

        return get(session)
      },
      (refresh) => refresh(session)
    ).pipe(Atom.withServerValue((get) => get(session)))

  // Action mode and encoded payload choose each named atom's exact public form.
  return Object.freeze({
    ...atoms,
    session: maintainedSession,
    sessionRenewal,
    client,
    runtime
  }) as AuthAtoms<Id, Actions, E>
}
