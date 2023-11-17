import type * as Effect from "../Effect.js"
import { dual } from "../Function.js"
import { hasProperty } from "../Predicate.js"
import type * as Request from "../Request.js"
import type * as Types from "../Types.js"
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
export const isRequest = (u: unknown): u is Request.Request<unknown, unknown> => hasProperty(u, RequestTypeId)

/** @internal */
export const of = <R extends Request.Request<any, any>>(): Request.Request.Constructor<R> => (args) =>
  // @ts-expect-error
  Data.struct({
    [RequestTypeId]: requestVariance,
    ...args
  })

/** @internal */
export const tagged = <R extends Request.Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
): Request.Request.Constructor<R, "_tag"> =>
(args) =>
  // @ts-expect-error
  Data.struct({
    [RequestTypeId]: requestVariance,
    _tag: tag,
    ...args
  })

/** @internal */
export const TaggedClass = <Tag extends string>(
  tag: Tag
): new<Error, Success, A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Request.Request<unknown, unknown>>, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" | keyof Request.Request<unknown, unknown> ? never : P]: A[P] }
) => Request.Request<Error, Success> & Readonly<A> & { readonly _tag: Tag } => {
  function Base(this: any, args: any) {
    if (args) {
      Object.assign(this, args)
    }
    this._tag = tag
  }
  Base.prototype = {
    ...Data.StructProto,
    [RequestTypeId]: requestVariance
  }
  return Base as any
}

/** @internal */
export const complete = dual<
  <A extends Request.Request<any, any>>(
    result: Request.Request.Result<A>
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    result: Request.Request.Result<A>
  ) => Effect.Effect<never, never, void>
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
  <A extends Request.Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => (self: A) => Effect.Effect<R, never, void>,
  <A extends Request.Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => Effect.Effect<R, never, void>
>(2, (self, effect) =>
  core.matchEffect(effect, {
    onFailure: (error) => complete(self, core.exitFail(error) as any),
    onSuccess: (value) => complete(self, core.exitSucceed(value) as any)
  }))

/** @internal */
export const fail = dual<
  <A extends Request.Request<any, any>>(
    error: Request.Request.Error<A>
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    error: Request.Request.Error<A>
  ) => Effect.Effect<never, never, void>
>(2, (self, error) => complete(self, core.exitFail(error) as any))

/** @internal */
export const succeed = dual<
  <A extends Request.Request<any, any>>(
    value: Request.Request.Success<A>
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    value: Request.Request.Success<A>
  ) => Effect.Effect<never, never, void>
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
export const filterOutCompleted = <A extends Request.Request<any, any>>(requests: Array<A>) =>
  core.fiberRefGetWith(
    completedRequestMap.currentRequestMap,
    (map) =>
      core.succeed(
        requests.filter((request) => !(map.get(request)?.state.completed === true))
      )
  )
