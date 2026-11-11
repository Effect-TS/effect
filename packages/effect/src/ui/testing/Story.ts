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
 *   { args: { id: Schema.String }, invalidates: () => [] },
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
 *   // In a story, `h.running` is derived from the pending Commands.
 *   view: (_, h) => h.el("button", h.running(SaveTodo) ? "saving" : "save").on("click", Message.make({ _tag: "Save" }))
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
 * @since 4.1.3
 */
import * as Cause from "../../Cause.ts"
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
 * A Command issued by the instance and not yet resolved.
 *
 * **Details**
 *
 * `running` is what the runtime would be executing; `queued` is waiting behind
 * a running run of the same group under `mode: "queue"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Pending<Msg> {
  readonly command: Command.Effectful<Msg, any, never> | Command.Streaming<Msg, any, never>
  readonly status: "running" | "queued"
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
 * @since 4.1.3
 */
export interface Story<Props, Model, Msg, Events> {
  readonly component: Component.Component<any, Props, Model, Msg, Events, any, any>
  readonly props: Props
  readonly model: Model
  /** Commands issued but not yet resolved, oldest first. */
  readonly pending: ReadonlyArray<Pending<Msg>>
  /** Everything emitted to the parent so far. */
  readonly emitted: ReadonlyArray<Events>
  /** Commands interrupted by `switch`, by an interrupt Command, or by `given`. */
  readonly interrupted: ReadonlyArray<Command.Effectful<Msg, any, never> | Command.Streaming<Msg, any, never>>
  /** Commands ignored by `mode: "drop"`. */
  readonly dropped: ReadonlyArray<Command.Effectful<Msg, any, never> | Command.Streaming<Msg, any, never>>
  /** The view of the current Model and props, rendered when they change, so a defect in `view` fails that step. */
  readonly view: () => View.Node<Msg, any>
  /** The Subscription keys the current Model and props ask for, without the loader watches. Nothing runs. */
  readonly subscriptions: () => ReadonlyArray<string>
  /** Each loader field with its read and the args its loader returns for the current Model and props. */
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
 * One loader field in a story: the field, its read's name, and the args its
 * loader returns for the current Model and props, `undefined` when it is
 * disabled. A keyed field's args are its loader's unique args, in order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface LoaderInfo {
  readonly field: string
  readonly read: string
  readonly args: unknown
}

/**
 * One key of a keyed field for `loadedMany`: its args and a Success value or
 * a typed failure.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * @since 4.1.3
 */
export type Target = Command.Definition.Any | Command.Effectful<any, any, never> | Command.Streaming<any, any, never>

/**
 * A stream Command's definition, or an issued stream Command: what `next` and
 * `end` take.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type StreamTarget = Command.Definition<any, any, true, any, any> | Command.Streaming<any, any, never>

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
 *   view: (model, h) => h.el("button", `+ ${model.count}`).on("click", Message.make({ _tag: "Increment" }))
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
 * @since 4.1.3
 */
export interface Steps<C extends AnyComponent> extends Pipeable {
  /** The story after the last step. */
  readonly current: Story<Component.Props<C>, Component.Model<C>, Component.Message<C>, Component.Events<C>>

  /**
   * Starts from any Model, forgetting what was issued and emitted so far. An
   * updater is called with the current Model: `given(f)` is exactly
   * `given(f(current.model))`.
   */
  given(model: Component.Model<C> | ((model: Component.Model<C>) => Component.Model<C>)): this
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
   * or when nothing handles the click.
   */
  click(target: string | Query.Locator): this
  /**
   * Sends `event` with `payload`, `{}` by default, to the one element
   * `locator` matches: the innermost element with a handler for it, that
   * element or an ancestor, sends its message.
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
   */
  resolve<D extends Target>(target: D, result: Command.Result<D>): this
  /**
   * Fails the oldest running Command matching `target` with a typed failure
   * of its body, and sends the message its `Command.match` maps it to. A
   * stream Command ends. Throws for a Command whose body can't fail.
   */
  fail<D extends Target>(target: D, error: Command.Failure<D>): this
  /** Sends one element of the oldest running stream Command matching `target`, which stays pending. */
  next<D extends StreamTarget>(target: D, result: Command.Result<D>): this
  /** Ends the oldest running stream Command matching `target`, sending nothing. */
  end<D extends StreamTarget>(target: D): this

  /**
   * Loads a loader field with a Success: builds the snapshot at the loader's
   * current args and sends it through the declared watch handler. Throws when
   * the loader is disabled.
   */
  loaded<F extends Component.SingleFields<Component.Model<C>>>(
    field: F,
    value: Loader.Read.Success<Component.ReadOf<Component.Model<C>[F]>>,
    options?: { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined }
  ): this
  /**
   * Loads one key of a keyed field with a Success, as `loadedMany` does with
   * one entry.
   */
  loaded<F extends Component.KeyedFields<Component.Model<C>>>(
    field: F,
    args: Loader.Read.Args<Component.ReadOf<Component.Model<C>[F]>>,
    value: Loader.Read.Success<Component.ReadOf<Component.Model<C>[F]>>,
    options?: { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined }
  ): this
  /**
   * Loads a loader field with a typed failure, as `loaded` does. The failure
   * keeps the field's last Success as `previousSuccess` when the field holds
   * one at the loader's current args.
   */
  loadFailed<F extends Component.SingleFields<Component.Model<C>>>(
    field: F,
    error: Loader.Read.Error<Component.ReadOf<Component.Model<C>[F]>>,
    options?: { readonly waiting?: boolean | undefined }
  ): this
  /** Loads one key of a keyed field with a typed failure, as `loadedMany` does with one entry. */
  loadFailed<F extends Component.KeyedFields<Component.Model<C>>>(
    field: F,
    args: Loader.Read.Args<Component.ReadOf<Component.Model<C>[F]>>,
    error: Loader.Read.Error<Component.ReadOf<Component.Model<C>[F]>>,
    options?: { readonly waiting?: boolean | undefined }
  ): this
  /**
   * Loads several keys of a keyed field in one message, as the runtime sends
   * a first emission or a batch: the collection holds the field's stored keys
   * and these, and `changes` holds these. Throws on args the loader doesn't
   * currently return.
   */
  loadedMany<F extends Component.KeyedFields<Component.Model<C>>>(
    field: F,
    entries: ReadonlyArray<KeyedLoad<Component.ReadOf<Component.Model<C>[F]>>>
  ): this

  /** Checks the Model. `f` throws to fail the test. */
  model(f: (model: Component.Model<C>) => void): this
  /** Checks the view. `f` throws to fail the test. */
  view(f: (view: View.Node<Component.Message<C>, any>) => void): this
  /** Checks everything emitted so far. `f` throws to fail the test. */
  emitted(f: (emitted: ReadonlyArray<Component.Events<C>>) => void): this
  /** Checks the Subscription keys the current Model and props ask for. `f` throws to fail the test. */
  subscriptions(f: (keys: ReadonlyArray<string>) => void): this
  /** Checks the loader fields and their current args. `f` throws to fail the test. */
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
 * @since 4.1.3
 */
export declare namespace Steps {
  /**
   * A cursor over any component, for steps shared across components.
   *
   * @stability experimental
   * @category models
   * @since 4.1.3
   */
  export type Any = Steps<AnyComponent>
}

type Fields<Props, Model, Msg, Events> = Pick<
  Story<Props, Model, Msg, Events>,
  "component" | "props" | "model" | "pending" | "emitted" | "interrupted" | "dropped"
>

/** Builds a record around a rendered view. */
const record = <Props, Model, Msg, Events>(
  fields: Fields<Props, Model, Msg, Events>,
  view: View.Node<Msg, any>
): Story<Props, Model, Msg, Events> => {
  // A view value is a `Query` tree; a child slot is a node with no tag or text.
  const root = view as Query.Node
  return {
    component: fields.component,
    props: fields.props,
    model: fields.model,
    pending: fields.pending,
    emitted: fields.emitted,
    interrupted: fields.interrupted,
    dropped: fields.dropped,
    view: () => view,
    subscriptions: () =>
      (fields.component.subscriptions?.(fields.model, fields.props) ?? [])
        .map((sub) => sub.key)
        .filter((key) => !loaders.isWatchKey(key)),
    loaders: () => {
      const bound = boundOf(fields.component)
      if (bound === undefined) return []
      const context = bound.context(fields.model, fields.props)
      return bound.fields.map((field) => ({
        field: field.field,
        read: Loader.defOf(field.read).name,
        args: context.argsOf(field.field).args
      }))
    },
    root,
    get: (locator) => Query.get(root, locator),
    query: (locator) => Query.query(root, locator),
    all: (locator) => Query.all(root, locator)
  }
}

const update = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  patch: Partial<Fields<Props, Model, Msg, Events>>
): Story<Props, Model, Msg, Events> => {
  const fields = { ...story, ...patch }
  // A defect in `view` fails the step that changed the Model, the props or what's pending.
  const view = fields.model === story.model && fields.props === story.props && fields.pending === story.pending
    ? story.view()
    : story.component.view(fields.model, fields.props, runningOf(fields.pending))
  return record(fields, view)
}

const boundOf = (component: AnyComponent): loaders.Bound | undefined =>
  (component as unknown as { readonly "~loaders": loaders.Bound | undefined })["~loaders"]

const isKeyed = (story: Story<any, any, any, any>, field: string): boolean =>
  boundOf(story.component)?.fields.some((f) => f.field === field && f.keyed) === true

/** Builds the snapshot of `result` at the loader's current args and sends it through the watch handler. */
const loadStep = (
  story: Story<any, any, any, any>,
  step: string,
  field: string,
  build: (
    previous: Option.Option<AsyncResult.Success<any, any>>
  ) => AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>,
  patched: boolean
): Story<any, any, any, any> => {
  const bound = boundOf(story.component)
  if (bound === undefined || !bound.fields.some((f) => f.field === field)) {
    throw new Error(`Story.${step}: "${field}" is not a loader field of ${story.component.name}`)
  }
  const marker = (story.component.subscriptions?.(story.model, story.props) ?? [])
    .map((sub) => loaders.markerOf(sub))
    .find((marker) => marker?.label === field)!
  if (marker.argsKey === undefined) {
    throw new Error(`Story.${step}: the loader of "${field}" is disabled for the current Model and props`)
  }
  const data = Loader.snapshotData(story.model[field])
  const stored = data?.argsKey === marker.argsKey ? data.result : undefined
  const previous: Option.Option<AsyncResult.Success<any, any>> = stored === undefined
    ? Option.none()
    : stored._tag === "Success"
    ? Option.some(stored)
    : stored.previousSuccess
  const result = build(previous)
  const snapshot = Loader.makeSnapshot(
    Loader.defOf(marker.read),
    marker.label,
    { args: marker.args, argsKey: marker.argsKey },
    result,
    patched
  )
  return dispatch(story, marker.toMsg(snapshot, result))
}

/** The watch group of a keyed field at the story's Model and props. */
const groupOf = (story: Story<any, any, any, any>, field: string): loaders.Group | undefined => {
  for (const sub of story.component.subscriptions?.(story.model, story.props) ?? []) {
    const group = loaders.groupOf(sub)
    if (group?.field === field) return group
  }
  return undefined
}

const keyedField = (story: Story<any, any, any, any>, step: string, field: string): loaders.Group => {
  const bound = boundOf(story.component)
  if (bound === undefined || !bound.fields.some((f) => f.field === field && f.keyed)) {
    throw new Error(`Story.${step}: "${field}" is not a keyed loader field of ${story.component.name}`)
  }
  return groupOf(story, field)!
}

/**
 * Sends a keyed field's message as the runtime does: the collection is the
 * stored keys the loader still returns with `loads` over them, and
 * `changes` holds `loads`.
 */
/** Per keyed field, the declared keys when it last sent a message, as the runtime tracks them. */
type SentFor = Map<string, ReadonlySet<string>>

const declaredKeys = (group: loaders.Group): ReadonlySet<string> => new Set(group.entries.map((entry) => entry.argsKey))

const sendKeyed = (
  story: Story<any, any, any, any>,
  sentFor: SentFor,
  group: loaders.Group,
  loads: ReadonlyArray<
    { readonly argsKey: string; readonly result: AsyncResult.AsyncResult<any, any>; readonly patched: boolean }
  >
): Story<any, any, any, any> => {
  sentFor.set(group.field, declaredKeys(group))
  const def = Loader.defOf(group.read)
  const held = Loader.snapshotMapData(story.model[group.field])?.entries
  const byKey = new Map(loads.map((load) => [load.argsKey, load]))
  const snapshots = Loader.makeSnapshotMap(
    def,
    group.label,
    group.entries.flatMap((entry) => {
      const load = byKey.get(entry.argsKey)
      if (load !== undefined) {
        return [Loader.makeSnapshot(def, group.label, entry, load.result as any, load.patched)]
      }
      const stored = held?.get(entry.argsKey)
      return stored === undefined ? [] : [stored]
    })
  )
  const changes = group.entries.flatMap((entry) => {
    const load = byKey.get(entry.argsKey)
    return load === undefined ? [] : [{ args: entry.args, result: load.result }]
  })
  return dispatch(story, group.toMsg(snapshots, loaders.openKeyed(def, snapshots, group.entries), changes))
}

/** Loads keys of a keyed field: each args must be one the loader currently returns. */
const loadKeyedStep = (
  story: Story<any, any, any, any>,
  sentFor: SentFor,
  step: string,
  field: string,
  loads: ReadonlyArray<KeyedLoad<any>>
): Story<any, any, any, any> => {
  const group = keyedField(story, step, field)
  const def = Loader.defOf(group.read)
  const held = Loader.snapshotMapData(story.model[field])?.entries
  return sendKeyed(
    story,
    sentFor,
    group,
    loads.map((load) => {
      const argsKey = def.argsKey(load.args)
      if (!group.entries.some((entry) => entry.argsKey === argsKey)) {
        throw new Error(
          `Story.${step}: the loader of "${field}" doesn't return the args ${def.logKey(load.args, argsKey)}`
        )
      }
      if ("value" in load) {
        return {
          argsKey,
          result: AsyncResult.success(load.value, { waiting: load.waiting, timestamp: 0 }),
          patched: load.patched === true
        }
      }
      const stored = Loader.snapshotData(held?.get(argsKey))?.result
      const previousSuccess: Option.Option<AsyncResult.Success<any, any>> = stored === undefined
        ? Option.none()
        : stored._tag === "Success"
        ? Option.some(stored)
        : stored.previousSuccess
      return {
        argsKey,
        result: AsyncResult.failure(Cause.fail(load.error), { previousSuccess, waiting: load.waiting }),
        patched: false
      }
    })
  )
}

/**
 * After a step: a keyed field whose Model holds a key its loader no longer
 * returns gets the pruned collection, with no changes, as the runtime sends
 * it at the next sync. As in the runtime, a key set gets one: an `update`
 * that ignores it doesn't get it again until the key set changes.
 */
const pruneKeyed = (story: Story<any, any, any, any>, sentFor: SentFor): Story<any, any, any, any> => {
  const bound = boundOf(story.component)
  if (bound === undefined) return story
  let out = story
  for (const field of bound.fields) {
    if (!field.keyed) continue
    const held = Loader.snapshotMapData(out.model?.[field.field])
    if (held === undefined || held.entries.size === 0) continue
    const group = groupOf(out, field.field)!
    const declared = declaredKeys(group)
    const sent = sentFor.get(field.field)
    if (sent !== undefined && sent.size === declared.size && Array.from(sent).every((key) => declared.has(key))) {
      continue
    }
    if (Array.from(held.entries.keys()).every((key) => declared.has(key))) continue
    out = sendKeyed(out, sentFor, group, [])
  }
  return out
}

/** `h.running` in a story: derived from what's pending. */
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

/** Applies what `init` or `update` returned: the Model, the Commands through `schedule`, and the events. */
const apply = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  next: Component.Next<Model, Msg, Events, any>
): Story<Props, Model, Msg, Events> => {
  let pending = story.pending
  const interrupted = [...story.interrupted]
  const dropped = [...story.dropped]
  for (const command of next.commands) {
    const decision = schedule.schedule(toEntries(pending), command)
    if (decision.interrupt.length > 0) {
      const gone = new Set(decision.interrupt.map((entry) => entry.value))
      pending = pending.filter((entry) => !gone.has(entry))
      for (const entry of decision.interrupt) interrupted.push(entry.value.command)
    }
    if (command._tag === "Interrupt") continue
    switch (decision.action) {
      case "start":
        pending = [...pending, { command, status: "running" }]
        break
      case "queue":
        pending = [...pending, { command, status: "queued" }]
        break
      case "drop":
        dropped.push(command)
        break
      case "none":
        break
    }
  }
  return update(story, {
    model: next.model,
    pending,
    emitted: [...story.emitted, ...next.events],
    interrupted,
    dropped
  })
}

/** Removes a resolved run and starts the next queued run of its group, if any. */
const complete = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  entry: Pending<Msg>
): Story<Props, Model, Msg, Events> => {
  const remaining = story.pending.filter((other) => other !== entry)
  const ended = toEntries([entry])[0]
  const next = schedule.next(toEntries(remaining), ended)
  const pending = next === undefined
    ? remaining
    : remaining.map((other) => other === next.value ? { command: other.command, status: "running" as const } : other)
  return update(story, { pending })
}

const describe = (command: Command.Effectful<any, any, never> | Command.Streaming<any, any, never>): string =>
  `${command.name}(${JSON.stringify(MessageLog.encodeArgs(command.argsSchema, command.args))})`

const describePending = (pending: ReadonlyArray<Pending<any>>): string =>
  pending.length === 0 ? "nothing" : pending.map((entry) => `${describe(entry.command)} [${entry.status}]`).join(", ")

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
  message === undefined ? story : apply(story, story.component.update(story.model, message, story.props))

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

/** Sends `event` to the one element `locator` matches, bubbling to the innermost element that handles it. */
const fireAt = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  locator: Query.Locator,
  event: string,
  payload: unknown,
  step: string
): Story<Props, Model, Msg, Events> => {
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
  if (handler === undefined) throw new Error(`Story.${step}: nothing handles "${event}" at ${locator.description}`)
  return dispatch(story, handle(handler.handlers[event], payload))
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
  current: Story<any, any, any, any>
  private readonly sentFor: SentFor = new Map()
  constructor(current: Story<any, any, any, any>) {
    this.current = current
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  private step(next: Story<any, any, any, any>): this {
    this.current = next === this.current ? next : pruneKeyed(next, this.sentFor)
    return this
  }

  given(model: unknown): this {
    const next = typeof model === "function" ? model(this.current.model) : model
    // A Model set by hand: its keyed fields haven't been sent a message for any key set.
    this.sentFor.clear()
    return this.step(update(this.current, { model: next, pending: [], emitted: [], interrupted: [], dropped: [] }))
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
    return this.step(fireAt(this.current, locator, "click", {}, "click"))
  }
  fire(locator: Query.Locator, event: string, payload: unknown = {}): this {
    return this.step(fireAt(this.current, locator, event, payload, "fire"))
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
    return this.step(dispatch(complete(this.current, entry), resolveWith(entry, result)))
  }
  fail(target: Target, error: unknown): this {
    const entry = findRunning(this.current, target, "fail")
    const reject = entry.command.reject as ((error: unknown) => unknown) | undefined
    if (reject === undefined) {
      throw new Error(`Story.fail: ${describe(entry.command)} has no typed failure mapped by Command.match`)
    }
    return this.step(dispatch(complete(this.current, entry), reject(error)))
  }
  next(target: StreamTarget, result: unknown): this {
    return this.step(dispatch(this.current, resolveWith(findStream(this.current, target, "next"), result)))
  }
  end(target: StreamTarget): this {
    return this.step(complete(this.current, findStream(this.current, target, "end")))
  }
  loaded(field: string, ...rest: Array<any>): this {
    if (isKeyed(this.current, field)) {
      const [args, value, options] = rest
      return this.step(loadKeyedStep(this.current, this.sentFor, "loaded", field, [{ args, value, ...options }]))
    }
    const [value, options] = rest as [
      unknown,
      { readonly waiting?: boolean | undefined; readonly patched?: boolean | undefined } | undefined
    ]
    return this.step(loadStep(
      this.current,
      "loaded",
      field,
      () => AsyncResult.success(value, { waiting: options?.waiting, timestamp: 0 }),
      options?.patched === true
    ))
  }
  loadFailed(field: string, ...rest: Array<any>): this {
    if (isKeyed(this.current, field)) {
      const [args, error, options] = rest
      return this.step(
        loadKeyedStep(this.current, this.sentFor, "loadFailed", field, [{ args, error, waiting: options?.waiting }])
      )
    }
    const [error, options] = rest as [unknown, { readonly waiting?: boolean | undefined } | undefined]
    return this.step(loadStep(
      this.current,
      "loadFailed",
      field,
      (previousSuccess) => AsyncResult.failure(Cause.fail(error), { previousSuccess, waiting: options?.waiting }),
      false
    ))
  }
  loadedMany(field: string, entries: ReadonlyArray<KeyedLoad<any>>): this {
    return this.step(loadKeyedStep(this.current, this.sentFor, "loadedMany", field, entries))
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
  check(f: (story: Story<any, any, any, any>) => void): this {
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
 * @since 4.1.3
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
  return story
}

/**
 * The cursor after `init`, with no check on what's pending at the end.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const start = <C extends AnyComponent>(component: C, props: Component.Props<C>): Steps<C> => {
  const first = component.init(props)
  const empty = record<any, any, any, any>({
    // The record is stored with its types erased; `Steps<C>` restores them.
    component: component as Component.Component<any, any, any, any, any, any, any>,
    props,
    model: first.model,
    pending: [],
    emitted: [],
    interrupted: [],
    dropped: []
  }, component.view(first.model, props, runningOf([])))
  return new StepsImpl(apply(empty, first)) as Steps<C>
}

/**
 * The child slots declared in a view, optionally filtered by component or
 * feature service.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
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
 * @since 4.1.3
 */
export const fallback = <Msg>(
  view: View.Node<Msg, any>,
  key: string,
  result: View.Child.Fallback
): View.Node<Msg, any> | undefined => findChild(view, key, "fallback").fallback?.(result)

/**
 * The message `Component.provide`'s `onFailure` maps a Layer failure to, or
 * `undefined` when the component has none.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const layerFailure = <C extends Component.Any>(
  component: C,
  failure: AsyncResult.Failure<never, any>
): Component.Message<C> | undefined => component.layerFailure?.(failure)

/**
 * One instance's head entries for a Model: what its `head` option returns,
 * or none without one. The merge across the tree is a runtime test's.
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
 * @since 4.1.3
 */
export const head = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  model: Model
): ReadonlyArray<Head.Entry> => component.head?.(model) ?? []

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
 * @since 4.1.3
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
 * @since 4.1.3
 */
export interface Outcome<Model, Events> {
  readonly model: Model
  readonly events: ReadonlyArray<Events>
  readonly commands: ReadonlyArray<ReturnType<typeof MessageLog.encodeCommand>>
}

/**
 * The result of `fromLog`: the Model the replay reached, how many messages it
 * re-ran, and the first divergence, if any.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Replay<Model, Msg, Events> {
  readonly path: string
  readonly model: Model
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

/**
 * Re-runs a logged session of one component, purely, and reports the first
 * place it doesn't reproduce.
 *
 * **Details**
 *
 * The replay starts at the oldest surviving `Mounted` or `Update` entry for
 * the path (the first one logged for a component with this name, unless
 * `path` is given), takes its Model, and re-runs every following message with
 * the props it was recorded with. Commands are compared, never run. Models and
 * events are compared with `Schema.toEquivalence`, and Commands by their Wire
 * encoding.
 *
 * It takes live entries or Wire frames. A Wire value sent as a placeholder,
 * such as a truncated Model, can't be decoded, and the error names the entry.
 *
 * @stability experimental
 * @category replay
 * @since 4.1.3
 */
export const fromLog = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  entries: ReadonlyArray<MessageLog.Entry | MessageLog.Wire>,
  options?: { readonly path?: string | undefined }
): Replay<Model, Msg, Events> => {
  const nameOf = (entry: MessageLog.Entry | MessageLog.Wire): string | undefined =>
    entry._tag === "Update" || entry._tag === "Mounted"
      ? typeof entry.component === "string" ? entry.component : entry.component.name
      : undefined
  const path = options?.path ??
    (entries.find((entry) => nameOf(entry) === component.name) as MessageLog.Base | undefined)?.path
  if (path === undefined) throw new Error(`Story.fromLog: the log has no entry for ${component.name}`)
  const relevant = entries.filter((entry) =>
    (entry._tag === "Update" || entry._tag === "Mounted") && entry.path === path
  ) as ReadonlyArray<MessageLog.Update | MessageLog.Mounted | Extract<MessageLog.Wire, { _tag: "Update" | "Mounted" }>>
  if (relevant.length === 0) throw new Error(`Story.fromLog: the log has no entry for ${path}`)

  const decoders = new Map<Schema.Top, (value: unknown) => unknown>()
  const decode = (
    entry: { readonly seq: number },
    field: "props" | "model" | "message" | "events",
    value: unknown
  ): any => {
    const schema = component[field] as Schema.Top
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
  const read = (entry: (typeof relevant)[number]) => {
    if (typeof entry.component !== "string") {
      return {
        props: entry.props as Props,
        model: entry.model as Model,
        events: entry.events as ReadonlyArray<Events>,
        commands: (entry as MessageLog.Update).commands.map(MessageLog.encodeCommand),
        message: entry._tag === "Update" ? entry.message as Msg : undefined
      }
    }
    const wire = entry as Extract<MessageLog.Wire, { _tag: "Update" | "Mounted" }>
    return {
      props: decode(entry, "props", wire.props) as Props,
      model: decode(entry, "model", wire.model) as Model,
      events: wire.events.map((emitted) => decode(entry, "events", emitted)) as ReadonlyArray<Events>,
      commands: wire.commands,
      message: wire._tag === "Update" ? decode(entry, "message", wire.message) as Msg : undefined
    }
  }

  const sameModel = Schema.toEquivalence(component.model as Schema.Codec<Model, unknown>)
  const sameEvents = Schema.toEquivalence(Schema.Array(component.events as Schema.Codec<Events, unknown>))
  const sameCommands = (a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>) => JSON.stringify(a) === JSON.stringify(b)

  let model = read(relevant[0]!).model
  let replayed = 0
  for (const entry of relevant.slice(1)) {
    const recorded = read(entry)
    if (entry._tag === "Mounted") {
      // Mounted again at the same path: the replay starts over from it.
      model = recorded.model
      continue
    }
    const next = component.update(model, recorded.message as Msg, recorded.props)
    replayed++
    const recomputed = { model: next.model, events: next.events, commands: next.commands.map(MessageLog.encodeCommand) }
    if (
      !sameModel(recomputed.model, recorded.model) || !sameEvents(recomputed.events, recorded.events) ||
      !sameCommands(recomputed.commands, recorded.commands)
    ) {
      return {
        path,
        model,
        replayed,
        divergence: {
          seq: entry.seq,
          message: recorded.message as Msg,
          recorded: { model: recorded.model, events: recorded.events, commands: recorded.commands },
          recomputed
        }
      }
    }
    model = recomputed.model
  }
  return { path, model, replayed, divergence: undefined }
}
