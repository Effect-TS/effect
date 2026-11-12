/**
 * Story tests drive one component instance step by step: pure, with no
 * runtime, no Layers and no host.
 *
 * A story covers `init`, `update` and queries over the instance's view value.
 * Commands stay pending as data until a step resolves them with the message
 * they would have produced, so no service is needed. A child slot is a leaf:
 * anything that crosses one is a runtime test.
 *
 * `make` hands a callback a cursor, `Steps`, whose steps run as soon as they
 * are called and return the cursor, so they chain. A shared setup is a function
 * of the cursor, applied with `pipe`. `make` fails if a Command is still
 * pending once the callback returns. Sending a message while Commands are
 * pending is allowed, since testing `switch` and `concurrent` needs it. A
 * defect in `init`, `update` or `view` makes the step throw, on the line
 * that called it.
 *
 * **Example** (A todo row: click, resolve its Command, check the Model)
 *
 * ```ts import.meta.vitest
 * import { Command, Component } from "effect/ui"
 * import { Story } from "effect/ui/testing"
 * import { Effect, Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Save: {}, Saved: {} })
 *
 * class SaveTodo extends Command.Service<SaveTodo>()(
 *   "todos/SaveTodo",
 *   { args: { id: Schema.String } },
 *   Effect.succeed(() => Effect.succeed(Message.make({ _tag: "Saved" })))
 * ) {}
 *
 * const TodoItem = Component.make({
 *   name: "TodoItem",
 *   props: Schema.Struct({ id: Schema.String }),
 *   model: Schema.Struct({ saved: Schema.Boolean }),
 *   message: Message,
 *   init: () => ({ saved: false }),
 *   update: (model, message, $) =>
 *     Message.match(message, {
 *       Save: () => $.run(SaveTodo.make({ id: $.props.id })),
 *       Saved: () => ({ saved: true })
 *     }),
 *   // In a story, `h.isRunning` is derived from the pending Commands.
 *   view: (_, h) => h.el("button").on("click", Message.make({ _tag: "Save" })).children(h.isRunning(SaveTodo) ? "saving" : "save")
 * })
 *
 * Story.make(TodoItem, { id: "t1" }, (s) =>
 *   s.click("save")
 *     .expectExact(SaveTodo.make({ id: "t1" }))
 *     .resolve(SaveTodo, Message.make({ _tag: "Saved" }))
 *     .model((model) => {
 *       if (!model.saved) throw new Error("not saved")
 *     }))
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Cause from "../../Cause.ts"
import * as Duration from "../../Duration.ts"
import * as Equal from "../../Equal.ts"
import * as Option from "../../Option.ts"
import { type Pipeable, pipeArguments } from "../../Pipeable.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
import * as Schema from "../../Schema.ts"
import * as Command from "../Command.ts"
import type * as Component from "../Component.ts"
import type * as Head from "../Head.ts"
import * as loaders from "../internal/loaders.ts"
import * as schedule from "../internal/schedule.ts"
import * as MessageLog from "../MessageLog.ts"
import * as View from "../View.ts"
import * as Query from "./Query.ts"

/**
 * A Command issued by the instance whose message hasn't been delivered.
 *
 * **Details**
 *
 * `running` is what the runtime would be executing; `queued` is waiting behind
 * a running run of the same group under `mode: "queue"`. `awaiting` has
 * resolved or failed, and holds `message`: a `Command.afterRefetch` run
 * waits for the loaders in `awaiting`, and under `mode: "queue"` a
 * message also waits for the earlier ones of its group.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Pending<Msg> {
  readonly command: Command.Issued<Msg, any, never, "Effect"> | Command.Issued<Msg, any, never, "Stream">
  readonly status: "running" | "queued" | "awaiting"
  /** On an awaiting run: the message it delivers when its wait ends. */
  readonly message?: Msg | undefined
  /** On an awaiting run: the loaders its wait is still on, each at the args it awaits. */
  readonly awaiting?: ReadonlyArray<AwaitedLoader> | undefined
}

/**
 * A loader a `Command.afterRefetch` run waits for, by its name in
 * `loaders`, at the args it returned when the run resolved. A `loadMany`
 * loader has one per awaited key.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface AwaitedLoader {
  readonly name: string
  readonly args: unknown
}

/**
 * The state of one instance between steps. Immutable: every step replaces the
 * cursor's record with a new one.
 *
 * **Details**
 *
 * `get`, `query` and `all` run `Query` locators over the current view, as
 * `TestHost`'s roots do.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Story<Props, Model, Msg, Events, Loaded = { readonly [name: string]: unknown }> {
  readonly component: Component.Component<any, Props, Model, Msg, Events, any, any>
  readonly props: Props
  readonly model: Model
  /**
   * The loader slots, beside the Model: what each loader's read last
   * returned. Opaque: `loaded` opens them.
   */
  readonly slots: Component.Slots | undefined
  /** The loaders' results, by name, as `h.loaded` opens them for the current Model, props and slots. */
  readonly loaded: () => Loaded
  /** Commands issued but not yet resolved, oldest first. */
  readonly pending: ReadonlyArray<Pending<Msg>>
  /** Everything emitted to the parent so far. */
  readonly emitted: ReadonlyArray<Events>
  /**
   * Commands interrupted by `switch`, by an interrupt Command, or by `given`.
   * An awaiting run that is cut delivers its message instead, and isn't here.
   */
  readonly interrupted: ReadonlyArray<
    Command.Issued<Msg, any, never, "Effect"> | Command.Issued<Msg, any, never, "Stream">
  >
  /** Commands ignored by `mode: "drop"`. */
  readonly dropped: ReadonlyArray<Command.Issued<Msg, any, never, "Effect"> | Command.Issued<Msg, any, never, "Stream">>
  /** The list loaders with a load more `update` issued and no step has settled yet. */
  readonly loadingMore: ReadonlyArray<string>
  /**
   * Whether the `click` or `fire` step that made this record cancelled its
   * event's default, as the browser host would: its handler was set with
   * `preventDefault: true` and produced a message, or with
   * `preventDefault: "always"`, or the event is `submit`, which is always
   * cancelled, whatever the handler returns and with no handler at all.
   *
   * **Details**
   *
   * Every other step that makes a record resets it to `false`, and so does
   * an event whose default isn't cancelled. The checks, `model`, `view`,
   * `check`, `expectExact` and the others, don't make a record, so they read
   * it without resetting it.
   */
  readonly defaultPrevented: boolean
  /**
   * The view of the current Model and props, rendered once the step that
   * changed them has sent its keyed prunes, so a defect in `view` fails that
   * step.
   */
  readonly view: () => View.Node<Msg, any>
  /** The Subscription keys the current Model and props ask for, without the loader watches. Nothing runs. */
  readonly subscriptions: () => ReadonlyArray<string>
  /** Each loader with its read and the args it returns for the current Model and props. */
  readonly loaders: () => ReadonlyArray<LoaderInfo>
  /** The view as a `Query` tree. */
  readonly root: Query.Node
  /** The one element matching `locator`. Throws when there's none or several. */
  readonly get: (locator: Query.Locator) => Query.Node
  /** The one element matching `locator`, or `undefined`. Throws when there are several. */
  readonly query: (locator: Query.Locator) => Query.Node | undefined
  /** Every element matching `locator`, in document order. */
  readonly all: (locator: Query.Locator) => ReadonlyArray<Query.Node>
}

/**
 * One loader in a story: its name, its read's name, and the args it returns
 * for the current Model and props, `undefined` when it is disabled. A
 * `loadMany` loader's args are its unique args, in order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LoaderInfo {
  readonly name: string
  readonly read: string
  readonly args: unknown
}

// The read of a loader entry, for the steps that name a loader.
type ReadOf<D> = D extends Component.Load<infer R> ? R : D extends Component.LoadMany<infer R> ? R : never

/**
 * One key of a `loadMany` loader for `loadedMany`: its args and a Success
 * value or a typed failure.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type KeyedLoad<R extends Loader.Read.Any> =
  | {
    readonly args: Loader.Read.Args<R>
    readonly value: Loader.Read.Success<R>
    readonly waiting?: boolean | undefined
    readonly patched?: boolean | undefined
  }
  | {
    readonly args: Loader.Read.Args<R>
    readonly error: Loader.Read.Error<R>
    readonly waiting?: boolean | undefined
  }

/**
 * A pending Command's definition, or an issued Command to also match the
 * arguments.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Target =
  | Command.Definition.Any
  | Command.Issued<any, any, never, "Effect">
  | Command.Issued<any, any, never, "Stream">

/**
 * A stream Command's definition, or an issued stream Command: what `next` and
 * `end` take.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type StreamTarget = Command.Definition<any, any, true, any, any> | Command.Issued<any, any, never, "Stream">

// A component with no messages has `Msg = never`, and its `update` can't take `any`, so it needs its own member.
type AnyComponent =
  | Component.Component<any, any, any, any, any, any, any>
  | Component.Component<any, any, any, never, any, any, any>

/**
 * A cursor over one story. Each step runs as soon as it's called, replaces
 * `current` and returns the cursor, so steps chain. A step that fails throws.
 *
 * **Details**
 *
 * The types come from the component: `Steps<typeof Counter>` only sends
 * `Counter`'s messages. A step shared by any component is written
 * `<S extends Story.Steps.Any>(s: S): S`, which keeps the caller's type.
 *
 * **Example** (A shared setup)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Component } from "effect/ui"
 * import { Story } from "effect/ui/testing"
 *
 * const Message = Schema.TaggedUnion({ Increment: {} })
 * const Counter = Component.make({
 *   name: "Counter",
 *   model: Schema.Struct({ count: Schema.Number }),
 *   message: Message,
 *   init: () => ({ count: 0 }),
 *   update: (model) => ({ count: model.count + 1 }),
 *   view: (model, h) => h.el("button").on("click", Message.make({ _tag: "Increment" })).children(`+ ${model.count}`)
 * })
 *
 * const twice = (s: Story.Steps<typeof Counter>) => s.click("+").click("+")
 *
 * const story = Story.make(Counter, {}, (s) => s.given({ count: 10 }).pipe(twice))
 * console.log(story.model.count) // 12
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Steps<C extends AnyComponent> extends Pipeable {
  /** The story after the last step. */
  readonly current: Story<
    Component.Props<C>,
    Component.Model<C>,
    Component.Message<C>,
    Component.Events<C>,
    { readonly [K in keyof Component.Loaders<C>]: Component.LoadedOf<Component.Loaders<C>[K]> }
  >

  /**
   * Starts from any Model, forgetting what was issued and emitted so far. An
   * updater is called with the current Model: `given(f)` is exactly
   * `given(f(current.model))`.
   *
   * **Details**
   *
   * `given` never runs `update`. Loaders keep their slots, except that a
   * keyed loader drops the stored keys it no longer returns, with no
   * `onChange` message. Later steps send `onChange` as usual.
   *
   * `loaded` starts the loaders it names from loaded results: a Success
   * value, a list loader's page array, or a keyed loader's entries as
   * `loadedMany` takes them. Each slot is written at the args the loader
   * returns for the new Model and the given results, so a loader whose args
   * read another's result follows the new one, whatever the order of the keys
   * and whatever the slots held before. The view renders once. It throws if a
   * named loader is disabled, or a keyed entry's args aren't ones the loader
   * returns.
   */
  given(
    model: Component.Model<C> | ((model: Component.Model<C>) => Component.Model<C>),
    loaded?: {
      readonly [K in keyof Component.Loaders<C>]?: Component.Loaders<C>[K] extends Component.LoadMany<infer R>
        ? ReadonlyArray<KeyedLoad<R>>
        : Loader.Read.Success<ReadOf<Component.Loaders<C>[K]>>
    }
  ): this
  /**
   * Changes the props. A props change never reaches `update`: it re-renders the
   * view and changes the Subscription keys.
   */
  props(next: Component.Props<C> | ((props: Component.Props<C>) => Component.Props<C>)): this
  /** Sends a message to `update`. */
  send(message: Component.Message<C>): this
  /**
   * Clicks the one element `target` matches: the innermost element with a
   * `click` handler, that element or an ancestor, sends its message. A string
   * means `Query.text(target)`. Throws when nothing or several elements match,
   * or when nothing handles the click. `defaultPrevented` tells whether the
   * default was cancelled.
   */
  click(target: string | Query.Locator): this
  /**
   * Sends `event` with `payload`, `{}` by default, to the one element
   * `locator` matches: the innermost element with a handler for it, that
   * element or an ancestor, sends its message. Throws when nothing handles
   * it, except for `submit`, which the browser host cancels with or without a
   * handler. `defaultPrevented` tells whether the default was cancelled.
   */
  fire(locator: Query.Locator, event: string, payload?: unknown): this
  /** Sends the message the parent's `onEmit` maps `events` from the child with `key` to, if any. */
  childEmit(key: string, events: unknown): this
  /**
   * Sends the message the parent's `onFailure` maps a failure of the child with
   * `key` to, if any. The failure is passed as an `AsyncResult.Failure`.
   */
  childFailure(key: string, cause: Cause.Cause<unknown>): this

  /**
   * Resolves the oldest running Command matching `target` with the result it
   * would have produced, and sends the message.
   *
   * **Details**
   *
   * A definition matches by identity; an issued Command also matches the
   * arguments. `result` is the definition's own result, before any
   * `Command.map`, which is replayed to produce the component's message. A
   * queued run of the same group starts when the running one resolves.
   *
   * A Command issued with `Command.afterRefetch` becomes `awaiting` on the
   * component's own loaders its declared targets match, less those its
   * `writes` store, and sends at once when there are none. A `loaded` or
   * `loadFailed` step on the last of them writes the loader's slot, then
   * sends this one. `waitExpired` ends the wait by budget. Under `mode: "queue"`
   * a message also waits for the earlier ones of its group.
   */
  resolve<D extends Target>(target: D, result: Command.Result<D>): this
  /**
   * Fails the oldest running Command matching `target` with a typed failure
   * of its body, and sends the message its `Command.match` maps it to. A
   * stream Command ends. Throws for a Command whose body can't fail. A
   * failure doesn't wait for refetches.
   */
  fail<D extends Target>(target: D, error: Command.Failure<D>): this
  /** Sends one element of the oldest running stream Command matching `target`, which stays pending. */
  next<D extends StreamTarget>(target: D, result: Command.Result<D>): this
  /** Ends the oldest running stream Command matching `target`, sending nothing. */
  end<D extends StreamTarget>(target: D): this
  /**
   * Ends the `Command.afterRefetch` wait of the oldest awaiting Command
   * matching `target` by its budget, and sends its message. Throws when no
   * matching Command is waiting.
   */
  waitExpired(target: Target): this

  /**
   * Loads a loader with a Success: writes its slot at the loader's current
   * args, then sends the message of its `onChange`, if any. Throws when the
   * loader is disabled. For a list loader `value` is the page array, and
   * unless `waiting` it settles a pending load more.
   *
   * **Details**
   *
   * Unless `waiting` or `patched`, it is a settle: it ends a
   * `Command.afterRefetch` wait on the loader. It throws while a running or
   * queued Command's patch is live on the loader, since no fetch settles
   * under a live patch: only a `patched` value is written then. As in the
   * cache, a patch is live only when the slot held a Success at issue.
   */
  loaded<N extends Component.SingleNames<Component.Loaders<C>>>(
    name: N,
    value: Loader.Read.Success<ReadOf<Component.Loaders<C>[N]>>,
    options?: { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined }
  ): this
  /**
   * Loads one key of a `loadMany` loader with a Success, as `loadedMany`
   * does with one entry.
   */
  loaded<N extends Component.KeyedNames<Component.Loaders<C>>>(
    name: N,
    args: Loader.Read.Args<ReadOf<Component.Loaders<C>[N]>>,
    value: Loader.Read.Success<ReadOf<Component.Loaders<C>[N]>>,
    options?: { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined }
  ): this
  /**
   * Loads a loader with a typed failure, as `loaded` does. The failure keeps
   * the slot's last Success as `previousSuccess` when it holds one at the
   * loader's current args. Unless `waiting`, it settles a list loader's
   * pending load more.
   */
  loadFailed<N extends Component.SingleNames<Component.Loaders<C>>>(
    name: N,
    error: Loader.Read.Error<ReadOf<Component.Loaders<C>[N]>>,
    options?: { readonly waiting?: boolean | undefined }
  ): this
  /** Loads one key of a `loadMany` loader with a typed failure, as `loadedMany` does with one entry. */
  loadFailed<N extends Component.KeyedNames<Component.Loaders<C>>>(
    name: N,
    args: Loader.Read.Args<ReadOf<Component.Loaders<C>[N]>>,
    error: Loader.Read.Error<ReadOf<Component.Loaders<C>[N]>>,
    options?: { readonly waiting?: boolean | undefined }
  ): this
  /**
   * Settles a list loader's pending load more with its next page: writes the
   * loader's pages with `page` appended. Throws when no load more is
   * pending.
   */
  loadedMore<N extends Component.ListNames<Component.Loaders<C>>>(
    name: N,
    page: Loader.ListRead.Page<ReadOf<Component.Loaders<C>[N]>>
  ): this
  /**
   * Settles a list loader's pending load more with a failure: the pages stay,
   * and `more` is `Failed` with `error`. Throws when no load more is
   * pending.
   */
  loadMoreFailed<N extends Component.ListNames<Component.Loaders<C>>>(
    name: N,
    error: Loader.Read.Error<ReadOf<Component.Loaders<C>[N]>>
  ): this
  /**
   * Loads several keys of a `loadMany` loader in one write, as the runtime
   * writes a first emission or a batch: the slot holds the loader's stored
   * keys and these, and `onChange`'s `changes` holds these. Throws on args
   * the loader doesn't currently return.
   */
  loadedMany<N extends Component.KeyedNames<Component.Loaders<C>>>(
    name: N,
    entries: ReadonlyArray<KeyedLoad<ReadOf<Component.Loaders<C>[N]>>>
  ): this

  /** Checks the Model. `f` throws to fail the test. */
  model(f: (model: Component.Model<C>) => void): this
  /** Checks the view. `f` throws to fail the test. */
  view(f: (view: View.Node<Component.Message<C>, any>) => void): this
  /** Checks everything emitted so far. `f` throws to fail the test. */
  emitted(f: (emitted: ReadonlyArray<Component.Events<C>>) => void): this
  /** Checks the Subscription keys the current Model and props ask for. `f` throws to fail the test. */
  subscriptions(f: (keys: ReadonlyArray<string>) => void): this
  /** Checks the loaders and their current args. `f` throws to fail the test. */
  loaders(f: (loaders: ReadonlyArray<LoaderInfo>) => void): this
  /** Checks the whole story. `f` throws to fail the test. */
  check(f: (story: Steps<C>["current"]) => void): this

  /** Asserts that exactly these Commands are pending, in order. */
  expectExact(...targets: ReadonlyArray<Target>): this
  /** Asserts that a Command matching `target` is pending. */
  expectHas(target: Target): this
  /** Asserts that nothing is pending. */
  expectNone(): this
}

/**
 * Helper types for `Steps`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Steps {
  /**
   * A cursor over any component, for steps shared across components.
   *
   * @stability experimental
   * @category models
   * @since 4.1.5
   */
  export type Any = Steps<AnyComponent>
}

type Fields<Props, Model, Msg, Events> = Pick<
  Story<Props, Model, Msg, Events>,
  | "component"
  | "props"
  | "model"
  | "slots"
  | "pending"
  | "emitted"
  | "interrupted"
  | "dropped"
  | "loadingMore"
  | "defaultPrevented"
>

/**
 * Defers rendering until the view is first read, after the step's keyed
 * prunes settle. This skips intermediate records the runtime wouldn't render.
 */
const record = <Props, Model, Msg, Events>(
  fields: Fields<Props, Model, Msg, Events>,
  render: () => View.Node<Msg, any>
): Story<Props, Model, Msg, Events> => {
  let rendered: View.Node<Msg, any> | undefined
  const view = () => rendered ??= render()
  // A view value is a `Query` tree; a child slot is a node with no tag or text.
  const root = () => view() as Query.Node
  const context = () => boundOf(fields.component)?.context(fields.model, fields.props, fields.slots)
  return {
    component: fields.component,
    props: fields.props,
    model: fields.model,
    slots: fields.slots,
    loaded: () => context()?.loaded ?? {},
    pending: fields.pending,
    emitted: fields.emitted,
    interrupted: fields.interrupted,
    dropped: fields.dropped,
    loadingMore: fields.loadingMore,
    defaultPrevented: fields.defaultPrevented,
    view,
    subscriptions: () =>
      (fields.component.subscriptions?.(fields.model, fields.props, fields.slots) ?? []).map((sub) => sub.key),
    loaders: () => {
      const bound = boundOf(fields.component)
      if (bound === undefined) return []
      const current = context()!
      return bound.entries.map((entry) => ({
        name: entry.name,
        read: Loader.defOf(entry.read).name,
        args: current.argsOf(entry.name).args
      }))
    },
    get root() {
      return root()
    },
    get: (locator) => Query.get(root(), locator),
    query: (locator) => Query.query(root(), locator),
    all: (locator) => Query.all(root(), locator)
  }
}

const update = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  patch: Partial<Fields<Props, Model, Msg, Events>>
): Story<Props, Model, Msg, Events> => {
  const fields: Fields<Props, Model, Msg, Events> = {
    component: story.component,
    props: story.props,
    model: story.model,
    slots: story.slots,
    pending: story.pending,
    emitted: story.emitted,
    interrupted: story.interrupted,
    dropped: story.dropped,
    loadingMore: story.loadingMore,
    // Only a `click` or `fire` step sets it, last, once the step has settled.
    defaultPrevented: false,
    ...patch
  }
  // A defect in `view` fails the step that changed the Model, the slots, the props or what's pending.
  const view = fields.model === story.model && fields.slots === story.slots && fields.props === story.props &&
      fields.pending === story.pending && fields.loadingMore === story.loadingMore
    ? story.view
    : () => story.component.view(fields.model, fields.props, runningOf(fields.pending), fields.slots)
  return record(fields, view)
}

const boundOf = loaders.boundOf

const isKeyed = (story: Story<any, any, any, any>, name: string): boolean =>
  boundOf(story.component)?.byName.get(name)?.keyed === true

/** The loader called `name`, or a throw naming the step. */
const loaderOf = (story: Story<any, any, any, any>, step: string, name: string): loaders.Entry => {
  const entry = boundOf(story.component)?.byName.get(name)
  if (entry === undefined) throw new Error(`Story.${step}: "${name}" is not a loader of ${story.component.name}`)
  return entry
}

/** A loader's args for the story's Model, props and slots. */
const argsAt = (story: Story<any, any, any, any>, name: string) =>
  boundOf(story.component)!.context(story.model, story.props, story.slots).argsOf(name)

/**
 * Writes a loader's slot, then sends the message of its `onChange`, if any, as the runtime does.
 * A keyed loader's `onChange` also gets `changes`.
 */
const writeSlot = (
  story: Story<any, any, any, any>,
  entry: loaders.Entry,
  slot: unknown,
  changes: ReadonlyArray<loaders.KeyedChange>
): Story<any, any, any, any> => {
  const bound = boundOf(story.component)!
  // As in the runtime, the same snapshot writes nothing.
  if (Equal.equals((story.slots ?? bound.empty)[entry.name], slot)) return story
  const out = update(story, { slots: { ...(story.slots ?? bound.empty), [entry.name]: slot } })
  const message = bound.context(out.model, out.props, out.slots).changed(entry.name, changes)
  return message === undefined ? out : dispatch(out, message.value)
}

/** The result a load step writes, from the loader's last Success at its current args. */
type Build = (
  previous: Option.Option<AsyncResult.Success<any, any>>
) => AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>

/** Writes `result` to a single or list loader's slot at its current args. */
const loadStep = (
  story: Story<any, any, any, any>,
  step: string,
  name: string,
  build: Build,
  patched: boolean,
  more?: Loader.More<any>
): Story<any, any, any, any> => {
  const entry = loaderOf(story, step, name)
  const current = argsAt(story, name)
  if (current.argsKey === undefined) {
    throw new Error(`Story.${step}: the loader "${name}" is disabled for the current Model and props`)
  }
  const result = build(storedAt(story, name, current.argsKey))
  const def = Loader.defOf(entry.read)
  const slot = boundOf(story.component)!.slot(
    entry,
    { args: current.args, argsKey: current.argsKey },
    result,
    patched,
    more ?? (def.list !== undefined && result._tag === "Success" ? moreOfPages(def, result.value) : undefined)
  )
  return writeSlot(story, entry, slot, [])
}

/** The slot's last Success at `argsKey`: its value, or a Failure's previous one. */
const storedAt = (
  story: Story<any, any, any, any>,
  name: string,
  argsKey: string
): Option.Option<AsyncResult.Success<any, any>> => {
  const data = Loader.snapshotData(story.slots?.[name])
  const stored = data?.argsKey === argsKey ? data.result : undefined
  return stored === undefined
    ? Option.none()
    : stored._tag === "Success"
    ? Option.some(stored)
    : stored.previousSuccess
}

/**
 * The slots `given` starts from, written with no `onChange` message. Each
 * named loader holds its given results at the args it returns, and a keyed
 * loader that isn't named keeps the keys it held before that it still returns. Args can
 * read other loaders' results, so the writes repeat until none changes: the
 * result doesn't depend on the order of the names or on the slots held before.
 */
const givenSlots = (
  story: Story<any, any, any, any>,
  loaded: { readonly [name: string]: unknown }
): Component.Slots | undefined => {
  for (const name of Object.keys(loaded)) loaderOf(story, "given", name)
  const bound = boundOf(story.component)
  if (bound === undefined) return story.slots
  const before = story.slots ?? bound.empty
  const slots: { [name: string]: unknown } = { ...before }
  // The slot a loader should hold for the current slots, or undefined while a named loader is
  // disabled or doesn't return the given args.
  const target = (entry: loaders.Entry): unknown => {
    const current = bound.context(story.model, story.props, { ...slots }).argsOf(entry.name)
    if (!Object.hasOwn(loaded, entry.name)) {
      // From the slots held before: a key an earlier round dropped can come back once the args settle.
      const held = Loader.snapshotMapData(before[entry.name])?.entries
      return bound.slotMany(
        entry,
        current.entries!.flatMap((key) => {
          const stored = held?.get(key.argsKey)
          return stored === undefined ? [] : [stored]
        })
      )
    }
    const def = Loader.defOf(entry.read)
    if (entry.keyed) {
      const keys = current.entries!
      const snapshots: Array<unknown> = []
      for (const load of loaded[entry.name] as ReadonlyArray<KeyedLoad<any>>) {
        const key = keys.find((key) => key.argsKey === def.argsKey(load.args))
        if (key === undefined) return undefined
        const result = "value" in load
          ? AsyncResult.success(load.value, { waiting: load.waiting, timestamp: 0 })
          : AsyncResult.failure(Cause.fail(load.error), { waiting: load.waiting })
        snapshots.push(bound.slot(entry, key, result as any, false, undefined))
      }
      return bound.slotMany(entry, snapshots)
    }
    if (current.argsKey === undefined) return undefined
    const value = loaded[entry.name]
    return bound.slot(
      entry,
      { args: current.args, argsKey: current.argsKey },
      AsyncResult.success(value, { timestamp: 0 }),
      false,
      def.list !== undefined ? moreOfPages(def, value as ReadonlyArray<unknown>) : undefined
    )
  }
  const written = bound.entries.filter((entry) => entry.keyed || Object.hasOwn(loaded, entry.name))
  // Each round settles at least one more level of loaders whose args read another's result, so a
  // write still due after a round per loader never settles.
  for (let round = 0, changed = true; changed; round++) {
    changed = false
    for (const entry of written) {
      const next = target(entry)
      if (next === undefined || Equal.equals(slots[entry.name], next)) continue
      if (round > written.length) {
        throw new Error(
          `Story.given: the loader "${entry.name}" doesn't settle: its args keep changing with the given results`
        )
      }
      slots[entry.name] = next
      changed = true
    }
  }
  const unmet = written.find((entry) => target(entry) === undefined)
  if (unmet !== undefined) {
    throw new Error(
      `Story.given: the loader "${unmet.name}" is disabled, or doesn't return the given args, for the Model and props`
    )
  }
  return slots
}

/** Whether a page array has a next page, by the definition's `next`. */
const moreOfPages = (def: ReturnType<typeof Loader.defOf>, pages: ReadonlyArray<unknown>): Loader.More<never> =>
  pages.length > 0 && Option.isSome(def.list!.next(pages[pages.length - 1], pages))
    ? { _tag: "Available" }
    : { _tag: "End" }

const listLoader = (story: Story<any, any, any, any>, step: string, name: string): void => {
  if (boundOf(story.component)?.byName.get(name)?.list !== true) {
    throw new Error(`Story.${step}: "${name}" is not a list loader of ${story.component.name}`)
  }
}

/** Settles a loader's pending load more with `result`, written at its pages. A live patch makes it throw. */
const settleMore = (
  story: Story<any, any, any, any>,
  step: string,
  name: string,
  pagesOf: (pages: ReadonlyArray<unknown>) => ReadonlyArray<unknown>,
  more?: Loader.More<any>
): Story<any, any, any, any> => {
  listLoader(story, step, name)
  const argsKey = argsAt(story, name).argsKey
  if (argsKey !== undefined) checkUnpatched(story, step, name, argsKey)
  if (!story.loadingMore.includes(name)) {
    throw new Error(`Story.${step}: no load more of "${name}" is pending`)
  }
  return loadStep(
    settlePending(story, name),
    step,
    name,
    (previous) => {
      if (Option.isNone(previous)) throw new Error(`Story.${step}: "${name}" holds no pages at its args`)
      return AsyncResult.success(pagesOf(previous.value.value), { timestamp: previous.value.timestamp })
    },
    false,
    more
  )
}

/**
 * A `$.loadMore` or `$.reset` from `update`, as the runtime runs it at the loader's
 * current args: a load more is pending, and writes `Loading`; a reset writes the
 * first page, waiting, and ends a pending load more.
 */
const applyList = (story: Story<any, any, any, any>, list: Component.ListIssue): Story<any, any, any, any> => {
  const entry = boundOf(story.component)?.byName.get(list.name)
  if (entry === undefined || !entry.list) return story
  const argsKey = argsAt(story, list.name).argsKey
  if (argsKey === undefined) return story
  const previous = storedAt(story, list.name, argsKey)
  const def = Loader.defOf(entry.read)
  const data = Loader.snapshotData(story.slots?.[list.name])
  if (list.op === "loadMore") {
    if (story.loadingMore.includes(list.name)) return story
    // At the end, or with nothing held at these args, nothing is written and nothing waits.
    if (Option.isNone(previous) || moreOfPages(def, previous.value.value)._tag === "End") return story
    const loading = update(story, { loadingMore: [...story.loadingMore, list.name] })
    if (data?.result?._tag !== "Success") return loading
    return loadStep(
      loading,
      "loadMore",
      list.name,
      () => data.result as AsyncResult.Success<any, any>,
      data.patched,
      { _tag: "Loading" }
    )
  }
  const reset = settlePending(story, list.name)
  if (Option.isNone(previous)) return reset
  const first = AsyncResult.success(previous.value.value.slice(0, 1), { timestamp: previous.value.timestamp })
  return loadStep(
    reset,
    "reset",
    list.name,
    // A Failure stays one, over the first page only, while the walk runs.
    () =>
      data?.result?._tag === "Failure"
        ? AsyncResult.failure(data.result.cause, { previousSuccess: Option.some(first), waiting: true })
        : AsyncResult.success(first.value, { timestamp: first.timestamp, waiting: true }),
    false
  )
}

/** Ends a list loader's pending load more: a settle, Success or Failure, ends the walk it waits on. */
const settlePending = (story: Story<any, any, any, any>, name: string): Story<any, any, any, any> =>
  story.loadingMore.includes(name)
    ? update(story, { loadingMore: story.loadingMore.filter((other) => other !== name) })
    : story

/** A `loadMany` loader and its unique args, or a throw naming the step. */
const keyedLoader = (
  story: Story<any, any, any, any>,
  step: string,
  name: string
): { readonly entry: loaders.Entry; readonly keys: ReadonlyArray<loaders.Keyed> } => {
  const entry = boundOf(story.component)?.byName.get(name)
  if (entry === undefined || !entry.keyed) {
    throw new Error(`Story.${step}: "${name}" is not a loadMany loader of ${story.component.name}`)
  }
  return { entry, keys: argsAt(story, name).entries! }
}

/**
 * Writes a keyed loader's slot as the runtime does: the stored keys the
 * loader still returns, with `loads` over them, and `changes` holds
 * `loads`.
 */
const writeKeyed = (
  story: Story<any, any, any, any>,
  entry: loaders.Entry,
  keys: ReadonlyArray<loaders.Keyed>,
  loads: ReadonlyArray<
    { readonly argsKey: string; readonly result: AsyncResult.AsyncResult<any, any>; readonly patched: boolean }
  >
): Story<any, any, any, any> => {
  const bound = boundOf(story.component)!
  const held = Loader.snapshotMapData(story.slots?.[entry.name])?.entries
  const byKey = new Map(loads.map((load) => [load.argsKey, load]))
  const slot = bound.slotMany(
    entry,
    keys.flatMap((key) => {
      const load = byKey.get(key.argsKey)
      if (load !== undefined) return [bound.slot(entry, key, load.result as any, load.patched, undefined)]
      const stored = held?.get(key.argsKey)
      return stored === undefined ? [] : [stored]
    })
  )
  const changes = keys.flatMap((key) => {
    const load = byKey.get(key.argsKey)
    return load === undefined ? [] : [{ args: key.args, result: load.result }]
  })
  return writeSlot(story, entry, slot, changes)
}

/** Loads keys of a keyed loader: each args must be one the loader currently returns. */
const loadKeyedStep = (
  story: Story<any, any, any, any>,
  step: string,
  name: string,
  loads: ReadonlyArray<KeyedLoad<any>>
): Story<any, any, any, any> => {
  const { entry, keys } = keyedLoader(story, step, name)
  const def = Loader.defOf(entry.read)
  const held = Loader.snapshotMapData(story.slots?.[name])?.entries
  const settled = new Set<string>()
  const written = writeKeyed(
    story,
    entry,
    keys,
    loads.map((load) => {
      const argsKey = def.argsKey(load.args)
      if (!keys.some((key) => key.argsKey === argsKey)) {
        throw new Error(
          `Story.${step}: the loader "${name}" doesn't return the args ${def.logKey(load.args, argsKey)}`
        )
      }
      const patched = "value" in load && load.patched === true
      if (!patched) checkUnpatched(story, step, name, argsKey)
      if (!patched && load.waiting !== true) settled.add(argsKey)
      return {
        argsKey,
        result: "value" in load
          ? AsyncResult.success(load.value, { waiting: load.waiting, timestamp: 0 })
          : AsyncResult.failWithPrevious(load.error, {
            previous: Option.fromUndefinedOr(Loader.snapshotData(held?.get(argsKey))?.result),
            waiting: load.waiting
          }),
        patched
      }
    })
  )
  // After the slot's write: the wait's own message comes second.
  return settleWaits(written, (awaited) => awaited.name === name && settled.has(def.argsKey(awaited.args)))
}

/** How many rounds of prunes one step may write before it throws. */
const pruneRounds = 100

/**
 * After a step: a keyed loader whose slot holds a key it no longer returns
 * gets the slot pruned, with no changes, as the runtime's drain writes it. A
 * prune's `onChange` can change the key set again, so rounds run until none
 * is due, at most one write per loader per round. The runtime doesn't bound
 * them; a step throws after `pruneRounds`.
 */
const pruneKeyed = (story: Story<any, any, any, any>): Story<any, any, any, any> => {
  const bound = boundOf(story.component)
  if (bound === undefined) return story
  let out = story
  for (let round = 0;; round++) {
    let pruned = false
    for (const entry of bound.entries) {
      if (!entry.keyed) continue
      const held = Loader.snapshotMapData(out.slots?.[entry.name])
      if (held === undefined || held.entries.size === 0) continue
      const keys = argsAt(out, entry.name).entries!
      const declared = new Set(keys.map((key) => key.argsKey))
      if (Array.from(held.entries.keys()).every((key) => declared.has(key))) continue
      if (round === pruneRounds) {
        throw new Error(
          `Story: ${story.component.name}'s loader "${entry.name}" was still pruned after ${pruneRounds} rounds in one step. Each prune's onChange changes its key set again, and the runtime would prune without limit.`
        )
      }
      out = writeKeyed(out, entry, keys, [])
      pruned = true
    }
    if (!pruned) return out
  }
}

/** `h.isRunning` in a story: derived from what's pending. */
const runningOf = (pending: ReadonlyArray<Pending<any>>) => (name: string, groupKey: string | undefined): boolean =>
  pending.some((entry) =>
    entry.command.name === name && (groupKey === undefined || entry.command.groupKey === groupKey)
  )

const toEntries = <Msg>(pending: ReadonlyArray<Pending<Msg>>): Array<schedule.Entry<Pending<Msg>>> =>
  pending.map((entry) => ({
    name: entry.command.name,
    key: entry.command.groupKey,
    mode: entry.command.mode,
    status: entry.status,
    value: entry
  }))

/**
 * Applies what `init` or `update` returned: the Model, the Commands through `schedule`, and the events.
 * As in the runtime, a cut run that awaits delivers its message inside this `update`, before the
 * Command that cut it is added.
 */
const apply = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  next: Component.Next<Model, Msg, Events, any>
): Story<Props, Model, Msg, Events> => {
  let out = update(story, { model: next.model })
  for (const command of next.commands) {
    const decision = schedule.schedule(toEntries(out.pending), command)
    if (decision.interrupt.length > 0) {
      const gone = new Set(decision.interrupt.map((entry) => entry.value))
      out = update(out, {
        pending: out.pending.filter((entry) => !gone.has(entry)),
        interrupted: [
          ...out.interrupted,
          ...decision.interrupt.flatMap((entry) => entry.value.status === "awaiting" ? [] : [entry.value.command])
        ]
      })
      for (const entry of decision.interrupt) {
        if (entry.value.status === "awaiting") out = dispatch(out, entry.value.message)
      }
    }
    if (command._tag === "Interrupt") continue
    switch (decision.action) {
      case "start":
      case "queue": {
        const entry: Pending<Msg> = { command, status: decision.action === "start" ? "running" : "queued" }
        livePatches.set(entry, registeredPatches(out, command))
        out = update(out, { pending: [...out.pending, entry] })
        break
      }
      case "drop":
        out = update(out, { dropped: [...out.dropped, command] })
        break
      case "none":
        break
    }
  }
  out = update(out, { emitted: [...out.emitted, ...next.events] })
  for (const list of next.lists ?? []) out = applyList(out, list)
  return out
}

/**
 * A run's fiber exited: with a message it is awaiting, on `awaiting` or behind an earlier message of
 * its queue, and without one it leaves. The next queued run of its group starts either way.
 */
const exited = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  entry: Pending<Msg>,
  held: { readonly message: Msg; readonly awaiting: ReadonlyArray<AwaitedLoader> } | undefined
): Story<Props, Model, Msg, Events> => {
  const awaiting: Pending<Msg> | undefined = held === undefined
    ? undefined
    : { command: entry.command, status: "awaiting", message: held.message, awaiting: held.awaiting }
  const next = schedule.next(toEntries(story.pending.filter((other) => other !== entry)), toEntries([entry])[0])
  const pending = story.pending.flatMap((other): Array<Pending<Msg>> => {
    if (other === entry) return awaiting === undefined ? [] : [awaiting]
    if (other !== next?.value) return [other]
    const running: Pending<Msg> = { command: other.command, status: "running" }
    livePatches.set(running, livePatches.get(other) ?? [])
    return [running]
  })
  const out = update(story, { pending })
  return awaiting === undefined ? out : release(out, awaiting)
}

/** Delivers the messages of `entry`'s group that can go now, in the order `schedule.deliverable` gives. */
const release = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  entry: Pending<Msg>
): Story<Props, Model, Msg, Events> => {
  let out = story
  for (;;) {
    const next = schedule.deliverable(
      toEntries(out.pending),
      toEntries([entry])[0],
      (other) => other.awaiting === undefined || other.awaiting.length === 0
    )
    if (next === undefined) return out
    out = dispatch(update(out, { pending: out.pending.filter((other) => other !== next.value) }), next.value.message)
  }
}

/** Takes awaited loaders off the awaiting runs, delivering what a wait that ends lets go. */
const settleWaits = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  settled: (awaited: AwaitedLoader) => boolean
): Story<Props, Model, Msg, Events> => {
  let out = story
  for (const entry of story.pending) {
    if (entry.awaiting === undefined || !entry.awaiting.some(settled) || !out.pending.includes(entry)) continue
    const rest: Pending<Msg> = { ...entry, awaiting: entry.awaiting.filter((awaited) => !settled(awaited)) }
    out = update(out, { pending: out.pending.map((other) => other === entry ? rest : other) })
    if (rest.awaiting!.length === 0) out = release(out, rest)
  }
  return out
}

/**
 * A single or list loader's `loaded` or `loadFailed`: unless `patched`, a live patch makes it throw,
 * and unless `waiting` too, it settles the loader's entry for the waits on it, after its write.
 */
const settleStep = (
  story: Story<any, any, any, any>,
  step: string,
  name: string,
  patched: boolean,
  waiting: boolean,
  build: Build
): Story<any, any, any, any> => {
  const entry = loaderOf(story, step, name)
  const argsKey = argsAt(story, name).argsKey
  if (!patched && argsKey !== undefined) checkUnpatched(story, step, name, argsKey)
  // A settle ends the walk a list's pending load more waits on, unless a walk is still running.
  const loaded = loadStep(waiting ? story : settlePending(story, name), step, name, build, patched)
  return patched || waiting ? loaded : settleWaits(
    loaded,
    (awaited) => awaited.name === name && Loader.defOf(entry.read).argsKey(awaited.args) === argsKey
  )
}

/** The component's own loaders, each with the entries it is at: one per args it returns now. */
function* currentEntries(
  story: Story<any, any, any, any>
): Generator<{ readonly loader: loaders.Entry; readonly entries: ReadonlyArray<loaders.Keyed> }> {
  const bound = boundOf(story.component)
  if (bound === undefined) return
  const context = bound.context(story.model, story.props, story.slots)
  for (const loader of bound.entries) {
    const current = context.argsOf(loader.name)
    yield {
      loader,
      entries: current.entries ??
        (current.argsKey === undefined ? [] : [{ args: current.args, argsKey: current.argsKey }])
    }
  }
}

/**
 * What a `Command.afterRefetch` run resolved with `result` waits for: the component's own loaders,
 * at their current args, that its declared targets match, less the entries its `writes` store.
 */
const awaitedLoaders = (
  story: Story<any, any, any, any>,
  command: Command.Issued<any, any, never, "Effect"> | Command.Issued<any, any, never, "Stream">,
  result: unknown
): ReadonlyArray<AwaitedLoader> => {
  const budget = command.afterRefetch
  if (command._tag !== "Effect" || budget === undefined || Duration.isZero(budget)) return []
  if (boundOf(story.component) === undefined) return []
  const written = (command.writes?.(result) ?? []).map((write) => ({
    name: Loader.defOf(write.read).name,
    argsKey: Loader.defOf(write.read).argsKey(write.args)
  }))
  const out: Array<AwaitedLoader> = []
  for (const { entries, loader } of currentEntries(story)) {
    const read = Loader.defOf(loader.read).name
    for (const { args, argsKey } of entries) {
      if (!Loader.invalidatesEntry(command, loader.read, args)) continue
      if (written.some((write) => write.name === read && write.argsKey === argsKey)) continue
      out.push({ name: loader.name, args })
    }
  }
  return out
}

/**
 * Patches registered at issue, by loader name and args key. As in the cache, only entries that
 * held a Success then register a patch; cold or failed entries don't delay settling.
 */
const livePatches = new WeakMap<Pending<any>, ReadonlyArray<{ readonly name: string; readonly argsKey: string }>>()

/** The component's own loaders, at their current args, that `command`'s patches register on. */
const registeredPatches = (
  story: Story<any, any, any, any>,
  command: Command.Issued<any, any, never, "Effect"> | Command.Issued<any, any, never, "Stream">
): ReadonlyArray<{ readonly name: string; readonly argsKey: string }> => {
  if (command.optimistic.length === 0) return []
  const out: Array<{ readonly name: string; readonly argsKey: string }> = []
  for (const { entries, loader } of currentEntries(story)) {
    const slot = story.slots?.[loader.name]
    const held = loader.keyed ? Loader.snapshotMapData(slot)?.entries : undefined
    for (const { args, argsKey } of entries) {
      const data = Loader.snapshotData(held !== undefined ? held.get(argsKey) : slot)
      if (data?.argsKey !== argsKey || data.result?._tag !== "Success") continue
      if (!Loader.invalidatesEntry({ invalidates: [], optimistic: command.optimistic }, loader.read, args)) continue
      out.push({ name: loader.name, argsKey })
    }
  }
  return out
}

/**
 * Throws when a running or queued Command's optimistic patch is live on the entry of loader `name`
 * at `argsKey`: the runtime settles no fetch there, so only a patched value can be written.
 */
const checkUnpatched = (story: Story<any, any, any, any>, step: string, name: string, argsKey: string): void => {
  const patcher = story.pending.find((entry) =>
    entry.status !== "awaiting" &&
    livePatches.get(entry)?.some((patch) => patch.name === name && patch.argsKey === argsKey) === true
  )
  if (patcher !== undefined) {
    throw new Error(
      `Story.${step}: "${name}" is under the optimistic patch of ${
        describe(patcher.command)
      } [${patcher.status}], and no fetch settles under a live patch. Resolve or fail it first, or write the patched value with \`{ patched: true }\`.`
    )
  }
}

const describe = (
  command: Command.Issued<any, any, never, "Effect"> | Command.Issued<any, any, never, "Stream">
): string => `${command.name}(${JSON.stringify(MessageLog.encodeArgs(command.argsSchema, command.args))})`

const describePending = (pending: ReadonlyArray<Pending<any>>): string =>
  pending.length === 0 ?
    "nothing" :
    pending.map((entry) =>
      `${describe(entry.command)} [${entry.status}${
        entry.awaiting === undefined || entry.awaiting.length === 0
          ? ""
          : ` on ${entry.awaiting.map((awaited) => awaited.name).join(", ")}`
      }]`
    ).join(", ")

const matches = (target: Target, entry: Pending<any>): boolean => {
  if (Command.isDefinition(target)) return entry.command.name === Command.nameOf(target)
  return entry.command.name === target.name && Equal.equals(entry.command.args, target.args)
}

const describeTarget = (target: Target): string =>
  Command.isDefinition(target) ? Command.nameOf(target) : describe(target)

const findRunning = (story: Story<any, any, any, any>, target: Target, step: string): Pending<any> => {
  const entry = story.pending.find((entry) => entry.status === "running" && matches(target, entry))
  if (entry === undefined) {
    throw new Error(`Story.${step}: no running ${describeTarget(target)}; pending: ${describePending(story.pending)}`)
  }
  return entry
}

const handle = <Msg, Payload>(handler: View.Handler<Msg, Payload>, payload: Payload): Msg | undefined =>
  typeof handler === "function" ? (handler as (payload: Payload) => Msg | undefined)(payload) : handler

const dispatch = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  message: Msg | undefined
): Story<Props, Model, Msg, Events> =>
  message === undefined ? story : apply(story, story.component.update(story.model, message, story.props, story.slots))

/** `node` and its ancestors in `root`, innermost first, or `undefined` when `node` isn't in `root`. */
const pathTo = (root: View.Node<any, any>, node: Query.Node): Array<View.Node<any, any>> | undefined => {
  if (root === node) return [root]
  if (root._tag !== "Element") return undefined
  for (const child of root.children) {
    const path = pathTo(child, node)
    if (path !== undefined) {
      path.push(root)
      return path
    }
  }
  return undefined
}

/**
 * Sends `event` to the one element `locator` matches, bubbling to the
 * innermost element that handles it, and tells whether its default was
 * cancelled. Every element in a story is the app's, so a `submit` is always
 * cancelled, and needs no handler.
 */
const fireAt = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  locator: Query.Locator,
  event: string,
  payload: unknown,
  step: string
): { readonly story: Story<Props, Model, Msg, Events>; readonly prevented: boolean } => {
  const found = story.all(locator)
  if (found.length !== 1) {
    throw new Error(
      `Story.${step}: ${
        found.length === 0 ? "nothing matches" : `${found.length} elements match`
      } ${locator.description}`
    )
  }
  const view = story.view()
  const handler = pathTo(view, found[0])?.find((node): node is View.Element<Msg, any> =>
    node._tag === "Element" && Object.hasOwn(node.handlers, event)
  )
  const submit = event === "submit"
  if (handler === undefined) {
    if (submit) return { story, prevented: true }
    throw new Error(`Story.${step}: nothing handles "${event}" at ${locator.description}`)
  }
  // Run once: the message decides whether the default is cancelled, then it's sent.
  const message = handle(handler.handlers[event], payload)
  const preventDefault = handler.eventOptions[event]?.preventDefault
  const prevented = submit || preventDefault === "always" || (message !== undefined && preventDefault === true)
  return { story: dispatch(story, message), prevented }
}

// Pending Commands are stored with their Source erased; `findRunning` matched `target`, so
// `result` is the Source of this entry's Command.
const resolveWith = (entry: Pending<any>, result: unknown): any =>
  (entry.command.resolve as (result: unknown) => unknown)(result)

const findStream = (story: Story<any, any, any, any>, target: StreamTarget, step: string): Pending<any> => {
  const entry = findRunning(story, target, step)
  if (entry.command._tag !== "Stream") {
    throw new Error(`Story.${step}: ${describe(entry.command)} is not a stream Command`)
  }
  return entry
}

class StepsImpl implements Steps<AnyComponent> {
  current: Story<any, any, any, any, any>
  constructor(current: Story<any, any, any, any, any>) {
    this.current = current
    current.view()
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  private step(next: Story<any, any, any, any>, defaultPrevented = false): this {
    const settled = next === this.current ? next : pruneKeyed(next)
    // Set on the settled record, so a step that changed nothing still resets it.
    this.current = settled.defaultPrevented === defaultPrevented ? settled : update(settled, { defaultPrevented })
    // Rendered once the step has settled, so a defect in `view` fails it.
    this.current.view()
    return this
  }

  given(model: unknown, loaded?: { readonly [name: string]: unknown }): this {
    const next = typeof model === "function" ? model(this.current.model) : model
    const out = update(this.current, {
      model: next,
      pending: [],
      emitted: [],
      interrupted: [],
      dropped: [],
      loadingMore: []
    })
    // Settled here, with no onChange message: the step's own prune then has nothing to write.
    return this.step(update(out, { slots: givenSlots(out, loaded ?? {}) }))
  }
  props(next: unknown): this {
    const props = typeof next === "function" ? next(this.current.props) : next
    return this.step(update(this.current, { props }))
  }
  send(message: unknown): this {
    return this.step(dispatch(this.current, message))
  }
  click(target: string | Query.Locator): this {
    const locator = typeof target === "string" ? Query.text(target) : target
    const { prevented, story } = fireAt(this.current, locator, "click", {}, "click")
    return this.step(story, prevented)
  }
  fire(locator: Query.Locator, event: string, payload: unknown = {}): this {
    const { prevented, story } = fireAt(this.current, locator, event, payload, "fire")
    return this.step(story, prevented)
  }
  childEmit(key: string, events: unknown): this {
    return this.step(dispatch(this.current, findChild(this.current.view(), key, "childEmit").onEmit(events)))
  }
  childFailure(key: string, cause: Cause.Cause<unknown>): this {
    const child = findChild(this.current.view(), key, "childFailure")
    return this.step(dispatch(this.current, child.onFailure?.(AsyncResult.failure(cause))))
  }

  resolve(target: Target, result: unknown): this {
    const entry = findRunning(this.current, target, "resolve")
    return this.step(exited(this.current, entry, {
      message: resolveWith(entry, result),
      awaiting: awaitedLoaders(this.current, entry.command, result)
    }))
  }
  fail(target: Target, error: unknown): this {
    const entry = findRunning(this.current, target, "fail")
    const reject = entry.command.reject as ((error: unknown) => unknown) | undefined
    if (reject === undefined) {
      throw new Error(`Story.fail: ${describe(entry.command)} has no typed failure mapped by Command.match`)
    }
    return this.step(exited(this.current, entry, { message: reject(error), awaiting: [] }))
  }
  next(target: StreamTarget, result: unknown): this {
    return this.step(dispatch(this.current, resolveWith(findStream(this.current, target, "next"), result)))
  }
  end(target: StreamTarget): this {
    return this.step(exited(this.current, findStream(this.current, target, "end"), undefined))
  }
  waitExpired(target: Target): this {
    const entry = this.current.pending.find((entry) =>
      entry.awaiting !== undefined && entry.awaiting.length > 0 && matches(target, entry)
    )
    if (entry === undefined) {
      throw new Error(
        `Story.waitExpired: no ${describeTarget(target)} is waiting on refetches; pending: ${
          describePending(this.current.pending)
        }`
      )
    }
    return this.step(settleWaits(this.current, (awaited) => entry.awaiting!.includes(awaited)))
  }
  loaded(name: string, ...rest: Array<any>): this {
    if (isKeyed(this.current, name)) {
      const [args, value, options] = rest
      return this.step(loadKeyedStep(this.current, "loaded", name, [{ args, value, ...options }]))
    }
    const [value, options] = rest as [
      unknown,
      { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined } | undefined
    ]
    return this.step(
      settleStep(
        this.current,
        "loaded",
        name,
        options?.patched === true,
        options?.waiting === true,
        () => AsyncResult.success(value, { waiting: options?.waiting, timestamp: 0 })
      )
    )
  }
  loadedMore(name: string, page: unknown): this {
    return this.step(settleMore(this.current, "loadedMore", name, (pages) => [...pages, page]))
  }
  loadMoreFailed(name: string, error: unknown): this {
    return this.step(settleMore(this.current, "loadMoreFailed", name, (pages) => pages, { _tag: "Failed", error }))
  }
  loadFailed(name: string, ...rest: Array<any>): this {
    if (isKeyed(this.current, name)) {
      const [args, error, options] = rest
      return this.step(loadKeyedStep(this.current, "loadFailed", name, [{ args, error, waiting: options?.waiting }]))
    }
    const [error, options] = rest as [unknown, { readonly waiting?: boolean | undefined } | undefined]
    return this.step(
      settleStep(
        this.current,
        "loadFailed",
        name,
        false,
        options?.waiting === true,
        (previousSuccess) => AsyncResult.failure(Cause.fail(error), { previousSuccess, waiting: options?.waiting })
      )
    )
  }
  loadedMany(name: string, entries: ReadonlyArray<KeyedLoad<any>>): this {
    return this.step(loadKeyedStep(this.current, "loadedMany", name, entries))
  }

  model(f: (model: any) => void): this {
    f(this.current.model)
    return this
  }
  view(f: (view: View.Node<any, any>) => void): this {
    f(this.current.view())
    return this
  }
  emitted(f: (emitted: ReadonlyArray<any>) => void): this {
    f(this.current.emitted)
    return this
  }
  subscriptions(f: (keys: ReadonlyArray<string>) => void): this {
    f(this.current.subscriptions())
    return this
  }
  loaders(f: (loaders: ReadonlyArray<LoaderInfo>) => void): this {
    f(this.current.loaders())
    return this
  }
  check(f: (story: Story<any, any, any, any, any>) => void): this {
    f(this.current)
    return this
  }

  expectExact(...targets: ReadonlyArray<Target>): this {
    const pending = this.current.pending
    if (pending.length !== targets.length || !targets.every((target, index) => matches(target, pending[index]))) {
      throw new Error(
        `Story.expectExact: expected ${
          targets.length === 0 ? "nothing" : targets.map(describeTarget).join(", ")
        }; pending: ${describePending(pending)}`
      )
    }
    return this
  }
  expectHas(target: Target): this {
    const pending = this.current.pending
    if (!pending.some((entry) => matches(target, entry))) {
      throw new Error(`Story.expectHas: ${describeTarget(target)} is not pending; pending: ${describePending(pending)}`)
    }
    return this
  }
  expectNone(): this {
    if (this.current.pending.length > 0) {
      throw new Error(`Story.expectNone: pending: ${describePending(this.current.pending)}`)
    }
    return this
  }
}

/**
 * Runs a story: `init` with `props`, then the steps `f` calls on the cursor.
 *
 * **Details**
 *
 * `f` doesn't need to return the cursor, so a chained arrow and a block of
 * statements both work. `make` returns the final story so a test can read it,
 * and throws if a Command is still pending at the end.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = <C extends AnyComponent>(
  component: C,
  props: Component.Props<C>,
  f: (steps: Steps<C>) => void
): Steps<C>["current"] => {
  const steps = start(component, props)
  f(steps)
  const story = steps.current
  if (story.pending.length > 0) {
    throw new Error(`Story.make: Commands still pending at the end: ${describePending(story.pending)}`)
  }
  if (story.loadingMore.length > 0) {
    throw new Error(
      `Story.make: a load more still pending at the end on ${
        story.loadingMore.map((name) => JSON.stringify(name)).join(", ")
      }`
    )
  }
  return story
}

/**
 * The cursor after `init`, with no check on what's pending at the end.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const start = <C extends AnyComponent>(component: C, props: Component.Props<C>): Steps<C> => {
  const first = component.init(props)
  const empty = record<any, any, any, any>({
    // The record is stored with its types erased; `Steps<C>` restores them.
    component: component as Component.Component<any, any, any, any, any, any, any>,
    props,
    model: first.model,
    slots: undefined,
    pending: [],
    emitted: [],
    interrupted: [],
    dropped: [],
    loadingMore: [],
    defaultPrevented: false
  }, () => component.view(first.model, props, runningOf([]), undefined))
  return new StepsImpl(apply(empty, first)) as Steps<C>
}

/**
 * The child slots declared in a view, optionally filtered by component or
 * feature service.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const children = <Msg>(
  view: View.Node<Msg, any>,
  component?: Component.Any | { readonly key: string }
): ReadonlyArray<View.Child<Msg, any>> =>
  [...View.nodes(view)].filter((node): node is View.Child<Msg, any> =>
    node._tag === "Child" && (component === undefined || node.component === component)
  )

const findChild = <Msg>(view: View.Node<Msg, any>, key: string, step: string): View.Child<Msg, any> => {
  const child = children(view).find((child) => child.key === key)
  if (child === undefined) {
    throw new Error(
      `Story.${step}: no child with key "${key}"; children: ${children(view).map((c) => c.key).join(", ")}`
    )
  }
  return child
}

/**
 * What the slot with `key` shows for `result`: its `fallback` evaluated with an
 * `AsyncResult.Initial` or `AsyncResult.Failure`, or `undefined` without one.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const fallback = <Msg>(
  view: View.Node<Msg, any>,
  key: string,
  result: AsyncResult.Initial<never, unknown> | AsyncResult.Failure<never, unknown>
): View.Node<Msg, any> | undefined => {
  const fallback = findChild(view, key, "fallback").fallback
  return fallback === undefined ? undefined : View.toNode(fallback(result))
}

/**
 * The message `Component.provide`'s `onFailure` maps a Layer failure to, or
 * `undefined` when the component has none.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const layerFailure = <C extends Component.Any>(
  component: C,
  failure: AsyncResult.Failure<never, any>
): Component.Message<C> | undefined => component.layerFailure?.(failure)

/**
 * One instance's head entries for a Model and props, or for a story's Model,
 * props and loaders: what its `head` option returns, or none without one.
 * The merge across the tree is a runtime test's.
 *
 * **Details**
 *
 * Given a component, every loader slot is empty: each loader opens at the
 * args it returns for the Model and props, as on a first render. The props
 * may be left out when the component takes none.
 *
 * **Example** (A page's title)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Component, Head } from "effect/ui"
 * import { Story } from "effect/ui/testing"
 *
 * const Person = Component.make({
 *   name: "Person",
 *   model: Schema.Struct({ name: Schema.String }),
 *   message: Schema.Never,
 *   init: () => ({ name: "Ada" }),
 *   update: (model) => model,
 *   head: (model) => [Head.title(model.name)],
 *   view: (model, h) => h.el("h1", model.name)
 * })
 *
 * Story.head(Person, { name: "Grace" }) // => [Head.title("Grace")]
 * ```
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const head: {
  <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
    component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
    model: Model,
    ...props: {} extends Props ? [props?: Props] : [props: Props]
  ): ReadonlyArray<Head.Entry>
  <Props, Model, Msg, Events>(story: Story<Props, Model, Msg, Events>): ReadonlyArray<Head.Entry>
} = (
  self: Component.Component<any, any, any, any, any, any, any> | Story<any, any, any, any>,
  model?: unknown,
  props?: unknown
) =>
  "pending" in self
    ? self.component.head?.(self.model, self.props, self.slots) ?? []
    : self.head?.(model, props ?? {}, undefined) ?? []

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

/**
 * Where a replay first computed something other than what the log recorded.
 *
 * **Details**
 *
 * `recorded` and `recomputed` hold the Model, the events and the Commands
 * (encoded the way the Wire encodes them) after the message in entry `seq`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Divergence<Model, Msg, Events> {
  readonly seq: number
  readonly message: Msg
  readonly recorded: Outcome<Model, Events>
  readonly recomputed: Outcome<Model, Events>
}

/**
 * What one `update` produced, as a replay compares it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Outcome<Model, Events> {
  readonly model: Model
  readonly events: ReadonlyArray<Events>
  readonly commands: ReadonlyArray<ReturnType<typeof MessageLog.encodeCommand>>
  /** The `$.loadMore` and `$.reset` calls, compared and never run. */
  readonly lists: ReadonlyArray<Component.ListIssue>
}

/**
 * The result of `fromLog`: the state the replay reached (the Model, props and
 * loader slots), how many messages it re-ran, and the first divergence, if
 * any. On a divergence, the state is the one the diverging message was sent
 * to: the Model before it, and the props and slots its `update` read.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Replay<
  Model,
  Msg,
  Events,
  Loaded = { readonly [name: string]: unknown },
  Props = unknown
> {
  readonly path: string
  readonly model: Model
  /** The props the instance had, from its latest `Mounted`, `PropsChanged` or `Update` entry. */
  readonly props: Props
  /** The loader slots, beside the Model. Opaque: `loaded` opens them. */
  readonly slots: Component.Slots | undefined
  /** The loaders' results, by name, as `h.loaded` opens them for the Model, props and slots reached. */
  readonly loaded: () => Loaded
  readonly replayed: number
  readonly divergence: Divergence<Model, Msg, Events> | undefined
}

const placeholders = ["~unserialisable", "~redacted", "~truncated"]
const findPlaceholder = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null) return undefined
  for (const key of Object.keys(value)) {
    if (placeholders.includes(key)) return key
    const inner = findPlaceholder((value as any)[key])
    if (inner !== undefined) return inner
  }
  return undefined
}

const replayLog = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  entries: ReadonlyArray<MessageLog.Entry | MessageLog.Wire>,
  options?: { readonly path?: string | undefined }
): Replay<Model, Msg, Events, any, any> => {
  // The entries that carry an instance's state, each with its component.
  type Stateful =
    | MessageLog.Update
    | MessageLog.Mounted
    | MessageLog.LoaderChanged
    | MessageLog.PropsChanged
    | Extract<MessageLog.Wire, { _tag: "Update" | "Mounted" | "LoaderChanged" | "PropsChanged" }>
  const stateful = entries.filter((entry): entry is Stateful =>
    entry._tag === "Update" || entry._tag === "Mounted" || entry._tag === "LoaderChanged" ||
    entry._tag === "PropsChanged"
  )
  const path = options?.path ??
    stateful.find((entry) =>
      (typeof entry.component === "string" ? entry.component : entry.component.name) === component.name
    )?.path
  if (path === undefined) throw new Error(`Story.fromLog: the log has no entry for ${component.name}`)
  const all = stateful.filter((entry) => entry.path === path)
  // The replay starts at the first Model. Props and slots written before it are in that Update's record, or
  // belong to an earlier mount.
  const start = all.findIndex((entry) => entry._tag === "Update" || entry._tag === "Mounted")
  if (start === -1) throw new Error(`Story.fromLog: the log has no entry for ${path}`)
  const first = all[start] as
    | MessageLog.Update
    | MessageLog.Mounted
    | Extract<MessageLog.Wire, { _tag: "Update" | "Mounted" }>
  const bound = boundOf(component)
  const slotOf = (entry: MessageLog.LoaderChanged | Extract<MessageLog.Wire, { _tag: "LoaderChanged" }>) => {
    if (typeof entry.component !== "string") return entry.slot
    const schema = bound?.logSchema.fields[entry.name]
    if (schema === undefined) {
      throw new Error(`Story.fromLog: entry #${entry.seq} (${path}) writes "${entry.name}", which isn't a loader`)
    }
    return decodeWith(entry, `loader "${entry.name}"`, schema, entry.slot)
  }

  const decoders = new Map<Schema.Top, (value: unknown) => unknown>()
  const decode = (
    entry: { readonly seq: number },
    field: "props" | "model" | "message" | "events",
    value: unknown
  ): any => decodeWith(entry, field, component[field] as Schema.Top, value)
  function decodeWith(entry: { readonly seq: number }, field: string, schema: Schema.Top, value: unknown): any {
    let run = decoders.get(schema)
    if (run === undefined) {
      run = Schema.decodeUnknownSync(Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>))
      decoders.set(schema, run)
    }
    try {
      return run(value)
    } catch (error) {
      const placeholder = findPlaceholder(value)
      throw new Error(
        `Story.fromLog: entry #${entry.seq} (${path}) has a ${field} that can't be decoded${
          placeholder === undefined ? "" : `, because it was logged as a ${placeholder} placeholder`
        }: ${String(error)}`,
        { cause: error }
      )
    }
  }
  const read = (entry: typeof first) => {
    if (typeof entry.component !== "string") {
      return {
        loaded: entry._tag === "Update" ? (entry as MessageLog.Update).loaded : undefined,
        props: entry.props as Props,
        model: entry.model as Model,
        events: entry.events as ReadonlyArray<Events>,
        commands: (entry as MessageLog.Update).commands.map(MessageLog.encodeCommand),
        lists: entry._tag === "Update" ? entry.lists ?? [] : [],
        message: entry._tag === "Update" ? entry.message as Msg : undefined
      }
    }
    const wire = entry as Extract<MessageLog.Wire, { _tag: "Update" | "Mounted" }>
    return {
      loaded: wire._tag === "Update" && wire.loaded !== undefined && bound !== undefined
        ? decodeWith(entry, "loaded", bound.logSchema, wire.loaded) as Component.Slots
        : undefined,
      props: decode(entry, "props", wire.props) as Props,
      model: decode(entry, "model", wire.model) as Model,
      events: wire.events.map((emitted) => decode(entry, "events", emitted)) as ReadonlyArray<Events>,
      commands: wire.commands,
      lists: wire._tag === "Update" ? wire.lists ?? [] : [],
      message: wire._tag === "Update" ? decode(entry, "message", wire.message) as Msg : undefined
    }
  }

  const sameModel = Schema.toEquivalence(component.model as Schema.Codec<Model, unknown>)
  const sameEvents = Schema.toEquivalence(Schema.Array(component.events as Schema.Codec<Events, unknown>))
  const sameCommands = (a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>) => JSON.stringify(a) === JSON.stringify(b)

  const initial = read(first)
  let model = initial.model
  let props: unknown = initial.props
  let slots: Component.Slots | undefined = initial.loaded
  let replayed = 0
  const result = (divergence: Divergence<Model, Msg, Events> | undefined): Replay<Model, Msg, Events, any, any> => {
    const reached = { model, props, slots }
    return {
      path,
      ...reached,
      loaded: () => bound?.context(reached.model, reached.props, reached.slots).loaded ?? {},
      replayed,
      divergence
    }
  }
  for (const entry of all.slice(start + 1)) {
    if (entry._tag === "LoaderChanged") {
      slots = { ...(slots ?? bound?.empty), [entry.name]: slotOf(entry) }
      continue
    }
    if (entry._tag === "PropsChanged") {
      props = typeof entry.component === "string" ? decode(entry, "props", entry.props) : entry.props
      continue
    }
    const recorded = read(entry)
    if (entry._tag === "Mounted") {
      // Mounted again at the same path: the replay starts over from it, with every slot empty.
      model = recorded.model
      props = recorded.props
      slots = undefined
      continue
    }
    // The Update's record is what `update` read, so it holds even when earlier entries were evicted.
    props = recorded.props
    if (recorded.loaded !== undefined) slots = recorded.loaded
    const next = component.update(model, recorded.message as Msg, recorded.props as Props, slots)
    replayed++
    const recomputed = {
      model: next.model,
      events: next.events,
      commands: next.commands.map(MessageLog.encodeCommand),
      lists: next.lists ?? []
    }
    if (
      !sameModel(recomputed.model, recorded.model) || !sameEvents(recomputed.events, recorded.events) ||
      !sameCommands(recomputed.commands, recorded.commands) || !sameCommands(recomputed.lists, recorded.lists)
    ) {
      return result({
        seq: entry.seq,
        message: recorded.message as Msg,
        recorded: {
          model: recorded.model,
          events: recorded.events,
          commands: recorded.commands,
          lists: recorded.lists
        },
        recomputed
      })
    }
    model = recomputed.model
  }
  return result(undefined)
}

/**
 * Re-runs a logged session of one component, purely, and reports the first
 * place it doesn't reproduce.
 *
 * **Details**
 *
 * The replay starts at the oldest surviving `Mounted` or `Update` entry for
 * the path (the first one logged for a component with this name, unless
 * `path` is given), takes its Model, and re-runs every following message with
 * the props and loader slots it was recorded with, so every `update` sees
 * `$.loaded` as it did when it ran, whichever entries the log still holds.
 * Commands are compared, never run. Models and events are compared with
 * `Schema.toEquivalence`, and Commands by their Wire encoding.
 *
 * The props and slots are tracked with the Model, so the result is the state
 * the instance ended with. They start from the first entry: a `Mounted`
 * entry's props and empty slots, or an `Update` entry's recorded props and
 * slots. Each later `PropsChanged` entry sets the props and each
 * `LoaderChanged` entry writes its slot, so props from the parent and loads
 * that settled after the last message are in the result too.
 *
 * It takes live entries or Wire frames. A Wire value sent as a placeholder,
 * such as a truncated Model, can't be decoded, and the error names the entry.
 *
 * @stability experimental
 * @category replay
 * @since 4.1.5
 */
export const fromLog: <C extends AnyComponent>(
  component: C,
  entries: ReadonlyArray<MessageLog.Entry | MessageLog.Wire>,
  options?: { readonly path?: string | undefined }
) => Replay<
  Component.Model<C>,
  Component.Message<C>,
  Component.Events<C>,
  { readonly [K in keyof Component.Loaders<C>]: Component.LoadedOf<Component.Loaders<C>[K]> },
  Component.Props<C>
> = replayLog as any
