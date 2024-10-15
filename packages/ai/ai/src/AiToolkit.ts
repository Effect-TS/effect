/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import { pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type * as Types from "effect/Types"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiToolkit")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AiToolkit<in out Tools extends Tool.AnySchema>
  extends Effect.Effect<Handlers<Tools>, never, Tool.Services<Tools> | Registry>, Inspectable.Inspectable
{
  readonly [TypeId]: TypeId
  readonly tools: HashMap.HashMap<string, Tools>
  readonly add: <S extends Tool.AnySchema>(tool: S) => AiToolkit<Tools | S>
  readonly addAll: <ToAdd extends ReadonlyArray<Tool.AnySchema>>(
    ...tools: ToAdd
  ) => AiToolkit<Tools | ToAdd[number]>
  readonly concat: <T extends Tool.AnySchema>(that: AiToolkit<T>) => AiToolkit<Tools | T>
  readonly implement: <R, EX = never, RX = never>(
    f: (
      handlers: Handlers<Tools>
    ) => Handlers<never, R> | Effect.Effect<Handlers<never, R>, EX, RX>
  ) => Layer.Layer<Tool.ServiceFromTag<Tools["_tag"]> | Registry, EX, R | RX>
  readonly implementScoped: <R, EX = never, RX = never>(
    f: (
      handlers: Handlers<Tools>
    ) => Handlers<never, R> | Effect.Effect<Handlers<never, R>, EX, RX>
  ) => Layer.Layer<Tool.ServiceFromTag<Tools["_tag"]> | Registry, EX, Exclude<R | RX, Scope>>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace AiToolkit {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Tools<A> = A extends AiToolkit<infer Tools> ? Tools : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type SuccessSchema<A> = A extends AiToolkit<infer Tools> ? Tools["success"] : never
}

/**
 * @since 1.0.0
 * @category tool
 */
export declare namespace Tool {
  /**
   * @since 1.0.0
   * @category tool
   */
  export interface AnySchema {
    readonly [Schema.TypeId]: any
    readonly _tag: string
    readonly Type: Schema.SerializableWithResult.All
    readonly success: Schema.Schema.Any
  }

  /**
   * @since 1.0.0
   * @category tool
   */
  export type Success<Tool extends AnySchema> = Schema.WithResult.Success<Tool["Type"]>

  /**
   * @since 1.0.0
   * @category tool
   */
  export type Failure<Tool extends AnySchema> = Schema.WithResult.Failure<Tool["Type"]>

  /**
   * @since 1.0.0
   * @category tool
   */
  export type Context<Tool extends AnySchema> = Schema.WithResult.Context<Tool["Type"]>

  /**
   * @since 1.0.0
   * @category tool
   */
  export type Handler<Tool extends AnySchema, R> = (
    params: Tool["Type"]
  ) => Effect.Effect<Success<Tool>, Failure<Tool>, R>

  /**
   * @since 1.0.0
   * @category tool
   */
  export type HandlerAny = (params: any) => Effect.Effect<any, any, any>

  /**
   * @since 1.0.0
   * @category tool
   */
  export interface Service<Tag extends string> {
    readonly _: unique symbol
    readonly name: Types.Invariant<Tag>
  }

  /**
   * @since 1.0.0
   * @category tool
   */
  export type ServiceFromTag<Tag extends string> = Tag extends infer T ? T extends string ? Service<T> : never : never

  /**
   * @since 1.0.0
   * @category tool
   */
  export type Services<Tools extends AnySchema> = ServiceFromTag<Tools["_tag"]>
}

/**
 * @since 1.0.0
 * @category registry
 */
export class Registry extends Context.Tag("@effect/ai/AiToolkit/Registry")<
  Registry,
  Map<Tool.AnySchema, Tool.HandlerAny>
>() {
  static readonly Live: Layer.Layer<Registry> = Layer.sync(Registry, () => new Map())
}

class AiToolkitImpl<Tools extends Tool.AnySchema>
  extends Effectable.Class<Handlers<Tools>, never, Tool.Services<Tools> | Registry>
  implements AiToolkit<Tools>
{
  readonly [TypeId]: TypeId
  constructor(readonly tools: HashMap.HashMap<string, Tools>) {
    super()
    this[TypeId] = TypeId
  }
  toJSON(): unknown {
    return {
      _id: "@effect/ai/AiToolkit",
      tools: [...HashMap.values(this.tools)].map((tool) => tool._tag)
    }
  }
  toString(): string {
    return Inspectable.format(this)
  }
  [Inspectable.NodeInspectSymbol](): string {
    return Inspectable.format(this)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  add<S extends Tool.AnySchema>(tool: S): AiToolkit<Tools | S> {
    return new AiToolkitImpl(HashMap.set(this.tools, tool._tag, tool as any)) as any
  }
  addAll<ToAdd extends ReadonlyArray<Tool.AnySchema>>(...tools: ToAdd): AiToolkit<Tools | ToAdd[number]> {
    let map = this.tools
    for (const tool of tools) {
      map = HashMap.set(map, tool._tag, tool as any)
    }
    return new AiToolkitImpl(map as any)
  }
  concat<T extends Tool.AnySchema>(that: AiToolkit<T>): AiToolkit<Tools | T> {
    return new AiToolkitImpl(HashMap.union(this.tools, that.tools))
  }
  implement<R, EX = never, RX = never>(
    f: (
      handlers: Handlers<Tools>
    ) => Handlers<never, R> | Effect.Effect<Handlers<never, R>, EX, RX>
  ): Layer.Layer<Tool.ServiceFromTag<Tools["_tag"]> | Registry, EX, R | RX> {
    return registerHandlers(this as any, f as any).pipe(Layer.effectDiscard, Layer.provideMerge(Registry.Live))
  }
  implementScoped<R, EX = never, RX = never>(
    f: (
      handlers: Handlers<Tools>
    ) => Handlers<never, R> | Effect.Effect<Handlers<never, R>, EX, RX>
  ): Layer.Layer<Tool.ServiceFromTag<Tools["_tag"]> | Registry, EX, Exclude<R | RX, Scope>> {
    return registerHandlers(this as any, f as any).pipe(Layer.scopedDiscard, Layer.provideMerge(Registry.Live))
  }
  commit(): Effect.Effect<Handlers<Tools>, never, Tool.ServiceFromTag<Tools["_tag"]> | Registry> {
    return Effect.map(Registry, (map) => {
      let handlers = HashMap.empty<string, Tool.HandlerAny>()
      for (const [tag, tool] of this.tools) {
        handlers = HashMap.set(handlers, tag, map.get(tool)!)
      }
      return new HandlersImpl(this as any, handlers)
    }) as any
  }
}

const registerHandlers = (
  toolkit: AiToolkit<any>,
  f: (handlers: Handlers<any, any>) => Handlers<any, any> | Effect.Effect<Handlers<any, any>>
) =>
  Effect.context<any>().pipe(
    Effect.bindTo("context"),
    Effect.bind("handlers", () => {
      const handlers = f(HandlersImpl.fromToolkit(toolkit))
      return Effect.isEffect(handlers) ? handlers : Effect.succeed(handlers)
    }),
    Effect.tap(({ context, handlers }) => {
      const registry = Context.unsafeGet(context, Registry)
      for (const [tag, handler] of handlers.handlers) {
        const tool = HashMap.unsafeGet(handlers.toolkit.tools, tag)
        registry.set(tool, function(params: any) {
          return Effect.withSpan(
            Effect.mapInputContext(handler(params), (input) => Context.merge(input, context)),
            "AiToolkit.handler",
            {
              captureStackTrace: false,
              attributes: {
                tool: tag,
                parameters: params
              }
            }
          )
        })
      }
    })
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: AiToolkit<never> = new AiToolkitImpl(HashMap.empty())

/**
 * @since 1.0.0
 * @category handlers
 */
export const HandlersTypeId: unique symbol = Symbol.for("@effect/ai/AiToolkit/Handlers")

/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId

/**
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<in out Tools extends Tool.AnySchema, R = never> {
  readonly [HandlersTypeId]: Handlers.Variance<Tools>
  readonly toolkit: AiToolkit<Tools>
  readonly handlers: HashMap.HashMap<string, Tool.Handler<any, R>>
  readonly handle: <Tag extends Types.Tags<Tools>, RH>(
    tag: Tag,
    f: Tool.Handler<Types.ExtractTag<Tools, Tag>, RH>
  ) => Handlers<Types.ExcludeTag<Tools, Tag>, R | RH | Tool.Context<Types.ExtractTag<Tools, Tag>>>
}

/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handlers {
  /**
   * @since 1.0.0
   * @category handlers
   */
  export interface Variance<Tools extends Tool.AnySchema> {
    readonly _Tools: Types.Invariant<Tools>
  }
}

const handlersVariance = {
  _Tools: identity
}

class HandlersImpl<Tools extends Tool.AnySchema, R = never> implements Handlers<Tools, R> {
  readonly [HandlersTypeId]: Handlers.Variance<Tools>
  constructor(
    readonly toolkit: AiToolkit<Tools>,
    readonly handlers: HashMap.HashMap<string, Tool.Handler<any, R>>
  ) {
    this[HandlersTypeId] = handlersVariance
  }
  static fromToolkit<Tools extends Tool.AnySchema>(toolkit: AiToolkit<Tools>): Handlers<Tools> {
    return new HandlersImpl(toolkit, HashMap.empty())
  }
  handle<Tag extends Types.Tags<Tools>, RH>(
    tag: Tag,
    f: Tool.Handler<Types.ExtractTag<Tools, Tag>, RH>
  ): Handlers<Types.ExcludeTag<Tools, Tag>, R | RH | Tool.Context<Types.ExtractTag<Tools, Tag>>> {
    return new HandlersImpl(this.toolkit as any, HashMap.set(this.handlers, tag, f as any))
  }
}
