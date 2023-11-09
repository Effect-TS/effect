import type { Effect } from "../exports/Effect.js"
import { dual } from "../exports/Function.js"
import { hasProperty } from "../exports/Predicate.js"
import type { Request } from "../exports/Request.js"
import * as completedRequestMap from "./completedRequestMap.js"
import * as core from "./core.js"
import * as Data from "./data.js"

/** @internal */
const RequestSymbolKey = "effect/Request"

/** @internal */
export const RequestTypeId: Request.RequestTypeId = Symbol.for(
  RequestSymbolKey
) as Request.RequestTypeId

/** @internal */
const requestVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const isRequest = (u: unknown): u is Request<unknown, unknown> => hasProperty(u, RequestTypeId)

/** @internal */
export const of = <R extends Request<any, any>>(): Request.Constructor<R> => (args) =>
  // @ts-expect-error
  Data.struct({
    [RequestTypeId]: requestVariance,
    ...args
  })

/** @internal */
export const tagged = <R extends Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
): Request.Constructor<R, "_tag"> =>
(args) =>
  // @ts-expect-error
  Data.struct({
    [RequestTypeId]: requestVariance,
    _tag: tag,
    ...args
  })

/** @internal */
export const complete = dual<
  <A extends Request<any, any>>(
    result: Request.Result<A>
  ) => (self: A) => Effect<never, never, void>,
  <A extends Request<any, any>>(
    self: A,
    result: Request.Result<A>
  ) => Effect<never, never, void>
>(2, (self, result) =>
  core.fiberRefGetWith(
    completedRequestMap.currentRequestMap,
    (map) =>
      core.sync(() => {
        if (map.has(self)) {
          const entry = map.get(self)!
          if (!entry.state.completed) {
            entry.state.completed = true
            core.deferredUnsafeDone(entry.result, result)
          }
        }
      })
  ))

/** @internal */
export const completeEffect = dual<
  <A extends Request<any, any>, R>(
    effect: Effect<R, Request.Error<A>, Request.Success<A>>
  ) => (self: A) => Effect<R, never, void>,
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect<R, Request.Error<A>, Request.Success<A>>
  ) => Effect<R, never, void>
>(2, (self, effect) =>
  core.matchEffect(effect, {
    onFailure: (error) => complete(self, core.exitFail(error) as any),
    onSuccess: (value) => complete(self, core.exitSucceed(value) as any)
  }))

/** @internal */
export const fail = dual<
  <A extends Request<any, any>>(
    error: Request.Error<A>
  ) => (self: A) => Effect<never, never, void>,
  <A extends Request<any, any>>(
    self: A,
    error: Request.Error<A>
  ) => Effect<never, never, void>
>(2, (self, error) => complete(self, core.exitFail(error) as any))

/** @internal */
export const succeed = dual<
  <A extends Request<any, any>>(
    value: Request.Success<A>
  ) => (self: A) => Effect<never, never, void>,
  <A extends Request<any, any>>(
    self: A,
    value: Request.Success<A>
  ) => Effect<never, never, void>
>(2, (self, value) => complete(self, core.exitSucceed(value) as any))

/** @internal */
export class Listeners {
  count = 0
  observers: Set<(count: number) => void> = new Set()
  addObserver(f: (count: number) => void): void {
    this.observers.add(f)
  }
  removeObserver(f: (count: number) => void): void {
    this.observers.delete(f)
  }
  increment() {
    this.count++
    this.observers.forEach((f) => f(this.count))
  }
  decrement() {
    this.count--
    this.observers.forEach((f) => f(this.count))
  }
}

/**
 * @internal
 */
export const filterOutCompleted = <A extends Request<any, any>>(requests: Array<A>) =>
  core.fiberRefGetWith(
    completedRequestMap.currentRequestMap,
    (map) =>
      core.succeed(
        requests.filter((request) => !(map.get(request)?.state.completed === true))
      )
  )
