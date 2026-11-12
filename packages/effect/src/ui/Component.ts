/**
 * A component is a value: Schemas for its props, Model, messages and events,
 * plus pure `init`, `update` and `view` functions.
 *
 * `update` returns the next Model, or a step that also runs Commands and
 * emits to the parent. The runtime holds each instance's Model, runs its
 * Commands in the instance's own Scope, and re-renders its view. Children are
 * declared in the view with `h.child`, and communicate up through `events` and
 * down through props. A component's requirements, `R`, name the Commands and
 * feature services it uses, never what their implementations use.
 *
 * **Example** (A todo row that saves through a Command and reports to its parent)
 *
 * ```ts import.meta.vitest
 * import { Command, Component } from "effect/ui"
 * import { Effect, Schema } from "effect"
 *
 * const Todo = Schema.Struct({ id: Schema.String, title: Schema.String, done: Schema.Boolean })
 * const TodoItemMessage = Schema.TaggedUnion({ Toggle: {}, Save: {}, Saved: {} })
 * const TodoItemEvents = Schema.TaggedUnion({ Toggled: { done: Schema.Boolean } })
 *
 * class SaveTodo extends Command.Service<SaveTodo>()(
 *   "todos/SaveTodo",
 *   { args: Todo, invalidates: () => [] },
 *   Effect.succeed(() => Effect.succeed(TodoItemMessage.make({ _tag: "Saved" })))
 * ) {}
 *
 * const TodoItem = Component.make({
 *   name: "TodoItem",
 *   props: Schema.Struct({ todo: Todo }),
 *   model: Schema.Struct({}),
 *   message: TodoItemMessage,
 *   events: TodoItemEvents,
 *   init: ($) => $.set({}),
 *   update: (model, message, $) =>
 *     TodoItemMessage.match(message, {
 *       Toggle: () => $.emit(TodoItemEvents.make({ _tag: "Toggled", done: !$.props.todo.done })),
 *       Save: () => $.run(SaveTodo.make($.props.todo)),
 *       Saved: () => model
 *     }),
 *   // `h.isRunning` is true from the Save until its message has been handled.
 *   view: (_, h) =>
 *     h.el(
 *       "li",
 *       h.el("button", h.props.todo.done ? "[x]" : "[ ]").on("click", TodoItemMessage.make({ _tag: "Toggle" })),
 *       h.el("span", h.props.todo.title),
 *       h.isRunning(SaveTodo) ? " saving" : ""
 *     )
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Duration from "../Duration.ts"
import * as Layer from "../Layer.ts"
import type * as Option from "../Option.ts"
import * as Pipeable from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import type * as AsyncResult from "../reactivity/AsyncResult.ts"
import type * as Loader from "../reactivity/Loader.ts"
import * as Schema from "../Schema.ts"
import type * as Types from "../Types.ts"
import type * as Command from "./Command.ts"
import type * as Head from "./Head.ts"
import * as loaders from "./internal/loaders.ts"
import type * as Subscription from "./Subscription.ts"
import * as View from "./View.ts"

/**
 * Identifies a component.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const TypeId = "~effect/ui/Component" as const

/**
 * Identifies a component.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type TypeId = typeof TypeId

/**
 * Identifies a step.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const StepTypeId = "~effect/ui/Component/Step" as const

/**
 * Identifies a step.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type StepTypeId = typeof StepTypeId

/**
 * What the runtime reads after `init` or `update`: the next Model, the
 * Commands to run and what to emit to the parent.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Next<out Model, out Msg, out Events, out R = never> {
  readonly model: Model
  readonly commands: ReadonlyArray<Command.Command<Msg, R>>
  readonly events: ReadonlyArray<Events>
  /** The load mores and resets of list fields `update` issued, in order. */
  readonly lists?: ReadonlyArray<ListIssue> | undefined
}

/**
 * A `$.loadMore(field)` or `$.reset(field)` an `update` issued.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ListIssue {
  readonly field: string
  readonly op: "loadMore" | "reset"
}

/**
 * What `$.set` in `init` returns: a step without `loadMore` and `reset`,
 * which `init` can't issue.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface InitStep<in out Model, in out Msg, in out Events, out R = never> extends Pipeable.Pipeable {
  readonly [StepTypeId]: StepTypeId
  readonly model: Model
  readonly commands: ReadonlyArray<Command.Command<Msg, R>>
  readonly emitted: ReadonlyArray<Events>
  /** Replaces the Model. */
  set(model: Model): InitStep<Model, Msg, Events, R>
  /** Changes the Model with a function of the current one. */
  modify(f: (model: Model) => Model): InitStep<Model, Msg, Events, R>
  /** Runs Commands in this instance's Scope, as `Step.run` does. */
  run<const C extends ReadonlyArray<Command.Command<Msg, any>>>(
    ...commands: C
  ): InitStep<Model, Msg, Events, R | Command.Requirements<C[number]>>
  /** Reports to the parent. */
  emit(...emitted: ReadonlyArray<Events>): InitStep<Model, Msg, Events, R>
}

/**
 * An immutable builder for what `init` and `update` return.
 *
 * **Details**
 *
 * Every method returns a new step, so `update` stays pure and a story test can
 * read the result. `set` replaces the Model and doesn't merge. `run` collects
 * the Commands' requirements into `R`, one Command at a time, so two Commands
 * with different requirements give the union. Returning a bare Model from
 * `update` is also fine.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Step<in out Model, in out Msg, in out Events, out R = never> extends InitStep<Model, Msg, Events, R> {
  /** The load mores and resets issued, in order. */
  readonly lists: ReadonlyArray<ListIssue>
  /** Replaces the Model. */
  set(model: Model): Step<Model, Msg, Events, R>
  /** Changes the Model with a function of the current one. */
  modify(f: (model: Model) => Model): Step<Model, Msg, Events, R>
  /**
   * Runs Commands in this instance's Scope. Their results come back as
   * messages, so a Command whose result isn't this component's message is
   * rejected.
   */
  run<const C extends ReadonlyArray<Command.Command<Msg, any>>>(
    ...commands: C
  ): Step<Model, Msg, Events, R | Command.Requirements<C[number]>>
  /** Reports to the parent. */
  emit(...emitted: ReadonlyArray<Events>): Step<Model, Msg, Events, R>
  /**
   * Loads the next page of a list field. The runtime takes the args from the
   * field's loader, after this `update`'s Model. The page arrives through the
   * watch, and nothing is issued for a disabled field.
   */
  loadMore(field: ListFields<Model>): Step<Model, Msg, Events, R>
  /**
   * Drops a list field's pages after the first, then refetches it. Every held
   * page is saved in `history.state` on navigation, so this is how a long
   * list keeps that small.
   */
  reset(field: ListFields<Model>): Step<Model, Msg, Events, R>
}

/**
 * `$` in `update`: a step holding the current Model, plus the current props.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Update<in out Model, in out Msg, in out Events, out Props> extends Step<Model, Msg, Events, never> {
  readonly props: Props
}

/**
 * `$` in `init`: there's no Model yet, so `set` comes first.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Init<in out Model, in out Msg, in out Events, out Props> {
  readonly props: Props
  /**
   * An empty snapshot per loader field of the Model, for `init` to spread
   * into the first Model. `{}` for a Model with no loader field.
   */
  readonly empty: Empty<Model>
  /** Sets the first Model. */
  set(model: Model): InitStep<Model, Msg, Events, never>
}

/**
 * The requirements of a step, or `never` for a bare Model.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type StepRequirements<U> = U extends InitStep<infer _Model, infer _Msg, infer _Events, infer R> ? R : never

const StepProto = {
  [StepTypeId]: StepTypeId,
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  },
  set(this: Step<any, any, any, any>, model: unknown) {
    return makeStep(model, this.commands, this.emitted, this.lists)
  },
  modify(this: Step<any, any, any, any>, f: (model: any) => any) {
    return makeStep(f(this.model), this.commands, this.emitted, this.lists)
  },
  run(this: Step<any, any, any, any>, ...commands: ReadonlyArray<Command.Command<any, any>>) {
    return makeStep(this.model, [...this.commands, ...commands], this.emitted, this.lists)
  },
  emit(this: Step<any, any, any, any>, ...emitted: ReadonlyArray<unknown>) {
    return makeStep(this.model, this.commands, [...this.emitted, ...emitted], this.lists)
  },
  loadMore(this: Step<any, any, any, any>, field: string) {
    return makeStep(this.model, this.commands, this.emitted, [...this.lists, { field, op: "loadMore" }])
  },
  reset(this: Step<any, any, any, any>, field: string) {
    return makeStep(this.model, this.commands, this.emitted, [...this.lists, { field, op: "reset" }])
  }
}

const makeStep = (
  model: unknown,
  commands: ReadonlyArray<Command.Command<any, any>>,
  emitted: ReadonlyArray<unknown>,
  lists: ReadonlyArray<ListIssue>
): Step<any, any, any, any> => Object.assign(Object.create(StepProto), { model, commands, emitted, lists })

const makeUpdate = (model: unknown, props: unknown): Update<any, any, any, any> =>
  Object.assign(Object.create(StepProto), { model, commands: [], emitted: [], lists: [], props })

const makeInit = (props: unknown, empty: object): Init<any, any, any, any> => ({
  props,
  empty,
  set: (model) => makeStep(model, [], [], []) as Step<any, any, any, never>
})

/**
 * Returns `true` if `u` is a step.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isStep = (u: unknown): u is InitStep<unknown, unknown, unknown, unknown> =>
  Predicate.hasProperty(u, StepTypeId)

const toNext = (result: unknown): Next<any, any, any, any> =>
  isStep(result)
    ? {
      model: result.model,
      commands: result.commands,
      events: result.emitted,
      lists: (result as Step<any, any, any>).lists
    }
    : { model: result, commands: [], events: [] }

/**
 * What a parent needs from a child: its props and events contract and its
 * requirements. Model and message are the child's business and are erased.
 *
 * **Details**
 *
 * A component with `message: Schema.Never` is a valid child, because
 * `update` takes `msg: never`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Mountable<in out Props, out Events, out R = never> extends Pipeable.Pipeable {
  readonly [TypeId]: Mountable.Variance<Props, Events, R>
  readonly name: string
  readonly props: Schema.Codec<Props, any>
  readonly model: Schema.Codec<any, any>
  readonly message: Schema.Codec<any, any>
  readonly events: Schema.Codec<Events, any>
  readonly init: (props: Props) => Next<any, any, Events, R>
  readonly update: (model: any, msg: never, props: Props) => Next<any, any, Events, R>
  /** `running` answers `h.isRunning` for the instance being rendered. Without it nothing is running. */
  readonly view: (
    model: any,
    props: Props,
    running?: ((name: string, groupKey: string | undefined) => boolean) | undefined
  ) => View.Node<any, R>
  readonly subscriptions: ((model: any, props: Props) => ReadonlyArray<Subscription.Subscription<any, R>>) | undefined
  /** The instance's document head entries, a pure function of its Model. */
  readonly head: ((model: any) => ReadonlyArray<Head.Entry>) | undefined
  /** The component's vocabulary: its `elements` override, else the registered one. Read lazily. */
  readonly elements: () => View.Vocabulary<any> | undefined
  /** Set by `provide`: the Layer built for each instance, in its Scope. Descendants inherit its services. */
  readonly layer: ((props: Props) => Layer.Layer<any, any, any>) | undefined
  /** Set by `provide`: maps a provided Layer's failure to one of this component's messages. */
  readonly layerFailure: ((failure: AsyncResult.Failure<never, any>) => any) | undefined
  /** Set by `provide` when every provided Layer is a value: shared by every instance resolving from one Env. */
  readonly sharedLayer: Layer.Layer<any, any, any> | undefined
  /** `false` when a `provide` opted out of the server: the server never builds the Layer and defers the instance. */
  readonly layerOnServer: boolean
  /** The Model's loader fields bound to `loaders`, read by the runtime and `Story`. `undefined` without any. */
  readonly "~loaders": unknown
}

/**
 * Helper types for `Mountable`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Mountable {
  /**
   * Phantom variance for a component's props, events and requirements.
   *
   * @category models
   * @since 4.1.5
   */
  export interface Variance<in out Props, out Events, out R> {
    readonly _Props: Types.Invariant<Props>
    readonly _Events: Types.Covariant<Events>
    readonly _R: Types.Covariant<R>
  }
}

/**
 * A component definition.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Component<
  out Name extends string,
  in out Props,
  in out Model,
  in out Msg,
  out Events,
  out R = never,
  out V extends View.Elements = never
> extends Mountable<Props, Events, R> {
  readonly name: Name
  readonly model: Schema.Codec<Model, any>
  readonly message: Schema.Codec<Msg, any>
  readonly init: (props: Props) => Next<Model, Msg, Events, R>
  readonly update: (model: Model, msg: Msg, props: Props) => Next<Model, Msg, Events, R>
  readonly view: (
    model: Model,
    props: Props,
    running?: ((name: string, groupKey: string | undefined) => boolean) | undefined
  ) => View.Node<Msg, R>
  readonly subscriptions: ((model: Model, props: Props) => ReadonlyArray<Subscription.Subscription<Msg, R>>) | undefined
  readonly head: ((model: Model) => ReadonlyArray<Head.Entry>) | undefined
  readonly layerFailure: ((failure: AsyncResult.Failure<never, any>) => Msg) | undefined
  readonly "~V"?: V
}

/**
 * What `h` gains in `view` for a Model with loader fields: `loaded`,
 * `previous` and `patched`. `previous` and `patched` have no keyed field.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoaderHelpers<Model> = [LoaderFields<Model>] extends [never] ? {} : {
  readonly loaded: Loaded<Model>
  readonly previous: Previous<Model>
  readonly patched: Patched<Model>
}

/**
 * Any component.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Any = Mountable<any, any, any>

/**
 * The props of a component.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Props<C> = C extends Mountable<infer P, infer _Events, infer _R> ? P : never

/**
 * The events of a component.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Events<C> = C extends Mountable<infer _Props, infer E, infer _R> ? E : never

/**
 * The requirements of a component: the Commands and feature services it uses.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Requirements<C> = C extends Mountable<infer _Props, infer _Events, infer R> ? R : never

/**
 * The Model of a component.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Model<C> = C extends Component<infer _N, infer _P, infer M, infer _Msg, infer _E, infer _R, infer _V> ? M
  : never

/**
 * The message type of a component.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Message<C> = C extends Component<infer _N, infer _P, infer _M, infer Msg, infer _E, infer _R, infer _V> ?
  Msg
  : never

/**
 * The loader fields of a Model: its top-level fields that hold a
 * `Loader.Snapshot` or a `Loader.SnapshotMap`. Each one has a loader.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoaderFields<Model> = LoaderKey<
  Model,
  Loader.Snapshot<any, any> | Loader.SnapshotMap<any, any> | Loader.SnapshotList<any, any>
>

/**
 * The single loader fields of a Model: those that hold a `Loader.Snapshot`
 * or a `Loader.SnapshotList`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type SingleFields<Model> = LoaderKey<Model, Loader.Snapshot<any, any> | Loader.SnapshotList<any, any>>

/**
 * The list fields of a Model: those that hold a `Loader.SnapshotList`.
 * `$.loadMore` and `$.reset` take one.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ListFields<Model> = LoaderKey<Model, Loader.SnapshotList<any, any>>

/**
 * The keyed loader fields of a Model: those that hold a
 * `Loader.SnapshotMap`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type KeyedFields<Model> = LoaderKey<Model, Loader.SnapshotMap<any, any>>

// Not a mapped type over `keyof Model`: that one is homomorphic, so a primitive or array Model maps to itself.
type LoaderKey<Model, S, K extends keyof Model = keyof Model & string> = [Model] extends [object] ?
  K extends unknown ? Model[K] extends S ? K : never : never
  : never

/**
 * The read of a snapshot type, single or keyed.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ReadOf<S> = S extends Loader.Snapshot<infer R, any> ? R
  : S extends Loader.SnapshotMap<infer R, any> ? R
  : S extends Loader.SnapshotList<infer R, any> ? R
  : never

/**
 * The result a loader field opens to: an `AsyncResult` of its read's success
 * and error.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ResultOf<S> = AsyncResult.AsyncResult<Loader.Read.Success<ReadOf<S>>, Loader.Read.Error<ReadOf<S>>>

/**
 * The services a Model's loaders add to a component's requirements: the reads
 * themselves, never what their fetchers use.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoaderServices<Model> = ServiceOf<ReadOf<Model[LoaderFields<Model>]>>

type ServiceOf<R> = R extends { readonly Identifier: infer Self } ? Self : never

/**
 * `$.empty` in `init`: an empty snapshot per loader field.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Empty<Model> = { readonly [K in LoaderFields<Model>]: Model[K] }

/**
 * `h.loaded` in `view`, and `loaded` in a loader: per single loader field,
 * the stored result when the snapshot was taken at the loader's current args,
 * and otherwise `Initial`, waiting while the loader is enabled. A keyed
 * field opens to its entries in the loader's order.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Loaded<Model> = {
  readonly [K in LoaderFields<Model>]: Model[K] extends Loader.SnapshotMap<any, any> ? KeyedLoaded<ReadOf<Model[K]>>
    : Model[K] extends Loader.SnapshotList<infer R, any> ? AsyncResult.AsyncResult<LoadedList<R>, Loader.Read.Error<R>>
    : ResultOf<Model[K]>
}

/**
 * A list field as `h.loaded` opens it, inside its `AsyncResult`.
 *
 * **Details**
 *
 * `items` flattens the patched pages, keeping the first item for each
 * definition `key`. `pages` is the page array. `more` is `Loading` while a
 * load more runs or is queued, and `Failed` with the last load-more error.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LoadedList<R extends Loader.ListRead.Any> {
  readonly items: ReadonlyArray<Loader.ListRead.Item<R>>
  readonly pages: ReadonlyArray<Loader.ListRead.Page<R>>
  readonly more: Loader.More<Loader.Read.Error<R>>
}

/**
 * One entry of a keyed field as `h.loaded` opens it: the args from the
 * loader, the opened result and whether the value includes an unconfirmed
 * patch.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface KeyedEntry<R extends Loader.Read.Any> {
  readonly args: Loader.Read.Args<R>
  readonly result: AsyncResult.AsyncResult<Loader.Read.Success<R>, Loader.Read.Error<R>>
  readonly patched: boolean
}

/**
 * A keyed field as `h.loaded` opens it: an entry per unique args the loader
 * returns, in its order, and `get` to find one entry by its args.
 *
 * **Details**
 *
 * A key the field holds no settled result for opens as `Initial`, waiting.
 * `get` is `None` for args the loader doesn't currently return. Entries
 * carry no key: write each row's `.key(...)` by hand.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface KeyedLoaded<R extends Loader.Read.Any> extends ReadonlyArray<KeyedEntry<R>> {
  readonly get: (args: Loader.Read.Args<R>) => Option.Option<KeyedEntry<R>>
}

/**
 * One key of a keyed field whose result changed, as a watch handler gets it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface KeyedChange<R extends Loader.Read.Any> {
  readonly args: Loader.Read.Args<R>
  readonly result: AsyncResult.AsyncResult<Loader.Read.Success<R>, Loader.Read.Error<R>>
}

/**
 * `h.previous` in `view`: per loader field, the Success value the snapshot
 * holds for args other than the loader's current ones. `Some` only while the
 * loader is enabled, so it is `None` whenever `h.loaded` has the stored
 * result.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Previous<Model> = {
  readonly [K in SingleFields<Model>]: Model[K] extends Loader.SnapshotList<infer R, any>
    ? Option.Option<Omit<LoadedList<R>, "more">>
    : Option.Option<Loader.Read.Success<ReadOf<Model[K]>>>
}

/**
 * `h.patched` in `view`: per loader field, whether the value includes an
 * optimistic patch the server hasn't confirmed. It is per entry, not per
 * instance.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Patched<Model> = { readonly [K in SingleFields<Model>]: boolean }

/**
 * The `loaders` of `make`: per single loader field, the args of its read, or
 * `undefined` to disable it, and per keyed field an array of args, empty to
 * watch nothing. `loaded` is `h.loaded` without the field's own entry, for a
 * read whose args depend on another read's result.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Loaders<Model, Props> = {
  readonly [K in LoaderFields<Model>]: (
    model: Model,
    props: Props,
    loaded: Omit<Loaded<Model>, K>
  ) => Model[K] extends Loader.SnapshotMap<any, any> ? ReadonlyArray<Loader.Read.Args<ReadOf<Model[K]>>>
    : Loader.Read.Args<ReadOf<Model[K]>> | undefined
}

/**
 * Wraps a loader of `loaders` so that a fetch for its changed args waits
 * `duration` on the Clock.
 *
 * **When to use**
 *
 * Use when a loader's args change in bursts, such as a search box's text,
 * so only the args that hold still are fetched.
 *
 * **Details**
 *
 * Only a fetch waits: the first args at mount, the server render, args whose
 * cache entry is fresh or already being fetched, and a change to `undefined`
 * go through at once. While the fetch waits, `h.loaded` is `Initial`,
 * waiting, and `h.previous` holds the last value. Args that change again
 * during the wait restart it, so only the last args are fetched. Unmounting
 * cancels the wait. A keyed field's new keys wait each on their own.
 *
 * Args that change while their fetch runs interrupt it, and nothing is
 * stored for them, unless another loader still watches the entry or a `get`
 * or a prefetch joined the fetch.
 *
 * **Example** (A search that fetches once the query holds still)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { AsyncResult, Loader } from "effect/reactivity"
 * import { Component } from "effect/ui"
 *
 * class Search extends Loader.Service<Search>()(
 *   "Search",
 *   { args: { q: Schema.String }, success: Schema.Array(Schema.String), error: Schema.Never, staleTime: "1 minute" },
 *   Effect.succeed(({ q }) => Effect.succeed([q]))
 * ) {}
 *
 * const SearchMessage = Schema.TaggedUnion({ Results: { results: Loader.Snapshot(Search, "results") } })
 *
 * const SearchPage = Component.make({
 *   name: "SearchPage",
 *   props: Schema.Struct({ q: Schema.String }),
 *   model: Schema.Struct({ results: Loader.Snapshot(Search, "results") }),
 *   message: SearchMessage,
 *   loaders: {
 *     results: Component.debounce("300 millis", (_model, props) => ({ q: props.q }))
 *   },
 *   init: ($) => $.empty,
 *   update: (_model, message) => ({ results: message.results }),
 *   subscriptions: (_model, _props, $) => [
 *     $.watch({ results: (results) => SearchMessage.make({ _tag: "Results", results }) })
 *   ],
 *   view: (_model, h) =>
 *     h.el("ul", AsyncResult.getOrElse(h.loaded.results, () => []).map((result) => h.el("li", result)))
 * })
 * ```
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.5
 */
export const debounce = <Model, Props, Loaded, A>(
  duration: Duration.Input,
  f: (model: Model, props: Props, loaded: Loaded) => A
): (model: Model, props: Props, loaded: Loaded) => A => loaders.debounce(Duration.toMillis(duration), f)

/**
 * Identifies the Subscription `$.watch` returns.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const WatchTypeId = "~effect/ui/Component/Watch" as const

/**
 * Identifies the Subscription `$.watch` returns.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type WatchTypeId = typeof WatchTypeId

/**
 * The Subscription `$.watch` returns: every loader field of the Model is
 * watched. `subscriptions` must start with it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Watches<in out Model, out Msg> extends Subscription.Subscription<Msg, LoaderServices<Model>> {
  readonly [WatchTypeId]: Types.Invariant<Model>
}

/**
 * `$.watch` in `subscriptions`: takes one handler per loader field. A
 * single field's handler gets the snapshot to store and the result it was
 * built from. A keyed field's gets the collection to store, the entries it
 * opens to, and the keys whose result changed since its last message, which
 * are none for a message that only prunes removed keys.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Watch<Model, Msg> = (
  handlers: {
    readonly [K in LoaderFields<Model>]: Model[K] extends Loader.SnapshotMap<any, any> ? (
        snapshots: Model[K],
        loaded: KeyedLoaded<ReadOf<Model[K]>>,
        changes: ReadonlyArray<KeyedChange<ReadOf<Model[K]>>>
      ) => Msg
      : Model[K] extends Loader.SnapshotList<infer R, any>
        ? (snapshot: Model[K], loaded: AsyncResult.AsyncResult<LoadedList<R>, Loader.Read.Error<R>>) => Msg
      : (snapshot: Model[K], result: ResultOf<Model[K]>) => Msg
  }
) => Watches<Model, Msg>

/**
 * `$` in `subscriptions`, for a component whose Model has loader fields.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Subscriptions<in out Model, in out Msg> {
  /** Watches every loader field of the Model: one handler per field. */
  readonly watch: Watch<Model, Msg>
}

/**
 * Returns `true` if `u` is a component.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isComponent = (u: unknown): u is Any => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: { _Props: (_: never) => _, _Events: (_: never) => _, _R: (_: never) => _ },
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  }
}

/**
 * Defines a component.
 *
 * **Details**
 *
 * `init` and `update` get `$`, a step holding the current Model and props.
 * `view` gets `h`, bound to the component's message type and carrying the
 * props, with the registered vocabulary's element names mixed in. The whole
 * return type of `init`, `update` and `view` is inferred and `R` is read off
 * it, so `R` covers every branch, including conditional views. Framework
 * services such as `Scope` are never part of `R`.
 *
 * `props` and `events` are optional. `subscriptions` returns keyed Streams run
 * while their key is listed, and falsy entries are skipped. When the Model
 * has loader fields it also gets `$`, and must start with `$.watch({ ... })`.
 * `elements` overrides the registered vocabulary for this component.
 *
 * `head` returns the instance's document head entries (see `Head`). It's a
 * pure function of the Model and never sees props: a page that wants its
 * route in the title copies it into the Model in `init`. The entries live and
 * die with the instance, and a slot's `fallback` contributes none.
 *
 * **Example** (A counter)
 *
 * ```ts import.meta.vitest
 * import { Component } from "effect/ui"
 * import { Schema } from "effect"
 *
 * const CounterMessage = Schema.TaggedUnion({ Increment: {}, Decrement: {} })
 *
 * const Counter = Component.make({
 *   name: "Counter",
 *   props: Schema.Struct({ initial: Schema.Number }),
 *   model: Schema.Struct({ count: Schema.Number }),
 *   message: CounterMessage,
 *   init: ($) => ({ count: $.props.initial }),
 *   update: (model, message) =>
 *     CounterMessage.match(message, {
 *       Increment: () => ({ count: model.count + 1 }),
 *       Decrement: () => ({ count: model.count - 1 })
 *     }),
 *   view: (model, h) =>
 *     h.el(
 *       "div",
 *       h.el("button", "-").on("click", CounterMessage.make({ _tag: "Decrement" })),
 *       h.el("span", String(model.count)),
 *       h.el("button", "+").on("click", CounterMessage.make({ _tag: "Increment" }))
 *     )
 * })
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = <
  const Name extends string,
  Model,
  Msg,
  Props = {},
  Events = never,
  UI extends Model | InitStep<Model, Msg, Events, any> = Model,
  U extends Model | Step<Model, Msg, Events, any> = Model,
  UV extends View.Node<Msg, any> = View.Node<Msg>,
  S extends Subscription.Subscription<Msg, any> = never,
  V extends View.Elements = View.Registered
>(
  options:
    & {
      readonly name: Name
      readonly props?: Schema.Codec<Props, any> | undefined
      readonly model: Schema.Codec<Model, any>
      readonly message: Schema.Codec<Msg, any>
      readonly events?: Schema.Codec<Events, any> | undefined
      readonly init: ($: Init<Model, Msg, Events, Props>) => UI
      readonly update: (model: Model, msg: Msg, $: Update<Model, Msg, Events, Props>) => U
      readonly view: (model: Model, h: View.Helper<Msg, Props> & View.Tags<V, Msg> & LoaderHelpers<Model>) => UV
      readonly head?: ((model: Model) => ReadonlyArray<Head.Entry>) | undefined
      readonly elements?: View.Vocabulary<V> | undefined
    }
    & ([LoaderFields<Model>] extends [never] ? {
        readonly subscriptions?:
          | ((model: Model, props: Props) => ReadonlyArray<S | false | null | undefined>)
          | undefined
      }
      : {
        /** The args of each loader field's read. */
        readonly loaders: Loaders<Model, Props>
        /** Starts with `$.watch({ ... })`, one handler per loader field. */
        readonly subscriptions: (
          model: Model,
          props: Props,
          $: Subscriptions<Model, Msg>
        ) => readonly [Watches<Model, Msg>, ...ReadonlyArray<S | false | null | undefined>]
      })
): Component<
  Name,
  Props,
  Model,
  Msg,
  Events,
  Exclude<
    | StepRequirements<UI>
    | StepRequirements<U>
    | View.Requirements<UV>
    | Subscription.Requirements<S>
    | LoaderServices<Model>,
    Command.FrameworkService
  >,
  V
> => {
  const subscriptions = (options as any).subscriptions as
    | ((model: Model, props: Props, $: any) => ReadonlyArray<S | false | null | undefined>)
    | undefined
  const bound = loaders.bind(options.name, options.model as any, (options as any).loaders)
  if (bound !== undefined && subscriptions === undefined) {
    throw new Error(`${options.name}: the Model has loader fields, so subscriptions must return [$.watch({ ... })].`)
  }
  const empty = bound?.empty ?? {}
  return Object.assign(Object.create(Proto), {
    name: options.name,
    props: options.props ?? Schema.Struct({}),
    model: options.model,
    message: options.message,
    events: options.events ?? Schema.Never,
    init: (props: Props) => toNext(options.init(makeInit(props, empty))),
    update: (model: Model, msg: Msg, props: Props) => toNext(options.update(model, msg, makeUpdate(model, props))),
    view: (model: Model, props: Props, running?: View.Running) => {
      const h: any = View.makeHelper<Msg, Props, V>(props, options.elements ?? View.registeredElements(), running)
      if (bound !== undefined) {
        const context = bound.context(model, props)
        h.loaded = context.loaded
        h.previous = context.previous
        h.patched = context.patched
      }
      return options.view(model, h)
    },
    subscriptions: subscriptions === undefined
      ? undefined
      : bound === undefined
      ? (model: Model, props: Props) => subscriptions(model, props, undefined).filter((entry): entry is S => !!entry)
      : (model: Model, props: Props) =>
        bound.expand(subscriptions(model, props, { watch: bound.context(model, props).watch })) as Array<S>,
    head: options.head,
    elements: () => options.elements ?? View.registeredElements(),
    layer: undefined,
    layerFailure: undefined,
    sharedLayer: undefined,
    layerOnServer: true,
    "~loaders": bound
  })
}

/**
 * The options of `provide`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ProvideOptions<in E, out Msg> {
  /**
   * Maps the Layer's failure to one of the component's own messages. The
   * component stays mounted, feature children below show `fallback`, and
   * Commands that were waiting for the Layer are interrupted. Retrying means
   * re-keying the component. Required when the Layer can fail.
   */
  readonly onFailure: (failure: AsyncResult.Failure<never, E>) => Msg
  /**
   * Builds a Layer value per instance, for state each instance must own. By
   * default a Layer value is shared by every instance that resolves its
   * services from the same place.
   */
  readonly local?: boolean | undefined
  /**
   * `false` keeps the Layer off the server, for Layers that are always
   * asynchronous there, such as a live connection. The server renders the
   * component like one whose Layer missed the budget, without spending the
   * budget on it, and the client builds the instance fresh.
   */
  readonly server?: false | undefined
}

/**
 * The `local` and `server` options of `provide`, for Layers that can't fail.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LocalOption {
  readonly local?: boolean | undefined
  readonly server?: false | undefined
}

/**
 * `C` with `ROut` provided and `RIn` required instead. Name, Model and message
 * are kept, so paths and story tests don't change.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Provided<C, ROut, RIn> = C extends
  Component<infer N, infer P, infer M, infer Msg, infer E, infer _R, infer V>
  ? Component<N, P, M, Msg, E, Exclude<Requirements<C>, Exclude<ROut, RuntimeService>> | RIn, V>
  : Mountable<Props<C>, Events<C>, Exclude<Requirements<C>, Exclude<ROut, RuntimeService>> | RIn>

/**
 * Services the runtime owns or reads once at mount: the framework services,
 * among them the loader cache, and the cache's three references. A `provide`
 * Layer can't supply them, so it never removes them from a component's
 * requirements.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type RuntimeService =
  | Command.FrameworkService
  | typeof Loader.Visibility
  | typeof Loader.Connectivity
  | typeof Loader.Problems

/**
 * What `provide` accepts: a Layer, an array of them, or a function of props
 * returning a Layer.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type ProvideInput = Layer.Any | ReadonlyArray<Layer.Any> | ((props: any) => Layer.Any)

/**
 * Helper types for `provide`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace ProvideInput {
  /**
   * The Layer type of an input.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type LayerOf<L> = L extends (props: any) => infer R ? R : L extends ReadonlyArray<infer E> ? E : L

  /**
   * The services an input provides.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type Success<L> = LayerOf<L> extends infer X ? X extends Layer.Layer<infer A, any, any> ? A : never : never

  /**
   * The error an input can fail with.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type Error<L> = LayerOf<L> extends infer X ? X extends Layer.Layer<any, infer E, any> ? E : never : never

  /**
   * The services an input requires.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type Services<L> = LayerOf<L> extends infer X ? X extends Layer.Layer<any, any, infer R> ? R : never : never
}

/**
 * The options argument of `provide`. Optional when the Layer can't fail with a
 * typed error, and otherwise a required argument with `onFailure`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ProvideRest<L, Msg> = [ProvideInput.Error<L>] extends [never] ?
  [options?: LocalOption & { readonly onFailure?: ProvideOptions<never, Msg>["onFailure"] | undefined }]
  : [options_with_onFailure: ProvideOptions<ProvideInput.Error<L>, Msg>]

/**
 * Passes unless the Layer can fail and no `onFailure` was given; then names
 * the error type in the compiler error.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type RequiresOnFailure<L, O> = [ProvideInput.Error<L>] extends [never] ? unknown
  : [O] extends [never] ? { readonly "This Layer can fail. Pass { onFailure } to handle": ProvideInput.Error<L> }
  : unknown

/**
 * Passes unless the Layer can fail, because the curried form has no
 * `onFailure`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type CurriedCantFail<L> = [ProvideInput.Error<L>] extends [never] ? unknown
  : {
    readonly "This Layer can fail, and the curried form has no onFailure. Use Component.provide(component, layer, { onFailure }) to handle":
      ProvideInput.Error<L>
  }

const mergeAll = Layer.mergeAll as (...layers: ReadonlyArray<Layer.Any>) => Layer.Layer<any, any, any>

const toLayer = (layers: Layer.Any | ReadonlyArray<Layer.Any>): Layer.Layer<any, any, any> =>
  Array.isArray(layers) ? mergeAll(...layers) : (layers as Layer.Layer<any, any, any>)

/**
 * Provides services to a component and everything below it, like
 * `Effect.provide`.
 *
 * **When to use**
 *
 * Use to give a component its Command Layers and feature implementations where
 * the context they need lives: the page, the feature or the app. A test
 * provides fakes the same way.
 *
 * **Details**
 *
 * It returns the same component, with `R` changed to `Exclude<R, ROut> | RIn`.
 * A Layer passed as a value is built once per Env plus Layer identity,
 * reference-counted, and shared between the instances that resolve from it;
 * `{ local: true }` or a function of props builds once per instance, at mount.
 * An array of Layers is merged once with `Layer.mergeAll`, so the elements
 * don't see each other. Nothing is rebuilt when props change: re-key instead.
 * Nested provides let the inner one win, and the inner one can use the outer
 * one's services.
 *
 * Builds run in the background: the component renders from `init` at once and
 * its Commands and Subscriptions wait for the Layer. `onFailure` is required
 * when a provided Layer can fail, and the curried form can't take it.
 *
 * On the server, provided Layers are built under the render's budget. A Layer
 * that is always asynchronous there, such as a live connection, takes
 * `{ server: false }`: the server never builds it and renders the component
 * like one whose Layer missed the budget, and the client builds the instance
 * fresh.
 *
 * **Example** (Sharing Command Layers across rows, and a per-instance store)
 *
 * ```ts import.meta.vitest
 * import { Command, Component } from "effect/ui"
 * import { Context, Effect, Layer, Schema } from "effect"
 *
 * const RowMessage = Schema.TaggedUnion({ Save: {}, Saved: {} })
 *
 * class SaveTodo extends Command.Service<SaveTodo>()(
 *   "todos/SaveTodo",
 *   { args: { id: Schema.String }, invalidates: () => [] },
 *   Effect.succeed(() => Effect.succeed(RowMessage.make({ _tag: "Saved" })))
 * ) {}
 *
 * class EditorStore extends Context.Service<EditorStore, { readonly draft: string }>()("EditorStore") {
 *   static readonly layer = Layer.succeed(EditorStore, { draft: "" })
 * }
 *
 * const Row = Component.make({
 *   name: "Row",
 *   props: Schema.Struct({ id: Schema.String }),
 *   model: Schema.Struct({}),
 *   message: RowMessage,
 *   init: () => ({}),
 *   update: (model, message, $) =>
 *     RowMessage.match(message, {
 *       Save: () => $.run(SaveTodo.make({ id: $.props.id })),
 *       Saved: () => model
 *     }),
 *   view: (_, h) => h.el("li", h.props.id)
 * })
 *
 * const RowLive = Component.provide(Row, [SaveTodo.layer])            // shared per Env
 * const Editor = Component.provide(Row, EditorStore.layer, { local: true }) // per instance
 * ```
 *
 * @stability experimental
 * @category composition
 * @since 4.1.5
 */
export const provide: {
  <Props, ROut, RIn>(
    layer: (props: Props) => Layer.Layer<ROut, never, RIn>
  ): <C extends Mountable<Props, any, any>>(component: C) => Provided<C, ROut, RIn>
  <const L extends Layer.Any | ReadonlyArray<Layer.Any>>(
    layer: L & CurriedCantFail<L>,
    options?: LocalOption
  ): <C extends Any>(component: C) => Provided<C, ProvideInput.Success<L>, ProvideInput.Services<L>>
  <C extends Any, ROut, RIn>(
    component: C,
    layer: (props: Props<C>) => Layer.Layer<ROut, never, RIn>
  ): Provided<C, ROut, RIn>
  <C extends Any, ROut, E, RIn>(
    component: C,
    layer: (props: Props<C>) => Layer.Layer<ROut, E, RIn>,
    options: ProvideOptions<E, Message<C>>
  ): Provided<C, ROut, RIn>
  <
    C extends Any,
    const L extends Layer.Any | ReadonlyArray<Layer.Any>,
    const O extends ProvideRest<L, Message<C>>[0] = never
  >(
    component: C,
    layer: L & RequiresOnFailure<L, O>,
    options?: O & ProvideRest<L, Message<C>>[0]
  ): Provided<C, ProvideInput.Success<L>, ProvideInput.Services<L>>
} = ((...args: Array<any>) => {
  const go = (
    component: Any,
    given: ProvideInput,
    options?: Partial<ProvideOptions<any, any>>
  ): Any => {
    // Arrays are merged once, here, so a shared Layer keeps one identity.
    const layer: Layer.Layer<any, any, any> | ((props: any) => Layer.Layer<any, any, any>) = typeof given === "function"
      ? (given as (props: any) => Layer.Layer<any, any, any>)
      : toLayer(given)
    const outer = Layer.isLayer(layer) ? () => layer : layer
    const inner = component.layer
    // Nested: the handler closest to the component is kept.
    const layerFailure = component.layerFailure ?? options?.onFailure
    // A Layer value is shared by every instance resolving from one Env, if everything inside is too.
    const sharedLayer =
      Layer.isLayer(layer) && options?.local !== true && (inner === undefined || component.sharedLayer !== undefined)
        ? (component.sharedLayer === undefined ? layer : Layer.provideMerge(component.sharedLayer, layer))
        : undefined
    return Object.assign(Object.create(Proto), component, {
      layer: inner === undefined ? outer : (props: unknown) => Layer.provideMerge(inner(props), outer(props)),
      layerFailure,
      sharedLayer,
      // Nested provides are built as one Layer, so one opt-out keeps all of them off the server.
      layerOnServer: component.layerOnServer && options?.server !== false
    })
  }
  // A component is an object with the type id; a Layer, an array or a function means the curried form.
  const curried = !isComponent(args[0])
  return curried ? (component: Any) => go(component, args[0], args[1]) : go(args[0], args[1], args[2])
}) as any
