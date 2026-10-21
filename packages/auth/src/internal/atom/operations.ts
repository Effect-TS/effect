import * as Effect from "effect/Effect"
import type * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"

import type { OperationFetchClient } from "../httpOperation/client.ts"
import type { AnyRoute, RouteInput, RouteSuccess } from "../httpOperation/contract.ts"
import { OperationHttpConfigurationError, OperationHttpError } from "../httpOperation/errors.ts"
import { AuthAtomLifetime } from "./authAtomLifetime.ts"
import { AuthAtomWorkflow } from "./authAtomWorkflow.ts"
import { reportAtomDefects } from "./failures.ts"

type DecodeServices<Route extends AnyRoute> =
  | Route["operation"]["rpc"]["successSchema"]["DecodingServices"]
  | Route["operation"]["rpc"]["errorSchema"]["DecodingServices"]

const inLifetime = Effect.fn("AuthAtom.inLifetime")(function*<A, E, R>(
  effect: Effect.Effect<A, E, R>
) {
  const lifetime = yield* AuthAtomLifetime
  const registry = yield* AtomRegistry.AtomRegistry
  const current = yield* lifetime.get

  if (current.registry !== registry) {
    return yield* OperationHttpError.make({ reason: "stale-response" })
  }

  return yield* effect
}, reportAtomDefects)

export type ReactivityKeys =
  | ReadonlyArray<unknown>
  | Readonly<Record<string, ReadonlyArray<unknown>>>

/** Queries cannot contain private reveals. Their values belong to the current
 * subject registry; declare the same keys on mutations that invalidate them. */
export const query = <Route extends AnyRoute, RuntimeError>(
  route: Route,
  input: RouteInput<Route>,
  options: {
    readonly runtime: Atom.AtomRuntime<AuthAtomLifetime | DecodeServices<Route>, RuntimeError>
    readonly reactivityKeys: ReactivityKeys
  }
) => {
  if (
    route.operation.credentials ||
    route.operation.reveals.length > 0 ||
    route.operation.replay !== "read-only"
  ) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous atom construction rejects incompatible route declarations.
    throw OperationHttpConfigurationError.make({ reason: "route" })
  }

  return options.runtime
    .atom(
      inLifetime(
        Effect.gen(function*() {
          const { client } = yield* AuthAtomLifetime

          return yield* client.call(route, input)
        })
      )
    )
    .pipe(options.runtime.factory.withReactivity(options.reactivityKeys))
}

/** Operation atoms run in the current subject registry. A subject-changing
 * mutation disposes its old result and publishes the new lifetime; rendering
 * follows `lifetime.current` rather than retaining that mutation's success. */
export const mutation = <Route extends AnyRoute, RuntimeError>(
  route: Route,
  options: {
    readonly runtime: Atom.AtomRuntime<AuthAtomLifetime | DecodeServices<Route>, RuntimeError>
    readonly reactivityKeys: ReactivityKeys
    readonly subject?: {
      readonly fromSuccess: (success: RouteSuccess<Route>) => string | null | undefined
    }
  }
) =>
  options.runtime.fn<RouteInput<Route>>()(
    (input) =>
      inLifetime(
        Effect.gen(function*() {
          if (options.subject !== undefined) {
            return yield* completeAuthentication(
              route,
              input,
              options.subject.fromSuccess,
              options.reactivityKeys
            )
          }
          const { client } = yield* AuthAtomLifetime

          return yield* client.call(route, input)
        })
      ),
    { reactivityKeys: options.reactivityKeys }
  )

const completeAuthentication = Effect.fn("AuthAtom.completeAuthentication")(function*<
  Route extends AnyRoute
>(
  route: Route,
  input: RouteInput<Route>,
  subject: (value: RouteSuccess<Route>) => string | null | undefined,
  reactivityKeys: ReactivityKeys,
  expectedGeneration?: number
) {
  const lifetime = yield* AuthAtomLifetime
  const reactivity = yield* Reactivity.Reactivity

  return yield* lifetime.completeAuthentication(route, input, subject, {
    onTransition: reactivity.invalidate(reactivityKeys),
    ...(expectedGeneration === undefined ? {} : { expectedGeneration })
  })
})

/** Compose protocol operations and device effects in Atom, leaving rendering
 * and promise-mode dispatch free of authentication logic. Each workflow is
 * fenced at entry, between consumer steps through `current`, and on completion. */
export const workflow = <Input>() =>
<A, E, R, RuntimeError>(
  runtime: Atom.AtomRuntime<AuthAtomLifetime | R, RuntimeError>,
  run: (
    input: Input,
    atoms: Atom.FnContext
  ) => Effect.Effect<
    A,
    E,
    | R
    | AuthAtomLifetime
    | AuthAtomWorkflow
    | Scope.Scope
    | AtomRegistry.AtomRegistry
    | Reactivity.Reactivity
  >,
  options: {
    readonly reactivityKeys: ReactivityKeys
  }
) =>
  runtime.fn<Input>()(
    (input, atoms) =>
      inLifetime(
        Effect.gen(function*() {
          const lifetime = yield* AuthAtomLifetime
          const { client } = lifetime
          const started = yield* client.generation

          const current = Effect.gen(function*() {
            if ((yield* client.generation) !== started) {
              return yield* OperationHttpError.make({ reason: "stale-response" })
            }
          })

          const call: OperationFetchClient["call"] = (route, value, options) =>
            options?.replaceSubject !== undefined && options.replaceSubject !== false
              ? Effect.fail(OperationHttpError.make({ reason: "request" }))
              : current.pipe(
                Effect.andThen(client.call(route, value, options)),
                Effect.tap(() => current)
              )

          const finish: AuthAtomWorkflow["Service"]["completeAuthentication"] = (
            route,
            value,
            subject
          ) =>
            current.pipe(
              Effect.andThen(
                completeAuthentication(route, value, subject, options.reactivityKeys, started)
              ),
              Effect.provideService(AuthAtomLifetime, lifetime)
            )

          const value = yield* run(input, atoms).pipe(
            Effect.provideService(AuthAtomWorkflow, {
              call,
              current,
              completeAuthentication: finish
            })
          )

          yield* current

          return value
        })
      ),
    { reactivityKeys: options.reactivityKeys }
  )
