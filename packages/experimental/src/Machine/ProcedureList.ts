/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
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
export interface ProcedureList<
  State,
  Public extends Schema.TaggedRequest.Any,
  Private extends Schema.TaggedRequest.Any,
  R
> extends Effect.Effect<ProcedureList<State, Public, Private, R>> {
  readonly [TypeId]: TypeId
  readonly initialState: State
  readonly public: ReadonlyArray<Procedure.Procedure<Public, State, R>>
  readonly private: ReadonlyArray<Procedure.Procedure<Private, State, R>>
  readonly identifier: string
}

const Proto = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId,
  commit() {
    return Effect.succeed(this)
  }
}

const makeProto = <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
  options: {
    readonly initialState: State
    readonly public: ReadonlyArray<Procedure.Procedure<Public, State, R>>
    readonly private: ReadonlyArray<Procedure.Procedure<Private, State, R>>
    readonly identifier: string
  }
): ProcedureList<State, Public, Private, R> => ({
  __proto__: Proto,
  initialState: options.initialState,
  public: options.public,
  private: options.private,
  identifier: options.identifier
} as any)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <State>(initialState: State, identifier?: string): ProcedureList<State, never, never, never> =>
  makeProto({
    initialState,
    public: [],
    private: [],
    identifier: identifier ?? "Unknown"
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R2
  >(
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Req | Public, Private, R | R2 | Serializable.SerializableWithResult.Context<Req>>
  <
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Req | Public, Private, R | R2 | Serializable.SerializableWithResult.Context<Req>>
} = dual(
  4,
  <
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Req | Public, Private, R | R2 | Serializable.SerializableWithResult.Context<Req>> =>
    makeProto({
      ...self,
      public: [...self.public, Procedure.make<any, any>()(schema, tag, handler)] as any
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const addPrivate: {
  <
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R2
  >(
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Public, Private | Req, R | R2 | Serializable.SerializableWithResult.Context<Req>>
  <
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Public, Private | Req, R | R2 | Serializable.SerializableWithResult.Context<Req>>
} = dual(
  4,
  <
    State,
    Public extends Schema.TaggedRequest.Any,
    Private extends Schema.TaggedRequest.Any,
    R,
    Req extends Schema.TaggedRequest.Any,
    I,
    ReqR,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Public, Private | Req, R | R2 | Serializable.SerializableWithResult.Context<Req>> =>
    makeProto({
      ...self,
      private: [...self.private, Procedure.make<any, any>()(schema, tag, handler)] as any
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState: {
  <State>(
    initialState: Types.NoInfer<State>
  ): <Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Public, Private, R>
  <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
    self: ProcedureList<State, Public, Private, R>,
    initialState: Types.NoInfer<State>
  ): ProcedureList<State, Public, Private, R>
} = dual(2, <State, Public extends Schema.TaggedRequest.Any, Private extends Schema.TaggedRequest.Any, R>(
  self: ProcedureList<State, Public, Private, R>,
  initialState: Types.NoInfer<State>
): ProcedureList<State, Public, Private, R> => makeProto({ ...self, initialState }))
