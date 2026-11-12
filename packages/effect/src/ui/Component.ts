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
 *       h.el("button").on("click", TodoItemMessage.make({ _tag: "Toggle" })).children(h.props.todo.done ? "[x]" : "[ ]"),
 *       h.el("span", h.props.todo.title),
 *       h.isRunning(SaveTodo) ? " saving" : ""
 *     )
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as Duration from "../Duration.ts"
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
  /** The load mores and resets of list loaders `update` issued, in order. */
  readonly lists?: ReadonlyArray<ListIssue> | undefined
}

/**
 * A `$.loadMore(name)` or `$.reset(name)` an `update` issued, by loader
 * name.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ListIssue {
  readonly name: string
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
export interface Step<in out Model, in out Msg, in out Events, out R = never, L = {}>
  extends InitStep<Model, Msg, Events, R>
{
  /** The load mores and resets issued, in order. */
  readonly lists: ReadonlyArray<ListIssue>
  /** Replaces the Model. */
  set(model: Model): Step<Model, Msg, Events, R, L>
  /** Changes the Model with a function of the current one. */
  modify(f: (model: Model) => Model): Step<Model, Msg, Events, R, L>
  /**
   * Runs Commands in this instance's Scope. Their results come back as
   * messages, so a Command whose result isn't this component's message is
   * rejected.
   */
  run<const C extends ReadonlyArray<Command.Command<Msg, any>>>(
    ...commands: C
  ): Step<Model, Msg, Events, R | Command.Requirements<C[number]>, L>
  /** Reports to the parent. */
  emit(...emitted: ReadonlyArray<Events>): Step<Model, Msg, Events, R, L>
  /**
   * Loads the next page of a list loader. The runtime takes the args from the
   * loader, after this `update`'s Model. The page arrives in the loader's
   * slot, and nothing is issued for a disabled loader.
   */
  loadMore(name: ListNames<L>): Step<Model, Msg, Events, R, L>
  /**
   * Drops a list loader's pages after the first, then refetches it. Every
   * held page is saved in `history.state` on navigation, so this is how a
   * long list keeps that small.
   */
  reset(name: ListNames<L>): Step<Model, Msg, Events, R, L>
}

/**
 * `$` in `update`: a step holding the current Model, plus the current props
 * and what the loaders hold.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Update<in out Model, in out Msg, in out Events, out Props, L = {}>
  extends Step<Model, Msg, Events, never, L>
{
  readonly props: Props
  /** The loaders' results, as `h.loaded` shows them for the Model before this `update`. */
  readonly loaded: { readonly [K in keyof L]: LoadedOf<L[K]> }
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
  loadMore(this: Step<any, any, any, any>, name: string) {
    return makeStep(this.model, this.commands, this.emitted, [...this.lists, { name, op: "loadMore" }])
  },
  reset(this: Step<any, any, any, any>, name: string) {
    return makeStep(this.model, this.commands, this.emitted, [...this.lists, { name, op: "reset" }])
  }
}

const makeStep = (
  model: unknown,
  commands: ReadonlyArray<Command.Command<any, any>>,
  emitted: ReadonlyArray<unknown>,
  lists: ReadonlyArray<ListIssue>
): Step<any, any, any, any> => Object.assign(Object.create(StepProto), { model, commands, emitted, lists })

const makeUpdate = (model: unknown, props: unknown, loaded: unknown): Update<any, any, any, any> =>
  Object.assign(Object.create(StepProto), { model, commands: [], emitted: [], lists: [], props, loaded })

const makeInit = (props: unknown): Init<any, any, any, any> => ({
  props,
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
  /** `loaded` is the instance's loader slots. Without it every slot is empty. */
  readonly update: (model: any, msg: never, props: Props, loaded?: Slots | undefined) => Next<any, any, Events, R>
  /** `running` answers `h.isRunning` for the instance being rendered. Without it nothing is running. */
  readonly view: (
    model: any,
    props: Props,
    running?: ((name: string, groupKey: string | undefined) => boolean) | undefined,
    loaded?: Slots | undefined
  ) => View.Node<any, R>
  readonly subscriptions:
    | ((model: any, props: Props, loaded?: Slots | undefined) => ReadonlyArray<Subscription.Subscription<any, R>>)
    | undefined
  /** The instance's document head entries, a pure function of its Model and loaders. */
  readonly head: ((model: any, props: Props, loaded?: Slots | undefined) => ReadonlyArray<Head.Entry>) | undefined
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
  /** The bound `loaders`, read by the runtime and `Story`. `undefined` without any. */
  readonly "~loaders": unknown
}

/**
 * An instance's loader slots, by loader name. Opaque: only the runtime and
 * `Story` build and read them.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Slots = { readonly [name: string]: unknown }

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
  out V extends View.Elements = never,
  out L = {}
> extends Mountable<Props, Events, R> {
  readonly name: Name
  readonly model: Schema.Codec<Model, any>
  readonly message: Schema.Codec<Msg, any>
  readonly init: (props: Props) => Next<Model, Msg, Events, R>
  readonly update: (model: Model, msg: Msg, props: Props, loaded?: Slots | undefined) => Next<Model, Msg, Events, R>
  readonly view: (
    model: Model,
    props: Props,
    running?: ((name: string, groupKey: string | undefined) => boolean) | undefined,
    loaded?: Slots | undefined
  ) => View.Node<Msg, R>
  readonly subscriptions:
    | ((model: Model, props: Props, loaded?: Slots | undefined) => ReadonlyArray<Subscription.Subscription<Msg, R>>)
    | undefined
  readonly head: ((model: Model, props: Props, loaded?: Slots | undefined) => ReadonlyArray<Head.Entry>) | undefined
  readonly layerFailure: ((failure: AsyncResult.Failure<never, any>) => Msg) | undefined
  readonly "~V"?: V
  readonly "~L"?: L
}

/**
 * What `h` gains in `view` for a component with loaders.
 *
 * **Details**
 *
 * `loaded` holds each loader's result, as `$.loaded` does in `update`.
 *
 * `previous` holds, per single or list loader, the Success value its slot
 * holds for args other than the loader's current ones. It's `Some` only while
 * the loader is enabled, so it is `None` whenever `h.loaded` has the stored
 * result.
 *
 * `patched` tells, per single or list loader, whether the value includes an
 * optimistic patch the server hasn't confirmed. It is per entry, not per
 * instance.
 *
 * `previous` and `patched` have no `loadMany` loader.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoaderHelpers<L> = [keyof L] extends [never] ? {} : {
  readonly loaded: { readonly [K in keyof L]: LoadedOf<L[K]> }
  readonly previous: {
    readonly [K in SingleNames<L>]: L[K] extends Load<infer R> ?
      R extends Loader.ListRead.Any ? Option.Option<Omit<LoadedList<R>, "more">>
      : Option.Option<Loader.Read.Success<R>>
      : never
  }
  readonly patched: { readonly [K in SingleNames<L>]: boolean }
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
 * A `load` entry of `loaders`, as the types see it: one read, or a list
 * when the read is a `Loader.ListService`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Load<out R extends Loader.Read.Any> {
  readonly _tag: "Load"
  readonly read: R
}

/**
 * A `loadMany` entry of `loaders`, as the types see it: one read at many
 * args.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LoadMany<out R extends Loader.Read.Any> {
  readonly _tag: "LoadMany"
  readonly read: R
}

/**
 * A component's loaders, as the types see them: per name in `loaders`, a
 * `Load` or a `LoadMany`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type LoaderSpec = { readonly [name: string]: Load<any> | LoadMany<any> }

// A `load` beside a `loadMany` in one entry, or a list read under `loadMany`, is rejected.
type OneRead<M> = [M] extends [Loader.Read.Any] ? { readonly "~error": "an entry takes one of load and loadMany" }
  : unknown
type KeyedRead<R> = [R] extends [Loader.ListRead.Any] ? { readonly "~error": "a list read takes load, not loadMany" }
  : unknown

/**
 * The loaders of a component.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Loaders<C> = C extends { readonly "~L"?: infer L } ? [L] extends [LoaderSpec] ? L : {} : {}

/**
 * The names of the single and list loaders: those `h.previous` and
 * `h.patched` have.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type SingleNames<L> = { readonly [K in keyof L]: L[K] extends Load<any> ? K : never }[keyof L] & string

/**
 * The names of the list loaders: `$.loadMore` and `$.reset` take one.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ListNames<L> =
  & { readonly [K in keyof L]: L[K] extends Load<infer R> ? R extends Loader.ListRead.Any ? K : never : never }[keyof L]
  & string

/**
 * The names of the `loadMany` loaders.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type KeyedNames<L> = { readonly [K in keyof L]: L[K] extends LoadMany<any> ? K : never }[keyof L] & string

/**
 * The services a component's loaders add to its requirements: the reads
 * themselves, never what their fetchers use.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoaderServices<L> = ServiceOf<L[keyof L]>

type ServiceOf<D> = D extends { readonly read: { readonly Identifier: infer Self } } ? Self : never

/**
 * One loader as `h.loaded`, `$.loaded`, and the `loaded` argument of `head`,
 * `subscriptions` and a loader's `args` open it.
 *
 * **Details**
 *
 * A single loader opens to an `AsyncResult` of its read's success and error,
 * a list loader to an `AsyncResult` of its `LoadedList`, and a `loadMany`
 * loader to its entries in the order of its args. A single or list loader
 * holds the result its slot took at the loader's current args, and otherwise
 * `Initial`, waiting while the loader is enabled.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type LoadedOf<D> = D extends LoadMany<infer R> ? KeyedLoaded<R>
  : D extends Load<infer R> ?
    R extends Loader.ListRead.Any ? AsyncResult.AsyncResult<LoadedList<R>, Loader.Read.Error<R>>
    : AsyncResult.AsyncResult<Loader.Read.Success<R>, Loader.Read.Error<R>>
  : never

/**
 * A list loader as `h.loaded` opens it, inside its `AsyncResult`.
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
 * One entry of a `loadMany` loader as `h.loaded` opens it: the args from
 * the loader, the opened result and whether the value includes an
 * unconfirmed patch.
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
 * A `loadMany` loader as `h.loaded` opens it: an entry per unique args the
 * loader returns, in its order, and `get` to find one entry by its args.
 *
 * **Details**
 *
 * A key with no settled result opens as `Initial`, waiting. `get` is `None`
 * for args the loader doesn't currently return. Entries carry no key: write
 * each row's `.key(...)` by hand.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface KeyedLoaded<R extends Loader.Read.Any> extends ReadonlyArray<KeyedEntry<R>> {
  readonly get: (args: Loader.Read.Args<R>) => Option.Option<KeyedEntry<R>>
}

/**
 * One key of a `loadMany` loader whose result changed, as its `onChange`
 * gets it.
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
 * What a loader's `args` returns: the args of a `load`'s read, or
 * `undefined` to disable it, and an array of args for a `loadMany`, empty
 * to watch nothing.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ArgsFor<S, M> = M extends Loader.Read.Any ? ReadonlyArray<Loader.Read.Args<M>>
  : Loader.Read.Args<S> | undefined

/**
 * A loader's `onChange`: a `load`'s gets its result as `h.loaded` opens it,
 * and a `loadMany`'s gets its entries and the keys whose result changed.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type OnChange<S, M, Msg> = M extends Loader.Read.Any
  ? (loaded: KeyedLoaded<M>, changes: ReadonlyArray<KeyedChange<M>>) => Msg
  : S extends Loader.Read.Any ? (result: LoadedOf<Load<S>>) => Msg
  : never

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
 * while their key is listed, and falsy entries are skipped. `elements`
 * overrides the registered vocabulary for this component.
 *
 * `loaders` declares the reads the component shows, by name. Each entry is
 * `{ load: Read, args }` for one read, a list when `Read` is a
 * `Loader.ListService`, or `{ loadMany: Read, args }` for one read at many
 * args. `args` gets the Model, the props and the other loaders' results,
 * and returns the read's args, `undefined` to disable it, or for
 * `loadMany` an array of args. The runtime watches each read at those args
 * and keeps what it last returned in the loader's slot, beside the Model:
 * the Model plus the slots is an instance's state. A slot that changes
 * re-renders the instance. `h.loaded`, `$.loaded` in `update`, and the
 * `loaded` argument of `head` and `subscriptions` open the slots, by
 * loader name. Each read is added to `R`.
 *
 * An entry's `debounce` delays a fetch for changed args by a
 * `Duration.Input` on the Clock. Only a fetch waits: the first args at
 * mount, the server render, args whose cache entry is fresh or already being
 * fetched, and a change to `undefined` go through at once. While the fetch
 * waits, `h.loaded` is `Initial`, waiting, and `h.previous` holds the last
 * value. Args that change again restart the wait. A `loadMany` loader's new
 * keys wait each on their own.
 *
 * An entry's `onChange` returns a message to send when its slot changes, for
 * a component that has to react in `update`. A `load` loader's gets its
 * result as `h.loaded` opens it, and a `loadMany` loader's gets its entries
 * and the keys whose result changed. The slot is written first, and the
 * message's `update` sees it in `$.loaded`.
 *
 * `head` returns the instance's document head entries (see `Head`). It's a
 * pure function of the Model and the loaders' results, and never sees props.
 * The entries live and die with the instance, and a slot's `fallback`
 * contributes none.
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
 *       h.el("button").on("click", CounterMessage.make({ _tag: "Decrement" })).children("-"),
 *       h.el("span", String(model.count)),
 *       h.el("button").on("click", CounterMessage.make({ _tag: "Increment" })).children("+")
 *     )
 * })
 * ```
 *
 * **Example** (A page that loads its user, and the user's team)
 *
 * ```ts import.meta.vitest
 * import { Component } from "effect/ui"
 * import { Effect, Schema } from "effect"
 * import { AsyncResult, Loader } from "effect/reactivity"
 *
 * class GetUser extends Loader.Service<GetUser>()("GetUser", {
 *   args: { id: Schema.String },
 *   success: Schema.Struct({ name: Schema.String, teamId: Schema.String }),
 *   error: Schema.Never,
 *   staleTime: "1 minute"
 * }, Effect.succeed(({ id }) => Effect.succeed({ name: `User ${id}`, teamId: "t1" }))) {}
 *
 * class GetTeam extends Loader.Service<GetTeam>()("GetTeam", {
 *   args: { id: Schema.String },
 *   success: Schema.Struct({ title: Schema.String }),
 *   error: Schema.Never,
 *   staleTime: "1 minute"
 * }, Effect.succeed(({ id }) => Effect.succeed({ title: `Team ${id}` }))) {}
 *
 * const UserPage = Component.make({
 *   name: "UserPage",
 *   props: Schema.Struct({ id: Schema.String }),
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   loaders: {
 *     user: { load: GetUser, args: (_model, props) => ({ id: props.id }) },
 *     // Disabled until the user has loaded.
 *     team: {
 *       load: GetTeam,
 *       args: (_model, _props, loaded) =>
 *         AsyncResult.isSuccess(loaded.user) ? { id: loaded.user.value.teamId } : undefined
 *     }
 *   },
 *   init: () => ({}),
 *   update: (model) => model,
 *   view: (_model, h) =>
 *     AsyncResult.match(h.loaded.user, {
 *       onInitial: () => h.el("p", "Loading…"),
 *       onFailure: () => h.el("p", "No such user"),
 *       onSuccess: ({ value }) =>
 *         h.el("p", value.name, AsyncResult.isSuccess(h.loaded.team) ? ` of ${h.loaded.team.value.title}` : "")
 *     })
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
  S = {},
  M = {},
  // The loaders as `Load` and `LoadMany` entries, by name. Nothing infers it, so it's always this default:
  // the mapped types over it use `NoInfer`, or an annotated `loaded` argument would.
  L = {
    readonly [K in keyof S]: M[K & keyof M] extends Loader.Read.Any ? LoadMany<M[K & keyof M]>
      : S[K] extends Loader.Read.Any ? Load<S[K]>
      : never
  },
  UI extends Model | InitStep<Model, Msg, Events, any> = Model,
  U extends Model | Step<Model, Msg, Events, any, any> = Model,
  UV extends View.Content<Msg, any> = View.Node<Msg>,
  Sub extends Subscription.Subscription<Msg, any> = never,
  V extends View.Elements = View.Registered
>(
  options: {
    readonly name: Name
    readonly props?: Schema.Codec<Props, any> | undefined
    readonly model: Schema.Codec<Model, any>
    readonly message: Schema.Codec<Msg, any>
    readonly events?: Schema.Codec<Events, any> | undefined
    /** The reads the component shows, by name. */
    readonly loaders?:
      | (
        & {
          readonly [K in keyof S]: {
            readonly load?: S[K] & OneRead<M[K & keyof M]>
            readonly args: (
              model: Model,
              props: Props,
              loaded: { readonly [P in Exclude<keyof NoInfer<L>, K>]: LoadedOf<NoInfer<L>[P]> }
            ) => ArgsFor<S[K], M[K & keyof M]>
            readonly debounce?: Duration.Input | undefined
            readonly onChange?: OnChange<S[K], M[K & keyof M], NoInfer<Msg>> | undefined
          }
        }
        & { readonly [K in keyof M]: { readonly loadMany?: M[K] & KeyedRead<M[K]> } }
      )
      | undefined
    readonly init: ($: Init<Model, Msg, Events, Props>) => UI
    readonly update: (model: Model, msg: Msg, $: Update<Model, Msg, Events, Props, L>) => U
    readonly view: (
      model: Model,
      h: View.Helper<Msg, Props> & View.Tags<V, Msg> & LoaderHelpers<L>
    ) => UV
    readonly subscriptions?:
      | ((
        model: Model,
        props: Props,
        loaded: { readonly [K in keyof NoInfer<L>]: LoadedOf<NoInfer<L>[K]> }
      ) => ReadonlyArray<Sub | false | null | undefined>)
      | undefined
    readonly head?:
      | ((
        model: Model,
        loaded: { readonly [K in keyof NoInfer<L>]: LoadedOf<NoInfer<L>[K]> }
      ) => ReadonlyArray<Head.Entry>)
      | undefined
    readonly elements?: View.Vocabulary<V> | undefined
  }
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
    | Subscription.Requirements<Sub>
    | LoaderServices<L>,
    Command.FrameworkService
  >,
  V,
  L
> => {
  const bound = loaders.bind(options.name, options.loaders)
  const open = (model: unknown, props: unknown, slots: Slots | undefined): any =>
    bound === undefined ? {} : bound.context(model, props, slots).loaded
  const subscriptions = options.subscriptions
  const head = options.head
  return Object.assign(Object.create(Proto), {
    name: options.name,
    props: options.props ?? Schema.Struct({}),
    model: options.model,
    message: options.message,
    events: options.events ?? Schema.Never,
    init: (props: Props) => toNext(options.init(makeInit(props))),
    update: (model: Model, msg: Msg, props: Props, slots?: Slots) =>
      toNext(options.update(model, msg, makeUpdate(model, props, open(model, props, slots)) as any)),
    view: (model: Model, props: Props, running?: View.Running, slots?: Slots) => {
      const h: any = View.makeHelper<Msg, Props, V>(props, options.elements ?? View.registeredElements(), running)
      if (bound !== undefined) {
        const context = bound.context(model, props, slots)
        h.loaded = context.loaded
        h.previous = context.previous
        h.patched = context.patched
      }
      return View.toNode(options.view(model, h))
    },
    subscriptions: subscriptions === undefined
      ? undefined
      : (model: Model, props: Props, slots?: Slots) =>
        subscriptions(model, props, open(model, props, slots)).filter((entry): entry is Sub => !!entry),
    head: head === undefined
      ? undefined
      : (model: Model, props: Props, slots?: Slots) => head(model, open(model, props, slots)),
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
  Component<infer N, infer P, infer M, infer Msg, infer E, infer _R, infer V, infer L>
  ? Component<N, P, M, Msg, E, Exclude<Requirements<C>, Exclude<ROut, RuntimeService>> | RIn, V, L>
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
 * A memoised Layer inside a shared one is built once per Env too: every
 * provide that resolves from that Env, or from an Env below it, gets the same
 * instance, and the last of them to unmount closes it. Provides in sibling
 * Envs build their own, so a service built for one never sees the other's
 * dependencies. As with nested `Effect.provide`, a provide reuses what an Env
 * above it built even where an Env between them provides a different
 * dependency; `Layer.fresh` builds it again. A stateful service belongs to
 * the component that owns its lifetime, usually the root: provide it there,
 * and the provides below that name it get that instance.
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
