/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type { ReadonlyMailbox } from "effect/Mailbox"
import { type Pipeable } from "effect/Pipeable"
import type * as Record from "effect/Record"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Rpc from "./Rpc.js"
import type * as RpcMiddleware from "./RpcMiddleware.js"

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
  merge<const Groups extends ReadonlyArray<Any>>(
    ...groups: Groups
  ): RpcGroup<R | Rpcs<Groups[number]>>

  /**
   * Add middleware to all the procedures added to the group until this point.
   */
  middleware<M extends RpcMiddleware.TagClassAny>(middleware: M): RpcGroup<Rpc.AddMiddleware<R, M>>

  /**
   * Add a prefix to the procedures in this group, returning a new group
   */
  prefix<const Prefix extends string>(prefix: Prefix): RpcGroup<Rpc.Prefixed<R, Prefix>>

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

  of<const Handlers extends HandlersFrom<R>>(handlers: Handlers): Handlers

  /**
   * Implement a single handler from the group.
   */
  toLayerHandler<
    const Tag extends R["_tag"],
    Handler extends HandlerFrom<R, Tag>,
    EX = never,
    RX = never
  >(
    tag: Tag,
    build:
      | Handler
      | Effect.Effect<Handler, EX, RX>
  ): Layer.Layer<
    Rpc.Handler<Tag>,
    EX,
    | Exclude<RX, Scope>
    | HandlerContext<R, Tag, Handler>
  >

  /**
   * Retrieve a handler for a specific procedure in the group.
   */
  accessHandler<const Tag extends R["_tag"]>(tag: Tag): Effect.Effect<
    (
      payload: Rpc.Payload<Extract<R, { readonly _tag: Tag }>>,
      headers: Headers
    ) => Rpc.ResultFrom<Extract<R, { readonly _tag: Tag }>, never>,
    never,
    Rpc.Handler<Tag>
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
export interface Any {
  readonly [TypeId]: TypeId
}

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlersFrom<Rpc extends Rpc.Any> = {
  readonly [Current in Rpc as Current["_tag"]]: Rpc.ToHandlerFn<Current>
}

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerFrom<Rpc extends Rpc.Any, Tag extends Rpc["_tag"]> = Extract<Rpc, { readonly _tag: Tag }> extends
  infer Current ? Current extends Rpc.Any ? Rpc.ToHandlerFn<Current> : never : never

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlersContext<Rpcs extends Rpc.Any, Handlers> = keyof Handlers extends infer K ?
  K extends keyof Handlers & string ? HandlerContext<Rpcs, K, Handlers[K]> : never :
  never

/**
 * @since 1.0.0
 * @category groups
 */
export type HandlerContext<Rpcs extends Rpc.Any, K extends Rpcs["_tag"], Handler> = [Rpc.IsStream<Rpcs, K>] extends
  [true] ? Handler extends (...args: any) =>
    | Stream.Stream<infer _A, infer _E, infer _R>
    | Rpc.Wrapper<Stream.Stream<infer _A, infer _E, infer _R>>
    | Effect.Effect<
      ReadonlyMailbox<infer _A, infer _E>,
      infer _EX,
      infer _R
    >
    | Rpc.Wrapper<
      Effect.Effect<
        ReadonlyMailbox<infer _A, infer _E>,
        infer _EX,
        infer _R
      >
    > ? Exclude<Rpc.ExcludeProvides<_R, Rpcs, K>, Scope> :
  never :
  Handler extends (
    ...args: any
  ) => Effect.Effect<infer _A, infer _E, infer _R> | Rpc.Wrapper<Effect.Effect<infer _A, infer _E, infer _R>> ?
    Rpc.ExcludeProvides<_R, Rpcs, K>
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
  prefix<const Prefix extends string>(this: RpcGroup<any>, prefix: Prefix) {
    const requests = new Map<string, any>()
    for (const rpc of this.requests.values()) {
      const newRpc = rpc.prefix(prefix)
      requests.set(newRpc._tag, newRpc)
    }
    return makeProto({
      requests,
      annotations: this.annotations
    })
  },
  toLayer(this: RpcGroup<any>, build: Effect.Effect<Record<string, (request: any) => any>>) {
    return Layer.scopedContext(this.toHandlersContext(build))
  },
  of: identity,
  toLayerHandler(this: RpcGroup<any>, tag: string, build: Effect.Effect<Record<string, (request: any) => any>>) {
    return Layer.scopedContext(Effect.gen(this, function*() {
      const context = yield* Effect.context<never>()
      const handler = Effect.isEffect(build) ? yield* build : build
      const contextMap = new Map<string, unknown>()
      const rpc = this.requests.get(tag)!
      contextMap.set(rpc.key, {
        handler,
        context
      })
      return Context.unsafeMake(contextMap)
    }))
  },
  accessHandler(this: RpcGroup<any>, tag: string) {
    return Effect.contextWith((parentContext: Context.Context<any>) => {
      const rpc = this.requests.get(tag)!
      const { context, handler } = parentContext.unsafeMap.get(rpc.key) as Rpc.Handler<any>
      return (payload: Rpc.Payload<any>, options: {
        readonly clientId: number
        readonly headers: Headers
      }) => {
        const result = handler(payload, options)
        const effectOrStream = Rpc.isWrapper(result) ? result.value : result
        return Effect.isEffect(effectOrStream)
          ? Effect.provide(effectOrStream, context)
          : Stream.provideContext(effectOrStream, context)
      }
    })
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
