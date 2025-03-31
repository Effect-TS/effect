/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ReadonlyMailbox } from "effect/Mailbox"
import { type Pipeable } from "effect/Pipeable"
import type * as Record from "effect/Record"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type * as Stream from "effect/Stream"
import * as Rpc from "./Rpc.js"
import type * as RpcMiddleware from "./RpcMiddleware.js"
import type * as RpcSchema from "./RpcSchema.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/rpc/RpcGroup")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category groups
 */
export interface RpcGroup<in out R extends Rpc.Any> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly requests: ReadonlyMap<string, R>
  readonly annotations: Context.Context<never>

  /**
   * Add one or more procedures to the group.
   */
  add<const Rpcs2 extends ReadonlyArray<Rpc.Any>>(
    ...rpcs: Rpcs2
  ): RpcGroup<R | Rpcs2[number]>

  /**
   * Merge this group with one or more other groups.
   */
  merge<const Groups extends ReadonlyArray<RpcGroup<any>>>(
    ...groups: Groups
  ): RpcGroup<R | Rpcs<Groups[number]>>

  /**
   * Add middleware to all the procedures added to the group until this point.
   */
  middleware<M extends RpcMiddleware.TagClassAny>(middleware: M): RpcGroup<Rpc.AddMiddleware<R, M>>

  /**
   * Implement the handlers for the procedures in this group, returning a
   * context object.
   */
  toHandlersContext<
    Handlers extends HandlersFrom<R>,
    EX = never,
    RX = never
  >(
    build:
      | Handlers
      | Effect.Effect<Handlers, EX, RX>
  ): Effect.Effect<
    Context.Context<Rpc.ToHandler<R>>,
    EX,
    | RX
    | HandlersContext<R, Handlers>
  >

  /**
   * Implement the handlers for the procedures in this group.
   */
  toLayer<
    Handlers extends HandlersFrom<R>,
    EX = never,
    RX = never
  >(
    build:
      | Handlers
      | Effect.Effect<Handlers, EX, RX>
  ): Layer.Layer<
    Rpc.ToHandler<R>,
    EX,
    | Exclude<RX, Scope>
    | HandlersContext<R, Handlers>
  >

  /**
   * Annotate the group with a value.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): RpcGroup<R>

  /**
   * Annotate the Rpc's above this point with a value.
   */
  annotateRpcs<I, S>(tag: Context.Tag<I, S>, value: S): RpcGroup<R>

  /**
   * Annotate the group with a context object.
   */
  annotateContext<S>(context: Context.Context<S>): RpcGroup<R>

  /**
   * Annotate the Rpc's above this point with a context object.
   */
  annotateRpcsContext<S>(context: Context.Context<S>): RpcGroup<R>
}

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlersFrom<Rpc extends Rpc.Any> = {
  readonly [Current in Rpc as Current["_tag"]]: (
    payload: Rpc.Payload<Current>,
    headers: Headers
  ) => ResultFrom<Current> | Rpc.Fork<ResultFrom<Current>>
}

/**
 * @since 1.0.0
 * @category groups
 */
export type ResultFrom<Rpc extends Rpc.Any> = Rpc extends Rpc.Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? [_Success] extends [RpcSchema.Stream<infer _SA, infer _SE>] ?
      | Stream.Stream<
        _SA["Type"],
        _SE["Type"] | _Error["Type"],
        any
      >
      | Effect.Effect<
        ReadonlyMailbox<_SA["Type"], _SE["Type"] | _Error["Type"]>,
        _SE["Type"] | Schema.Schema.Type<_Error>,
        any
      > :
  Effect.Effect<
    _Success["Type"],
    _Error["Type"],
    any
  > :
  never

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlersContext<Rpcs extends Rpc.Any, Handlers> = keyof Handlers extends infer K ?
  K extends keyof Handlers & string ? [Rpc.IsStream<Rpcs, K>] extends [true] ? Handlers[K] extends (...args: any) =>
        | Stream.Stream<infer _A, infer _E, infer _R>
        | Rpc.Fork<Stream.Stream<infer _A, infer _E, infer _R>>
        | Effect.Effect<
          ReadonlyMailbox<infer _A, infer _E>,
          infer _EX,
          infer _R
        >
        | Rpc.Fork<
          Effect.Effect<
            ReadonlyMailbox<infer _A, infer _E>,
            infer _EX,
            infer _R
          >
        > ? Exclude<Rpc.ExcludeProvides<_R, Rpcs, K>, Scope> :
      never :
    Handlers[K] extends (
      ...args: any
    ) => Effect.Effect<infer _A, infer _E, infer _R> | Rpc.Fork<Effect.Effect<infer _A, infer _E, infer _R>> ?
      Rpc.ExcludeProvides<_R, Rpcs, K>
    : never
  : never
  : never

/**
 * @since 1.0.0
 * @category groups
 */
export type Rpcs<Group> = Group extends RpcGroup<infer R> ? string extends R["_tag"] ? never : R : never

const RpcGroupProto = {
  add(this: RpcGroup<any>, ...rpcs: Array<any>) {
    return makeProto({
      requests: resolveInput(
        ...this.requests.values(),
        ...rpcs
      ),
      annotations: this.annotations
    })
  },
  merge(this: RpcGroup<any>, ...groups: ReadonlyArray<RpcGroup<any>>) {
    const requests = new Map(this.requests)
    const annotations = new Map(this.annotations.unsafeMap)

    for (const group of groups) {
      for (const [tag, rpc] of group.requests) {
        requests.set(tag, rpc)
      }
      for (const [key, value] of group.annotations.unsafeMap) {
        annotations.set(key, value)
      }
    }

    return makeProto({
      requests,
      annotations: Context.unsafeMake(annotations)
    })
  },
  middleware(this: RpcGroup<any>, middleware: RpcMiddleware.TagClassAny) {
    const requests = new Map<string, any>()
    for (const [tag, rpc] of this.requests) {
      requests.set(tag, rpc.middleware(middleware))
    }
    return makeProto({
      requests,
      annotations: this.annotations
    })
  },
  toHandlersContext(this: RpcGroup<any>, build: Effect.Effect<Record<string, (request: any) => any>>) {
    return Effect.gen(this, function*() {
      const context = yield* Effect.context<never>()
      const handlers = Effect.isEffect(build) ? yield* build : build
      const contextMap = new Map<string, unknown>()
      for (const [tag, handler] of Object.entries(handlers)) {
        const rpc = this.requests.get(tag)!
        contextMap.set(rpc.key, {
          handler,
          context
        })
      }
      return Context.unsafeMake(contextMap)
    })
  },
  toLayer(this: RpcGroup<any>, build: Effect.Effect<Record<string, (request: any) => any>>) {
    return Layer.scopedContext(this.toHandlersContext(build))
  },
  annotate(this: RpcGroup<any>, tag: Context.Tag<any, any>, value: any) {
    return makeProto({
      requests: this.requests,
      annotations: Context.add(this.annotations, tag, value)
    })
  },
  annotateRpcs(this: RpcGroup<any>, tag: Context.Tag<any, any>, value: any) {
    return this.annotateRpcsContext(Context.make(tag, value))
  },
  annotateContext(this: RpcGroup<any>, context: Context.Context<any>) {
    return makeProto({
      requests: this.requests,
      annotations: Context.merge(this.annotations, context)
    })
  },
  annotateRpcsContext(this: RpcGroup<any>, context: Context.Context<any>) {
    const requests = new Map<string, any>()
    for (const [tag, rpc] of this.requests) {
      requests.set(tag, rpc.annotateContext(Context.merge(context, rpc.annotations)))
    }
    return makeProto({
      requests,
      annotations: this.annotations
    })
  }
}

const makeProto = <Rpcs extends Rpc.Any>(options: {
  readonly requests: ReadonlyMap<string, Rpcs>
  readonly annotations: Context.Context<never>
}): RpcGroup<Rpcs> =>
  Object.assign(function() {}, RpcGroupProto, {
    requests: options.requests,
    annotations: options.annotations
  }) as any

const resolveInput = <Rpcs extends ReadonlyArray<Rpc.Any>>(
  ...rpcs: Rpcs
): ReadonlyMap<string, Rpcs[number]> => {
  const requests = new Map<string, Rpcs[number]>()
  for (const rpc of rpcs) {
    requests.set(rpc._tag, Schema.isSchema(rpc) ? Rpc.fromTaggedRequest(rpc as any) : rpc as any)
  }
  return requests
}

/**
 * @since 1.0.0
 * @category groups
 */
export const make = <const Rpcs extends ReadonlyArray<Rpc.Any>>(
  ...rpcs: Rpcs
): RpcGroup<Rpcs[number]> =>
  makeProto({
    requests: resolveInput(...rpcs),
    annotations: Context.empty()
  })
