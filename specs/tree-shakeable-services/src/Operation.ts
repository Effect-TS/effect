/**
 * Prototype of `Context.Operation`, written against the public `effect` API.
 *
 * The real implementation lives in `packages/effect/src/Context.ts` and uses
 * the same internals as the service keys it builds on (`withFiber`, literal
 * type IDs), so it does not import `Effect` or `Stream` at run time. The
 * semantics are identical; only the plumbing differs. See the spec for the
 * contract this file implements.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipeArguments } from "effect/Pipeable"
import { hasProperty } from "effect/Predicate"
import type * as Stream from "effect/Stream"

/**
 * The type identifier attached to every operation.
 */
export const TypeId = "~effect/Context/Operation" as const

/**
 * The only shapes an operation accepts: a function whose result is an
 * `Effect` or a `Stream`. The result is looked up and run inside a fiber, so a
 * function returning anything else cannot be an operation. Make it a
 * `Context.Service` and yield the service instead.
 */
export type Signature = (...args: any) => Effect.Effect<any, any, any> | Stream.Stream<any, any, any>

/**
 * A callable whose implementation is a service.
 *
 * `Operation<Key, Shape>` is the call signature of `Shape` with the operation's
 * key added to the requirements of its result, plus the `Context.Service` that
 * stores the implementation. Everything about providing and overriding goes
 * through `.service` using the existing `Context`, `Layer` and `Effect` APIs.
 */
export type Operation<Key extends string, Shape extends Signature> =
  & Operation.Call<Key, Shape>
  & {
    readonly [TypeId]: typeof TypeId
    /**
     * The service holding the implementation. Provide it with `Layer.succeed`,
     * `Layer.effect` or `Effect.provideService`; yield it to get the current
     * implementation as a value.
     */
    readonly service: Context.Service<Key, Shape>
  }

export declare namespace Operation {
  /**
   * The call signature of an operation.
   *
   * If the shape's result already requires the key, the shape is used as is.
   * Otherwise the signature is derived from the shape and the key is added to
   * the result's requirements. Deriving a signature instantiates type
   * parameters at their constraints and keeps only the last overload, so a
   * generic or overloaded shape names its key to keep its signature.
   */
  export type Call<Key extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Key] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Key>
    : never

  /**
   * The requirements of an operation result.
   */
  export type Requirements<Result> = Result extends Effect.Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream.Stream<infer _A, infer _E, infer R> ? R
    : never

  /**
   * An operation result with the key added to its requirements.
   */
  export type Require<Result, Key> = Result extends Effect.Effect<infer A, infer E, infer R> ?
    Effect.Effect<A, E, R | Key>
    : Result extends Stream.Stream<infer A, infer E, infer R> ? Stream.Stream<A, E, R | Key>
    : never

  /**
   * Any operation.
   */
  export type Any = Operation<string, Signature>

  /**
   * The key of an operation.
   */
  export type Key<Op extends Any> = Op["service"] extends Context.Service<infer K, infer _S> ? K : never

  /**
   * The implementation type of an operation.
   */
  export type Shape<Op extends Any> = Op["service"] extends Context.Service<infer _K, infer S> ? S : never
}

/**
 * Creates an operation: a callable whose implementation is looked up from
 * the context of the fiber that runs its result.
 *
 * ```ts
 * export const readFile = Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
 *   "effect/FileSystem/readFile"
 * )
 * ```
 *
 * The key is the identity of the operation at both levels: it is the string
 * the implementation is stored under, and it is the type that appears in `R`
 * while the operation is unprovided.
 */
export const Operation = <Shape extends Signature>() => <const Key extends string>(key: Key): Operation<Key, Shape> => {
  const service = Context.Service<Key, Shape>(key)
  // A plain function, not an Effect: `Effect.andThen`, `Effect.tap` and every
  // other API that accepts a function call it, and `Effect.map(op, f)` is a
  // type error instead of a surprise.
  const operation = function(this: unknown, ...args: Array<unknown>) {
    return call(service, this, args)
  }
  Object.defineProperty(operation, "name", { value: key, configurable: true })
  return Object.assign(operation, { [TypeId]: TypeId, service }) as any
}

/**
 * Tests whether a value is an operation.
 */
export const isOperation = (u: unknown): u is Operation.Any => hasProperty(u, TypeId)

const StreamTypeId: Stream.TypeId = "~effect/Stream"
const ChannelTypeId = "~effect/Channel"

// The value a call returns. The implementation's result kind is not known
// until the implementation has been looked up, which happens when the value
// runs, so the value is both an Effect and a Stream:
//
// - The Effect side looks up the implementation from the running fiber's
//   context, calls it, and runs the Effect it returns. If the implementation
//   returns a Stream instead, the Effect side succeeds with that Stream.
// - The Stream side is a channel whose transform looks up the implementation,
//   calls it, and delegates to the channel of the Stream it returns.
//
// The static type of the call says which side exists; the other is never
// reachable from typed code.
const call = (service: Context.Service<any, any>, receiver: unknown, args: Array<unknown>) =>
  Object.assign(
    Effect.flatMap(service, (implementation) => {
      const result = Reflect.apply(implementation, receiver, args)
      return Effect.isEffect(result) ? result : Effect.succeed(result)
    }),
    {
      [StreamTypeId]: StreamTypeId,
      channel: {
        [ChannelTypeId]: ChannelTypeId,
        transform: (upstream: unknown, scope: unknown) =>
          Effect.flatMap(
            service,
            (implementation) =>
              (Reflect.apply(implementation, receiver, args) as any).channel.transform(upstream, scope)
          ),
        pipe() {
          return pipeArguments(this, arguments)
        }
      }
    }
  )
