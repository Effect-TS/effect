/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import type * as Types from "effect/Types"
import * as Procedure from "./Procedure.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/experimental/Machine/ProcedureList")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ProcedureList<State, Request extends Schema.TaggedRequest.Any, R>
  extends Effect.Effect<ProcedureList<State, Request, R>>
{
  readonly [TypeId]: TypeId
  readonly initialState: State
  readonly procedures: ReadonlyArray<Procedure.Procedure<Request, State, R>>
  readonly internalTags: ReadonlyArray<string>
  readonly identifier: string
}

const Proto = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId,
  commit() {
    return Effect.succeed(this)
  }
}

const makeProto = <State, Request extends Schema.TaggedRequest.Any, R>(options: {
  readonly initialState: State
  readonly procedures: ReadonlyArray<Procedure.Procedure<Request, State, R>>
  readonly internalTags: ReadonlyArray<string>
  readonly identifier: string
}): ProcedureList<State, Request, R> => ({
  __proto__: Proto,
  initialState: options.initialState,
  procedures: options.procedures,
  internalTags: options.internalTags,
  identifier: options.identifier
} as any)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <State>(initialState: State, identifier?: string): ProcedureList<State, never, never> =>
  makeProto({
    initialState,
    procedures: [],
    internalTags: [],
    identifier: identifier ?? "Unknown"
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <Req extends Schema.TaggedRequest.Any, I, ReqR, State, Requests extends Schema.TaggedRequest.Any, R2>(
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Requests>, R2>
  ): <R>(
    self: ProcedureList<State, Requests, R>
  ) => ProcedureList<State, Req | Requests, R | R2 | Serializable.SerializableWithResult.Context<Req>>
  <State, Requests extends Schema.TaggedRequest.Any, R, Req extends Schema.TaggedRequest.Any, I, ReqR, R2>(
    self: ProcedureList<State, Requests, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Requests>, R2>
  ): ProcedureList<State, Req | Requests, R | R2 | Serializable.SerializableWithResult.Context<Req>>
} = dual(
  4,
  <State, Requests extends Schema.TaggedRequest.Any, R, Req extends Schema.TaggedRequest.Any, I, ReqR, R2>(
    self: ProcedureList<State, Requests, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, State, Requests, R2>
  ): ProcedureList<State, Req | Requests, R | R2> =>
    makeProto({
      ...self,
      procedures: [...self.procedures, Procedure.make<any, any>()(schema, tag, handler)] as any
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const markInternal: {
  <Requests extends Schema.TaggedRequest.Any, const Tags extends ReadonlyArray<Requests["_tag"]>>(
    ...tags: Tags
  ): <State, R>(
    self: ProcedureList<State, Requests, R>
  ) => ProcedureList<State, Exclude<Requests, { readonly _tag: Tags[number] }>, R>
  <State, Requests extends Schema.TaggedRequest.Any, R, const Tags extends ReadonlyArray<Requests["_tag"]>>(
    self: ProcedureList<State, Requests, R>,
    ...tags: Tags
  ): ProcedureList<State, Exclude<Requests, { readonly _tag: Tags[number] }>, R>
} = dual(
  (args) => Predicate.hasProperty(args[0], TypeId),
  <State, Requests extends Schema.TaggedRequest.Any, R, const Tags extends ReadonlyArray<Requests["_tag"]>>(
    self: ProcedureList<State, Requests, R>,
    ...tags: Tags
  ): ProcedureList<State, Exclude<Requests, { readonly _tag: Tags[number] }>, R> =>
    makeProto({ ...self, internalTags: [...self.internalTags, ...tags] } as any)
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState: {
  <State>(initialState: Types.NoInfer<State>): <Requests extends Schema.TaggedRequest.Any, R>(
    self: ProcedureList<State, Requests, R>
  ) => ProcedureList<State, Requests, R>
  <State, Requests extends Schema.TaggedRequest.Any, R>(
    self: ProcedureList<State, Requests, R>,
    initialState: Types.NoInfer<State>
  ): ProcedureList<State, Requests, R>
} = dual(2, <State, Requests extends Schema.TaggedRequest.Any, R>(
  self: ProcedureList<State, Requests, R>,
  initialState: Types.NoInfer<State>
): ProcedureList<State, Requests, R> => makeProto({ ...self, initialState }))
