/**
 * @since 1.0.0
 */
import type * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Record from "effect/Record"
import type * as Request from "effect/Request"
import * as Stream from "effect/Stream"
import type * as Types from "effect/Types"

/**
 * @since 1.0.0
 * @category models
 */
export interface SchemaWithProto<A extends Schema.TaggedRequest.Any, I, R> extends Schema.Schema<A, I, R> {
  new(...args: ReadonlyArray<any>): A
  readonly prototype: any
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const makeAnnotations = <
  RA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {},
  OA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {}
>(
  options: {
    readonly required: RA
    readonly optional: OA
  }
): <A>(
  annotations:
    & Schema.Annotations.Schema<A>
    & Types.Simplify<
      & {
        readonly [K in keyof RA]: Context.Tag.Service<RA[K]>
      }
      & {
        readonly [K in keyof OA]?: Context.Tag.Service<OA[K]> | undefined
      }
    >
) => Schema.Annotations.Schema<A> => {
  const allTags = {
    ...options.required,
    ...options.optional
  }
  return (annotations) => {
    const out = { ...annotations } as any
    for (const [key, value] of Object.entries(annotations)) {
      const tag = allTags[key]
      if (tag === undefined) {
        continue
      }
      out[Symbol.for(tag.key)] = value
      delete out[key]
    }
    return out
  }
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const getAnnotations = <
  RA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {},
  OA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {}
>(
  options: {
    readonly required: RA
    readonly optional: OA
  }
): (
  ast: AST.AST
) => Types.Simplify<
  & { readonly [K in keyof RA]: Context.Tag.Service<RA[K]> }
  & { readonly [K in keyof OA]: Option.Option<Context.Tag.Service<OA[K]>> }
> => {
  const required = Object.entries(options.required).map(([key, tag]) => [key, Symbol.for(tag.key)] as const)
  const optional = Object.entries(options.optional).map(([key, tag]) => [key, Symbol.for(tag.key)] as const)
  return (ast) => {
    const annotations = ast._tag === "Transformation" ?
      {
        ...ast.annotations,
        ...ast.to.annotations
      } :
      ast.annotations
    const out: Record<string, unknown> = {}
    for (let i = 0; i < required.length; i++) {
      const [key, sym] = required[i]
      out[key] = annotations[sym]
    }
    for (let i = 0; i < optional.length; i++) {
      const [key, sym] = optional[i]
      out[key] = Option.fromNullable(annotations[sym])
    }
    return out as any
  }
}

/**
 * @since 1.0.0
 * @category streams
 */
export const StreamRequestTypeId = Symbol.for("@effect/platform/Endpoint/StreamRequest")

/**
 * @since 1.0.0
 * @category streams
 */
export type StreamRequestTypeId = typeof StreamRequestTypeId

/**
 * @since 1.0.0
 * @category streams
 */
export interface StreamRequest<Tag extends string, SR, SI, S, RR, EI, E, AI, A>
  extends Request.Request<Stream.Stream<A, E, never>>, Serializable.SerializableWithResult<S, SI, SR, A, AI, E, EI, RR>
{
  readonly _tag: Tag
}

/**
 * @since 1.0.0
 * @category streams
 */
export declare namespace StreamRequest {
  /**
   * @since 1.0.0
   * @category schemas
   */
  export type Any =
    | StreamRequest<string, any, any, any, any, any, any, any, any>
    | StreamRequest<string, any, any, any, any, never, never, any, any>
}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface StreamRequestConstructor<Tag extends string, Self, R, IS, S, RR, IE, E, IA, A>
  extends Schema.Schema<Self, Types.Simplify<IS & { readonly _tag: Tag }>, R>
{
  new(
    props: Types.Equals<S, {}> extends true ? void : S,
    disableValidation?: boolean
  ): StreamRequest<Tag, R, IS & { readonly _tag: Tag }, Self, RR, IE, E, IA, A> & S
}

/**
 * @since 1.0.0
 * @category streams
 */
export const StreamRequest =
  <Self>() =>
  <Tag extends string, E, IE, RE, A, IA, RA, Fields extends Schema.Struct.Fields>(
    tag: Tag,
    failure: Schema.Schema<E, IE, RE>,
    success: Schema.Schema<A, IA, RA>,
    fields: Fields
  ): StreamRequestConstructor<
    Tag,
    Self,
    Schema.Schema.Context<Fields[keyof Fields]>,
    Types.Simplify<Schema.Struct.Encoded<Fields>>,
    Types.Simplify<Schema.Struct.Type<Fields>>,
    RE | RA,
    IE,
    E,
    IA,
    A
  > => {
    return class extends (Schema.TaggedRequest<{}>()(tag, failure, success, fields) as any) {
      constructor(props: any, disableValidation?: boolean) {
        super(props, disableValidation)
        ;(this as any)[StreamRequestTypeId] = StreamRequestTypeId
      }
    } as any
  }

/**
 * @since 1.0.0
 * @category handlers
 */
export const TypeId = Symbol.for("@effect/platform/Handler")

/**
 * @since 1.0.0
 * @category handlers
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category handlers
 */
export type Handler<A extends Schema.TaggedRequest.Any, R> = HandlerEffect<A, R> | HandlerStream<A, R>

/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handler {
  /**
   * @since 1.0.0
   * @category handlers
   */
  export interface Proto<A extends Schema.TaggedRequest.Any, R> extends Pipeable {
    readonly [TypeId]: TypeId
    readonly schema: SchemaWithProto<A, unknown, R>
  }

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Any = Handler<any, any>

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Context<A extends Any> = A extends Handler<infer Req, infer R>
    ? R | Serializable.SerializableWithResult.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<A extends Any> = Schema.Schema.Type<A["schema"]>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Result<A extends Schema.TaggedRequest.Any, R = never> = Request.Request.Success<A> extends
    Stream.Stream<infer A, infer E, infer _R> ? Stream.Stream<A, E, R>
    : Effect.Effect<Request.Request.Success<A>, Request.Request.Error<A>, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ResultUndecoded<A extends Schema.TaggedRequest.Any, R = never> = A extends
    Serializable.WithResult<infer _A, infer I, infer _E, infer _EI, infer _R>
    ? Request.Request.Success<A> extends Stream.Stream<infer _A, infer E, infer _R> ? Stream.Stream<I, E, R>
    : Effect.Effect<I, Request.Request.Error<A>, R>
    : never
}

/**
 * @since 1.0.0
 * @category handlers
 */
export interface HandlerEffect<A extends Schema.TaggedRequest.Any, R> extends Handler.Proto<A, R> {
  readonly _tag: "Effect"
  readonly handler: (request: A) => Effect.Effect<
    Request.Request.Success<A>,
    Request.Request.Error<A>,
    R
  >
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const effect = <A extends Schema.TaggedRequest.Any, I, R>(
  schema: SchemaWithProto<A, I, R>,
  handler: (_: A) => Effect.Effect<Request.Request.Success<A>, Request.Request.Error<A>, R>
): Handler<A, R> => ({
  [TypeId]: TypeId,
  _tag: "Effect",
  schema: schema as any,
  handler,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category handlers
 */
export interface HandlerStream<A extends Schema.TaggedRequest.Any, R> extends Handler.Proto<A, R> {
  readonly _tag: "Stream"
  readonly handler: (request: A) => Stream.Stream<
    A extends Serializable.WithResult<infer A, infer _I, infer _E, infer _EI, infer _R> ? A : never,
    A extends Serializable.WithResult<infer _A, infer _I, infer E, infer _EI, infer _R> ? E : never,
    R
  >
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const stream = <Req extends StreamRequest.Any, I, SR, R>(
  schema: SchemaWithProto<Req, I, SR>,
  handler: (
    request: Req
  ) => Stream.Stream<
    Req extends Serializable.WithResult<infer A, infer _I, infer _E, infer _EI, infer _R> ? A : never,
    Req extends Serializable.WithResult<infer _A, infer _I, infer E, infer _EI, infer _R> ? E : never,
    R
  >
): Handler<Req, R> => ({
  [TypeId]: TypeId,
  _tag: "Stream",
  schema: schema as any,
  handler,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category parsers
 */
export const makeParser = <
  Parsed,
  RA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {},
  OA extends Record.ReadonlyRecord<string, Context.Tag<any, any>> = {}
>(
  options: {
    readonly requiredAnnotations: RA
    readonly optionalAnnotations: OA
  },
  f: <A extends Schema.TaggedRequest.Any, I, R>(options: {
    readonly schema: Schema.Schema<A, I, R>
    readonly ast: AST.AST
    readonly annotations: Types.Simplify<
      & {
        readonly [K in keyof RA]: Context.Tag.Service<RA[K]>
      }
      & {
        readonly [K in keyof OA]: Option.Option<Context.Tag.Service<OA[K]>>
      }
    >
    readonly SuccessSchema: Schema.Schema.Any
    readonly FailureSchema: Schema.Schema.Any
  }) => Parsed
) => {
  const cache = new WeakMap<Schema.Schema.Any, any>()
  const getAnn = getAnnotations({
    required: options.requiredAnnotations,
    optional: options.optionalAnnotations
  })
  return <A extends Schema.TaggedRequest.Any, I, R>(schema: SchemaWithProto<A, I, R>): Parsed => {
    if (cache.has(schema)) {
      return cache.get(schema)
    }
    const SuccessSchema = Serializable.successSchema(schema.prototype)
    const FailureSchema = Serializable.failureSchema(schema.prototype)
    const annotations = getAnn(schema.ast)
    const parsed = f({
      schema,
      ast: schema.ast,
      annotations: annotations as any,
      SuccessSchema,
      FailureSchema
    })
    cache.set(schema, parsed)
    return parsed
  }
}

/**
 * @since 1.0.0
 * @category groups
 */
export const GroupTypeId = Symbol.for("@effect/platform/Endpoint/Group")

/**
 * @since 1.0.0
 * @category groups
 */
export type GroupTypeId = typeof GroupTypeId

/**
 * @since 1.0.0
 * @category groups
 */
export interface Group<Request extends Schema.TaggedRequest.Any, R> extends Pipeable {
  readonly [GroupTypeId]: GroupTypeId
  readonly children: ReadonlyArray<Handler<Request, R> | Group<Request, R>>
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category groups
 */
export declare namespace Group {
  /**
   * @since 1.0.0
   * @category groups
   */
  export type Any = Group<any, any>

  /**
   * @since 1.0.0
   * @category groups
   */
  export type Request<G extends Any> = G extends Group<infer A, infer _R> ? A : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A extends Any> = A extends Group<infer Req, infer R>
    ? R | Serializable.SerializableWithResult.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextRaw<A extends Any> = A extends Group<infer Req, infer R>
    ? R | Serializable.Serializable.Context<Req>
    : never
}

const GroupProto = {
  [GroupTypeId]: GroupTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeGroup = <Request extends Schema.TaggedRequest.Any, R>(
  children: ReadonlyArray<Handler<Request, R> | Group<Request, R>>,
  annotations: Context.Context<never>
): Group<Request, R> => {
  const self = Object.create(GroupProto)
  self.children = children
  self.annotations = annotations
  return self
}

/**
 * @since 1.0.0
 * @category groups
 */
export const group = <Children extends ReadonlyArray<Handler.Any | Group.Any>>(
  ...children: Children
): Group<
  Children[number] extends infer Child ? Child extends Handler<infer A, infer _R> ? A :
    Child extends Group<infer A, infer _R> ? A
    : never :
    never,
  Children[number] extends infer Child ? Child extends Handler<infer _A, infer R> ? R :
    Child extends Group<infer _A, infer R> ? R
    : never :
    never
> => makeGroup(children, Context.empty())

/**
 * @since 1.0.0
 * @category groups
 */
export const getChildren = <A extends Schema.TaggedRequest.Any, R>(
  self: Group<A, R>
): Array<Handler<A, R>> => {
  const children: Array<Handler<A, R>> = []
  function walk(group: Group<A, R>): void {
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i]
      if (TypeId in child) {
        children.push(child as Handler<A, R>)
      } else {
        walk(child as Group<A, R>)
      }
    }
  }
  walk(self)
  return children
}

/**
 * @since 1.0.0
 * @category groups
 */
export const annotateGroup: {
  <I, S>(
    tag: Context.Tag<I, S>,
    value: S
  ): <A extends Schema.TaggedRequest.Any, R>(self: Group<A, R>) => Group<A, R>
  <A extends Schema.TaggedRequest.Any, R, I, S>(
    self: Group<A, R>,
    tag: Context.Tag<I, S>,
    value: S
  ): Group<A, R>
} = dual(3, <A extends Schema.TaggedRequest.Any, R, I, S>(
  self: Group<A, R>,
  tag: Context.Tag<I, S>,
  value: S
): Group<A, R> =>
  makeGroup(
    self.children,
    Context.add(self.annotations, tag, value)
  ))

/**
 * @since 1.0.0
 * @category groups
 */
export const transformChildren: {
  <A extends Schema.TaggedRequest.Any, R, R2>(
    f: (child: Handler<A, R>) => Handler<A, R2>
  ): (self: Group<A, R>) => Group<A, R2>
  <A extends Schema.TaggedRequest.Any, R, R2>(
    self: Group<A, R>,
    f: (child: Handler<A, R>) => Handler<A, R2>
  ): Group<A, R2>
} = dual(2, <A extends Schema.TaggedRequest.Any, R, R2>(
  self: Group<A, R>,
  f: (child: Handler<A, R>) => Handler<A, R2>
): Group<A, R2> => {
  function walk(group: Group<A, R>): Group<A, R2> {
    const children: Array<Handler<A, R2> | Group<A, R2>> = []
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i]
      if (TypeId in child) {
        children.push(f(child))
      } else {
        children.push(walk(child))
      }
    }
    return makeGroup(children, group.annotations)
  }
  return walk(self)
})

/**
 * @since 1.0.0
 * @category groups
 */
export const provideServiceEffect: {
  <I, S, E, R2>(
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): <Reqs extends Schema.TaggedRequest.Any, R>(self: Group<Reqs, R>) => Group<Reqs, Exclude<R, I> | R2>
  <Reqs extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
    self: Group<Reqs, R>,
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): Group<Reqs, Exclude<R, I> | R2>
} = dual(3, <Reqs extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
  self: Group<Reqs, R>,
  tag: Context.Tag<I, S>,
  effect_: Effect.Effect<S, E, R2>
): Group<Reqs, Exclude<R, I> | R2> =>
  transformChildren(
    self,
    (child) =>
      child._tag === "Effect"
        ? effect(
          child.schema,
          (request) => Effect.provideServiceEffect(child.handler(request), tag, Effect.orDie(effect_)) as any
        )
        : stream(
          child.schema as any,
          (request) => Stream.provideServiceEffect(child.handler(request as any), tag, Effect.orDie(effect_))
        ) as any
  ))

/**
 * @since 1.0.0
 * @category groups
 */
export const provideService: {
  <I, S>(
    tag: Context.Tag<I, S>,
    service: S
  ): <Reqs extends Schema.TaggedRequest.Any, R>(self: Group<Reqs, R>) => Group<Reqs, Exclude<R, I>>
  <Reqs extends Schema.TaggedRequest.Any, R, I, S>(
    self: Group<Reqs, R>,
    tag: Context.Tag<I, S>,
    service: S
  ): Group<Reqs, Exclude<R, I>>
} = dual(3, <Reqs extends Schema.TaggedRequest.Any, R, I, S>(
  self: Group<Reqs, R>,
  tag: Context.Tag<I, S>,
  service: S
): Group<Reqs, Exclude<R, I>> =>
  transformChildren(
    self,
    (child) =>
      child._tag === "Effect"
        ? effect(child.schema, (request) => Effect.provideService(child.handler(request), tag, service) as any)
        : stream(
          child.schema as any,
          (request) => Stream.provideService(child.handler(request as any), tag, service)
        ) as any
  ))
