/**
 * Story tests drive one component instance with a list of steps: pure, with no
 * runtime, no Layers and no host.
 *
 * A story covers `init`, `update` and queries over the instance's view value.
 * Commands stay pending as data until a step resolves them with the message
 * they would have produced, so no service is needed. A child slot is a leaf:
 * anything that crosses one is a runtime test.
 *
 * Steps are plain functions from a story to the next story, so a test can write
 * its own. The runner fails if a Command is still pending at the end. Sending a
 * message while Commands are pending is allowed, since testing `switch` and
 * `concurrent` needs it. A defect in `init`, `update` or `view` makes the step
 * throw.
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
 *   Effect.succeed((id: string) => Effect.succeed(Message.make({ _tag: "Saved" })))
 * ) {}
 *
 * const TodoItem = Component.make({
 *   name: "TodoItem",
 *   props: Schema.Struct({ id: Schema.String }),
 *   model: Schema.Struct({ saving: Schema.Boolean }),
 *   message: Message,
 *   init: () => ({ saving: false }),
 *   update: (model, message, $) =>
 *     Message.match(message, {
 *       Save: () => $.set({ saving: true }).run(SaveTodo.make($.props.id)),
 *       Saved: () => ({ saving: false })
 *     }),
 *   view: (model, h) => h.el("button", model.saving ? "saving" : "save").on("click", Message.make({ _tag: "Save" }))
 * })
 *
 * Story.make(
 *   TodoItem,
 *   { id: "t1" },
 *   Story.click("save"),
 *   Story.expectExact(SaveTodo.make("t1")),
 *   Story.resolve(SaveTodo, Message.make({ _tag: "Saved" })),
 *   Story.model((model) => {
 *     if (model.saving) throw new Error("still saving")
 *   })
 * )
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import type * as Cause from "../../Cause.ts"
import * as Equal from "../../Equal.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Schema from "../../Schema.ts"
import * as Command from "../Command.ts"
import type * as Component from "../Component.ts"
import type * as Head from "../Head.ts"
import * as schedule from "../internal/schedule.ts"
import * as MessageLog from "../MessageLog.ts"
import * as View from "../View.ts"

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
 * The state of one instance between steps. Immutable: every step returns a new
 * story.
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
  /** The Subscription keys the current Model and props ask for. Nothing runs. */
  readonly subscriptions: () => ReadonlyArray<string>
}

/**
 * A step of a story: a function from one story to the next.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Step<Props, Model, Msg, Events> = (
  story: Story<Props, Model, Msg, Events>
) => Story<Props, Model, Msg, Events>

/**
 * A step that works for any component.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type AnyStep = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>
) => Story<Props, Model, Msg, Events>

const update = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  patch: Partial<
    Pick<Story<Props, Model, Msg, Events>, "props" | "model" | "pending" | "emitted" | "interrupted" | "dropped">
  >
): Story<Props, Model, Msg, Events> => {
  const model = "model" in patch ? patch.model as Model : story.model
  const props = "props" in patch ? patch.props as Props : story.props
  // A defect in `view` fails the step that changed the Model or props.
  const view = model === story.model && props === story.props ? story.view() : story.component.view(model, props)
  return {
    ...story,
    ...patch,
    view: () => view,
    subscriptions: () => (story.component.subscriptions?.(model, props) ?? []).map((sub) => sub.key)
  }
}

const toEntries = <Msg>(pending: ReadonlyArray<Pending<Msg>>): Array<schedule.Entry<Pending<Msg>>> =>
  pending.map((entry) => ({
    name: entry.command.name,
    key: entry.command.key,
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
  `${command.name}(${command.args.map((arg) => JSON.stringify(arg)).join(", ")})`

const describePending = (pending: ReadonlyArray<Pending<any>>): string =>
  pending.length === 0 ? "nothing" : pending.map((entry) => `${describe(entry.command)} [${entry.status}]`).join(", ")

/**
 * A pending Command's definition, or an issued Command to also match the
 * arguments.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Target = Command.Definition.Any | Command.Effectful<any, any, never> | Command.Streaming<any, any, never>

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

/**
 * Runs a story: `init` with `props`, then every step in order.
 *
 * **Details**
 *
 * It returns the final story so a test can read it, and throws if a Command is
 * still pending at the end.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const make = <Props, Model, Msg, Events>(
  component: Component.Component<any, Props, Model, Msg, Events, any, any>,
  props: Props,
  ...steps: ReadonlyArray<Step<Props, Model, Msg, Events>>
): Story<Props, Model, Msg, Events> => {
  const story = run(start(component, props), ...steps)
  if (story.pending.length > 0) {
    throw new Error(`Story.make: Commands still pending at the end: ${describePending(story.pending)}`)
  }
  return story
}

/**
 * The story after `init` and before any step, with no check on what's pending.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const start = <Props, Model, Msg, Events>(
  component: Component.Component<any, Props, Model, Msg, Events, any, any>,
  props: Props
): Story<Props, Model, Msg, Events> => {
  const first = component.init(props)
  const view = component.view(first.model, props)
  const empty: Story<Props, Model, Msg, Events> = {
    component,
    props,
    model: first.model,
    pending: [],
    emitted: [],
    interrupted: [],
    dropped: [],
    view: () => view,
    subscriptions: () => (component.subscriptions?.(first.model, props) ?? []).map((sub) => sub.key)
  }
  return apply(empty, first)
}

/**
 * Applies steps to a story, with no check on what's pending.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.3
 */
export const run = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  ...steps: ReadonlyArray<Step<Props, Model, Msg, Events>>
): Story<Props, Model, Msg, Events> => steps.reduce((story, step) => step(story), story)

/**
 * Groups steps into one, for a shared setup.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const steps = <Props, Model, Msg, Events>(
  ...steps: ReadonlyArray<Step<Props, Model, Msg, Events>>
): Step<Props, Model, Msg, Events> =>
(story) => run(story, ...steps)

/**
 * Starts from any Model, forgetting what `init` issued and emitted.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const given = <Props, Model, Msg, Events>(model: NoInfer<Model>): Step<Props, Model, Msg, Events> => (story) =>
  update(story, { model, pending: [], emitted: [], interrupted: [], dropped: [] })

/**
 * Changes the props. A props change never reaches `update`: it re-renders the
 * view and changes the Subscription keys.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const props = <Props, Model, Msg, Events>(
  next: NoInfer<Props> | ((props: Props) => Props)
): Step<Props, Model, Msg, Events> =>
(story) => update(story, { props: typeof next === "function" ? (next as (props: Props) => Props)(story.props) : next })

const dispatch = <Props, Model, Msg, Events>(
  story: Story<Props, Model, Msg, Events>,
  message: Msg | undefined
): Story<Props, Model, Msg, Events> =>
  message === undefined ? story : apply(story, story.component.update(story.model, message, story.props))

/**
 * Sends a message to `update`.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const send = <Props, Model, Msg, Events>(message: NoInfer<Msg>): Step<Props, Model, Msg, Events> => (story) =>
  dispatch(story, message)

/**
 * Sends the message a `click` on the innermost element containing `text` would
 * send. Throws if nothing clickable contains it.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const click = (text: string): AnyStep => (story) => {
  let hit: View.Element<any, any> | undefined
  for (const node of View.nodes(story.view())) {
    if (node._tag === "Element" && "click" in node.handlers && View.textOf(node).includes(text)) hit = node
  }
  if (hit === undefined) throw new Error(`Story.click: nothing clickable contains "${text}"`)
  return dispatch(story, handle(hit.handlers.click, {}))
}

/**
 * The message a handler sends for a payload: the value itself, or the result
 * of the function, where `undefined` ignores the event.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const handle = <Msg, Payload>(handler: View.Handler<Msg, Payload>, payload: Payload): Msg | undefined =>
  typeof handler === "function" ? (handler as (payload: Payload) => Msg | undefined)(payload) : handler

/**
 * Sends the message `event` with `payload` would send from the first element
 * matching `predicate`. Throws if no matching element handles the event.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const fire = <Payload>(
  predicate: (element: View.Element<any, any>) => boolean,
  event: string,
  payload: Payload
): AnyStep =>
(story) => {
  for (const node of View.nodes(story.view())) {
    if (node._tag === "Element" && event in node.handlers && predicate(node)) {
      return dispatch(story, handle(node.handlers[event], payload))
    }
  }
  throw new Error(`Story.fire: no element handling "${event}" matches`)
}

/**
 * Checks the Model. `f` throws to fail the test.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const model =
  <Props, Model, Msg, Events>(f: (model: Model) => void): Step<Props, Model, Msg, Events> => (story) => {
    f(story.model)
    return story
  }

/**
 * Checks the view. `f` throws to fail the test.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const view = <Props, Model, Msg, Events>(
  f: (view: View.Node<Msg, any>) => void
): Step<Props, Model, Msg, Events> =>
(story) => {
  f(story.view())
  return story
}

/**
 * Checks everything emitted so far. `f` throws to fail the test.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const emitted = <Props, Model, Msg, Events>(
  f: (emitted: ReadonlyArray<Events>) => void
): Step<Props, Model, Msg, Events> =>
(story) => {
  f(story.emitted)
  return story
}

/**
 * Checks the Subscription keys the current Model and props ask for. `f` throws
 * to fail the test.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const subscriptions = (f: (keys: ReadonlyArray<string>) => void): AnyStep => (story) => {
  f(story.subscriptions())
  return story
}

/**
 * Checks the whole story. `f` throws to fail the test.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const check = <Props, Model, Msg, Events>(
  f: (story: Story<Props, Model, Msg, Events>) => void
): Step<Props, Model, Msg, Events> =>
(story) => {
  f(story)
  return story
}

// Pending Commands are stored with their Source erased; `findRunning` matched `target`, so
// `result` is the Source of this entry's Command.
const resolveWith = (entry: Pending<any>, result: unknown): any =>
  (entry.command.resolve as (result: unknown) => unknown)(result)

/**
 * Resolves the oldest running Command matching `target` with the message it
 * would have produced, and sends it.
 *
 * **Details**
 *
 * A definition matches by identity; an issued Command also matches the
 * arguments. `result` is the definition's own result, before any
 * `Command.map`, which is replayed to produce the component's message. A queued run of the same group
 * starts when the running one resolves.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const resolve = <D extends Target>(target: D, result: Command.Result<D>): AnyStep => (story) => {
  const entry = findRunning(story, target, "resolve")
  return dispatch(complete(story, entry), resolveWith(entry, result))
}

/**
 * Sends one element of the oldest running Stream Command matching `target`,
 * which stays pending.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const next = <D extends Command.Definition<any, any, true> | Command.Streaming<any, any, never>>(
  target: D,
  result: Command.Result<D>
): AnyStep =>
(story) => {
  const entry = findRunning(story, target, "next")
  if (entry.command._tag !== "Stream") {
    throw new Error(`Story.next: ${describe(entry.command)} is not a stream Command`)
  }
  return dispatch(story, resolveWith(entry, result))
}

/**
 * Ends the oldest running Stream Command matching `target`, sending nothing.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const end =
  <D extends Command.Definition<any, any, true> | Command.Streaming<any, any, never>>(target: D): AnyStep =>
  (
    story
  ) => {
    const entry = findRunning(story, target, "end")
    if (entry.command._tag !== "Stream") {
      throw new Error(`Story.end: ${describe(entry.command)} is not a stream Command`)
    }
    return complete(story, entry)
  }

/**
 * Asserts that exactly these Commands are pending, in order.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const expectExact = (...targets: ReadonlyArray<Target>): AnyStep => (story) => {
  const ok = story.pending.length === targets.length &&
    targets.every((target, index) => matches(target, story.pending[index]))
  if (!ok) {
    throw new Error(
      `Story.expectExact: expected ${
        targets.length === 0 ? "nothing" : targets.map(describeTarget).join(", ")
      }; pending: ${describePending(story.pending)}`
    )
  }
  return story
}

/**
 * Asserts that a Command matching `target` is pending.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const expectHas = (target: Target): AnyStep => (story) => {
  if (!story.pending.some((entry) => matches(target, entry))) {
    throw new Error(
      `Story.expectHas: ${describeTarget(target)} is not pending; pending: ${describePending(story.pending)}`
    )
  }
  return story
}

/**
 * Asserts that nothing is pending.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const expectNone = (): AnyStep => (story) => {
  if (story.pending.length > 0) {
    throw new Error(`Story.expectNone: pending: ${describePending(story.pending)}`)
  }
  return story
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
 * Sends the message the parent's `onEmit` maps `events` from the child with
 * `key` to, if any.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const childEmit = (key: string, events: unknown): AnyStep => (story) => {
  return dispatch(story, findChild(story.view(), key, "childEmit").onEmit(events))
}

/**
 * Sends the message the parent's `onFailure` maps a failure of the child with
 * `key` to, if any. The failure is passed as an `AsyncResult.Failure`.
 *
 * @stability experimental
 * @category steps
 * @since 4.1.3
 */
export const childFailure = (key: string, cause: Cause.Cause<unknown>): AnyStep => (story) => {
  const child = findChild(story.view(), key, "childFailure")
  return dispatch(story, child.onFailure?.(AsyncResult.failure(cause)))
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
