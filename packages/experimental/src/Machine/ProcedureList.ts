/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import type * as Types from "effect/Types"
import * as Procedure from "./Procedure.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/experimental/Machine/ProcedureList")

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
  Public extends Procedure.TaggedRequest.Any,
  Private extends Procedure.TaggedRequest.Any,
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

const makeProto = <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(
  options: {
    readonly initialState: State
    readonly public: ReadonlyArray<Procedure.Procedure<Public, State, R>>
    readonly private: ReadonlyArray<Procedure.Procedure<Private, State, R>>
    readonly identifier: string
  }
): ProcedureList<State, Public, Private, R> => Object.assign(Object.create(Proto), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <State>(initialState: State, options?: {
  readonly identifier?: string
}): ProcedureList<State, never, never, never> =>
  makeProto({
    initialState,
    public: [],
    private: [],
    identifier: options?.identifier ?? "Unknown"
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const addProcedure: {
  <
    Req extends Procedure.TaggedRequest.Any,
    State,
    R2
  >(
    procedure: Procedure.Procedure<Req, State, R2>
  ): <
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R
  >(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Req | Public, Private, R | R2>
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    Req extends Procedure.TaggedRequest.Any,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    procedure: Procedure.Procedure<Req, State, R2>
  ): ProcedureList<State, Req | Public, Private, R | R2>
} = dual(
  2,
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    Req extends Procedure.TaggedRequest.Any,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    procedure: Procedure.Procedure<Req, State, R2>
  ): ProcedureList<State, Req | Public, Private, R | R2> =>
    makeProto({
      ...self,
      public: [...self.public, procedure] as any
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const addProcedurePrivate: {
  <
    Req extends Procedure.TaggedRequest.Any,
    State,
    R2
  >(
    procedure: Procedure.Procedure<Req, State, R2>
  ): <
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R
  >(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Public, Private | Req, R | R2>
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    Req extends Procedure.TaggedRequest.Any,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    procedure: Procedure.Procedure<Req, State, R2>
  ): ProcedureList<State, Public, Private | Req, R | R2>
} = dual(
  2,
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    Req extends Procedure.TaggedRequest.Any,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    procedure: Procedure.Procedure<Req, State, R2>
  ): ProcedureList<State, Public, Private | Req, R | R2> =>
    makeProto({
      ...self,
      private: [...self.private, procedure] as any
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const add = <Req extends Procedure.TaggedRequest.Any>(): {
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R2
  >(
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Req | Public, Private, R | R2>
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Req | Public, Private, R | R2>
} =>
  dual(
    3,
    <
      State,
      Public extends Procedure.TaggedRequest.Any,
      Private extends Procedure.TaggedRequest.Any,
      R,
      R2
    >(
      self: ProcedureList<State, Public, Private, R>,
      tag: Req["_tag"],
      handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
    ): ProcedureList<State, Req | Public, Private, R | R2> =>
      addProcedure(self, Procedure.make<any, any>()<Req>()(tag, handler))
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const addPrivate = <Req extends Procedure.TaggedRequest.Any>(): {
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R2
  >(
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): <R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Public, Private | Req, R | R2>
  <
    State,
    Public extends Procedure.TaggedRequest.Any,
    Private extends Procedure.TaggedRequest.Any,
    R,
    R2
  >(
    self: ProcedureList<State, Public, Private, R>,
    tag: Req["_tag"],
    handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
  ): ProcedureList<State, Public, Private | Req, R | R2>
} =>
  dual(
    3,
    <
      State,
      Public extends Procedure.TaggedRequest.Any,
      Private extends Procedure.TaggedRequest.Any,
      R,
      R2
    >(
      self: ProcedureList<State, Public, Private, R>,
      tag: Req["_tag"],
      handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>
    ): ProcedureList<State, Public, Private | Req, R | R2> =>
      addProcedurePrivate(self, Procedure.make<any, any>()<Req>()(tag, handler))
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState: {
  <State>(
    initialState: Types.NoInfer<State>
  ): <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(
    self: ProcedureList<State, Public, Private, R>
  ) => ProcedureList<State, Public, Private, R>
  <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(
    self: ProcedureList<State, Public, Private, R>,
    initialState: Types.NoInfer<State>
  ): ProcedureList<State, Public, Private, R>
} = dual(2, <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(
  self: ProcedureList<State, Public, Private, R>,
  initialState: Types.NoInfer<State>
): ProcedureList<State, Public, Private, R> => makeProto({ ...self, initialState }))
