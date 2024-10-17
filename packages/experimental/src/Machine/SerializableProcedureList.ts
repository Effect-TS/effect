/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Schema from "effect/Schema"
import type * as Types from "effect/Types"
import * as Procedure from "./Procedure.js"
import * as ProcedureList from "./ProcedureList.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableProcedureList<
  State,
  Public extends Schema.TaggedRequest.All,
  Private extends Schema.TaggedRequest.All,
  R
> extends Effect.Effect<SerializableProcedureList<State, Public, Private, R>> {
  readonly [ProcedureList.TypeId]: ProcedureList.TypeId
  readonly initialState: State
  readonly public: ReadonlyArray<Procedure.SerializableProcedure<Public, State, R>>
  readonly private: ReadonlyArray<Procedure.SerializableProcedure<Private, State, R>>
  readonly identifier: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <State>(
  initialState: State,
  options?: {
    readonly identifier?: string
  }
) => SerializableProcedureList<State, never, never, never> = ProcedureList.make as any

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R2
  >(
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: SerializableProcedureList<State, Public, Private, R>
  ) => SerializableProcedureList<
    State,
    Req | Public,
    Private,
    R | R2 | Schema.SerializableWithResult.Context<Req>
  >
  <
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R,
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    R2
  >(
    self: SerializableProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): SerializableProcedureList<State, Req | Public, Private, R | R2 | Schema.SerializableWithResult.Context<Req>>
} = dual(
  3,
  <
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R,
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    R2
  >(
    self: SerializableProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): SerializableProcedureList<
    State,
    Req | Public,
    Private,
    R | R2 | Schema.SerializableWithResult.Context<Req>
  > => ProcedureList.addProcedure(self, Procedure.makeSerializable<any, any>()(schema, handler)) as any
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const addPrivate: {
  <
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R2
  >(
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: SerializableProcedureList<State, Public, Private, R>
  ) => SerializableProcedureList<
    State,
    Public,
    Private | Req,
    R | R2 | Schema.SerializableWithResult.Context<Req>
  >
  <
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R,
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    R2
  >(
    self: SerializableProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): SerializableProcedureList<State, Public, Private | Req, R | R2 | Schema.SerializableWithResult.Context<Req>>
} = dual(
  3,
  <
    State,
    Public extends Schema.TaggedRequest.All,
    Private extends Schema.TaggedRequest.All,
    R,
    Req extends Schema.TaggedRequest.All,
    I,
    ReqR,
    R2
  >(
    self: SerializableProcedureList<State, Public, Private, R>,
    schema: Schema.Schema<Req, I, ReqR> & { readonly _tag: Req["_tag"] },
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): SerializableProcedureList<
    State,
    Public,
    Private | Req,
    R | R2 | Schema.SerializableWithResult.Context<Req>
  > => ProcedureList.addProcedurePrivate(self, Procedure.makeSerializable<any, any>()(schema, handler)) as any
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState: {
  <State>(
    initialState: Types.NoInfer<State>
  ): <Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, R>(
    self: SerializableProcedureList<State, Public, Private, R>
  ) => SerializableProcedureList<State, Public, Private, R>
  <State, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, R>(
    self: SerializableProcedureList<State, Public, Private, R>,
    initialState: Types.NoInfer<State>
  ): SerializableProcedureList<State, Public, Private, R>
} = ProcedureList.withInitialState as any
