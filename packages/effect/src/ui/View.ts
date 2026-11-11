/**
 * Views are values: a tree of element, text and child nodes that a component's
 * `view` returns and a host renders.
 *
 * The core `h` has only `el`, `child` and `text`. An element vocabulary such as
 * the HTML one adds element names and its own element class, registered once
 * for the app by module augmentation of `Register` plus `registerElements`, or
 * set on one component with `elements`.
 *
 * Children are rest arguments. Arrays are flattened, and `false`, `null` and
 * `undefined` render nothing. Adjacent text merges into one text node when the
 * view is built, and empty text is dropped.
 *
 * **Example** (A host-neutral view)
 *
 * ```ts import.meta.vitest
 * import type { View } from "effect/ui"
 * import { Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Increment: {} })
 *
 * const view = (count: number, h: View.Helper<typeof Message.Type, {}>) =>
 *   h.el("div", h.el("button", "+").on("click", Message.make({ _tag: "Increment" })), String(count))
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as Effect from "../Effect.ts"
import type * as AsyncResult from "../reactivity/AsyncResult.ts"
import * as Command from "./Command.ts"
import type * as Component from "./Component.ts"
import type * as Feature from "./Feature.ts"
import type * as Renderer from "./Renderer.ts"

/**
 * A node of a view: an element, text, or a child component slot.
 *
 * **Details**
 *
 * `Msg` is the message type the view's handlers send. `R` collects the
 * requirements of the children declared by value, which surface in the
 * parent's requirements.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Node<Msg, R = never> = Element<Msg, R> | Text | Child<Msg, R>

/**
 * A text node.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Text {
  readonly _tag: "Text"
  readonly text: string
}

/**
 * What an event sends: a message value, or a function of the event's payload
 * that returns `undefined` to ignore the event.
 *
 * **Details**
 *
 * Payloads are plain data declared by the vocabulary and built by the host.
 * No host event object reaches component code, so a test fires one with a
 * literal.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Handler<Msg, Payload> = Msg | ((payload: Payload) => Msg | undefined)

/**
 * An element node, as data.
 *
 * **Details**
 *
 * `attrs` are strings set as attributes. `props` are typed values the host
 * decides the meaning of. `handlers` map an event name to its handler, so
 * re-rendering never touches listeners. `key` keeps the element's node when
 * its siblings move; unkeyed elements match by position. `refKey` names the
 * element for ref Commands, and `mount` is the work started by `onMount`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Element<out Msg, out R = never> {
  readonly _tag: "Element"
  readonly tag: string
  readonly elementKey: string | undefined
  readonly attrs: Readonly<Record<string, string>>
  readonly props: Readonly<Record<string, unknown>>
  readonly handlers: Readonly<Record<string, Handler<Msg, any>>>
  readonly refKey: string | undefined
  readonly mount: Mount<Msg> | undefined
  readonly children: ReadonlyArray<Node<Msg, R>>
}

/**
 * What `onMount` stores: a name shown in the tree, and the work to run with
 * the host's node once the element is committed.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Mount<out Msg> {
  readonly name: string
  readonly run: (node: any) => Effect.Effect<Msg, never, any>
}

/**
 * A child component slot declared with `h.child`.
 *
 * **Details**
 *
 * The runtime gives each slot its own instance, Model and Scope. Several
 * instances of one component are several slots with different keys. The child
 * reports up through `onEmit`, checked against the parent's message type, and
 * every slot is a failure boundary: a failed child shows `fallback`, or
 * nothing, until its key changes, and the parent's optional `onFailure` is
 * also messaged.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Child<out Msg, out R = never> {
  readonly _tag: "Child"
  /** A component value, or a feature service resolved from the instance's context when it mounts. */
  readonly component: Component.Any | Feature.Any
  readonly key: string
  readonly props: unknown
  readonly onEmit: (events: any) => Msg | undefined
  /** What the slot shows while its child can't be shown. Required for a feature child. */
  readonly fallback: ((result: Child.Fallback) => Node<Msg, any>) | undefined
  /** Also tells the parent that the child failed. */
  readonly onFailure: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
  /** Phantom: the child's requirements surface in its parent's. */
  readonly "~R"?: (_: never) => R
}

/**
 * Helper types for `Child`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Child {
  /**
   * What a slot's `fallback` receives: the child's service is still building,
   * or the child failed.
   *
   * @category models
   * @since 4.1.5
   */
  export type Fallback = AsyncResult.Initial<never, unknown> | AsyncResult.Failure<never, unknown>

  /**
   * The options of `h.child`. `props` may be left out when the component takes
   * none.
   *
   * @category models
   * @since 4.1.5
   */
  export type Options<Props, Events, Msg> =
    & {
      readonly key: string
      /** Handles the child's whole `events` union and returns `undefined` for the cases it ignores. */
      readonly onEmit?: ((events: Events) => Msg | undefined) | undefined
      /** Also tells the parent that the child failed. The failure stays in the slot either way. */
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
    }
    & ({} extends Props ? { readonly props?: Props | undefined } : { readonly props: Props })
}

/**
 * One child argument of an element: a node, text, an array of them, or a hole
 * (`false`, `null`, `undefined`) that renders nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Input<Msg> =
  | Node<Msg, any>
  | string
  | false
  | null
  | undefined
  | ReadonlyArray<Node<Msg, any> | string | false | null | undefined>

/**
 * The requirements of a tuple of children, collected one at a time, so two
 * siblings with different needs give the union.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Requirements<T> = T extends string | false | null | undefined ? never
  : T extends Text ? never
  : T extends ReadonlyArray<infer E> ? Requirements<E>
  : T extends Child<infer _Msg, infer R> ? R
  : T extends Element<infer _Msg, infer R> ? R
  : never

/**
 * Builds a text node.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const text = (text: string): Text => ({ _tag: "Text", text })

/**
 * Normalises element children: holes are dropped, arrays are flattened, and
 * adjacent text merges into one node with empty text dropped.
 *
 * **Details**
 *
 * The view value never holds two text nodes side by side, so server HTML
 * hydrates without separator comments.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const children = <Msg>(inputs: ReadonlyArray<Input<Msg>>): Array<Node<Msg, any>> => {
  const out: Array<Node<Msg, any>> = []
  const push = (input: Node<Msg, any> | string | false | null | undefined) => {
    if (input === false || input === null || input === undefined) return
    const node: Node<Msg, any> = typeof input === "string" ? text(input) : input
    if (node._tag === "Text") {
      if (node.text === "") return
      const last = out[out.length - 1]
      if (last !== undefined && last._tag === "Text") {
        out[out.length - 1] = text(last.text + node.text)
        return
      }
    }
    out.push(node)
  }
  for (const input of inputs) {
    if (Array.isArray(input)) {
      for (const item of input) push(item)
    } else {
      push(input as Node<Msg, any> | string | false | null | undefined)
    }
  }
  return out
}

/**
 * The chained element builder returned by `h.el` and by a vocabulary's element
 * names.
 *
 * **Details**
 *
 * Every setter returns a copy, so a view stays a value. `Handlers` maps an event
 * name to its payload; a vocabulary's element class fixes it and adds sugar.
 * The core builder leaves payloads untyped.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export class ElementBuilder<
  out Msg,
  out R = never,
  in out Handlers = Record<string, unknown>,
  in out HostNode = unknown
> implements Element<Msg, R> {
  /**
   * The node kind.
   *
   * @since 4.1.5
   */
  readonly _tag = "Element"
  /**
   * The key set with `key`, if any.
   *
   * @since 4.1.5
   */
  readonly elementKey: string | undefined = undefined
  /**
   * The attributes set with `attr`.
   *
   * @since 4.1.5
   */
  readonly attrs: Readonly<Record<string, string>> = {}
  /**
   * The properties set with `prop`.
   *
   * @since 4.1.5
   */
  readonly props: Readonly<Record<string, unknown>> = {}
  /**
   * The handlers set with `on`, by event name.
   *
   * @since 4.1.5
   */
  readonly handlers: Readonly<Record<string, Handler<Msg, any>>> = {}
  /**
   * The ref set with `ref`, if any.
   *
   * @since 4.1.5
   */
  readonly refKey: string | undefined = undefined
  /**
   * The work set with `onMount`, if any.
   *
   * @since 4.1.5
   */
  readonly mount: Mount<Msg> | undefined = undefined
  /**
   * Phantom: the host node this element renders to, which types `ref` and
   * `onMount`.
   *
   * @since 4.1.5
   */
  declare readonly "~HostNode"?: (_: HostNode) => HostNode
  /**
   * Phantom: the element's events and their payloads.
   *
   * @since 4.1.5
   */
  declare readonly "~Handlers"?: Handlers
  /**
   * The element's tag.
   *
   * @since 4.1.5
   */
  readonly tag: string
  /**
   * The element's children, normalised.
   *
   * @since 4.1.5
   */
  readonly children: ReadonlyArray<Node<Msg, R>>
  constructor(tag: string, children: ReadonlyArray<Node<Msg, R>>) {
    this.tag = tag
    this.children = children
  }
  /**
   * Copies this element with a patch applied.
   *
   * @since 4.1.5
   */
  protected with(
    patch: Partial<Pick<Element<Msg, R>, "elementKey" | "attrs" | "props" | "handlers" | "refKey" | "mount">>
  ): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, patch)
  }
  /**
   * Sends a message when `event` fires: a value, or a function of the payload.
   *
   * @since 4.1.5
   */
  on<K extends keyof Handlers & string>(event: K, handler: Handler<Msg, Handlers[K]>): this {
    return this.with({ handlers: { ...this.handlers, [event]: handler } })
  }
  /**
   * Keeps this element's node when its siblings move. Unique among siblings.
   *
   * @since 4.1.5
   */
  key(key: string): this {
    return this.with({ elementKey: key })
  }
  /**
   * Sets an attribute, or removes it with `undefined`.
   *
   * @since 4.1.5
   */
  attr(name: string, value: string | undefined): this {
    const { [name]: _, ...rest } = this.attrs
    return this.with({ attrs: value === undefined ? rest : { ...rest, [name]: value } })
  }
  /**
   * Sets a property. The host decides what it means.
   *
   * @since 4.1.5
   */
  prop(name: string, value: unknown): this {
    return this.with({ props: { ...this.props, [name]: value } })
  }
  /**
   * Names this element for ref Commands, which reach it through
   * `Renderer.Refs` within the instance that renders it. A ref declared for
   * another kind of node doesn't compile.
   *
   * @since 4.1.5
   */
  ref(ref: Renderer.Ref<HostNode>): this {
    return this.with({ refKey: ref.key })
  }
  /**
   * Runs `run` with this element's host node after it's committed, in a Scope
   * that closes when the element goes and survives patches. Its message comes
   * back to the component, and its requirements join the component's.
   *
   * **Details**
   *
   * A defect fails the instance. It never runs on the server or on a host that
   * doesn't run mounts, such as `TestHost`, where a test sends the message
   * itself. Call it last: it returns the core builder.
   *
   * @since 4.1.5
   */
  onMount<R2>(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg, never, R2>
  ): ElementBuilder<Msg, R | R2, Handlers, HostNode> {
    return this.with({ mount: { name, run } }) as any
  }
}

/**
 * A type-level function from a message type to a set of element constructors,
 * which a vocabulary implements.
 *
 * **Details**
 *
 * `Tags` is read with `Msg` bound: `(V & { Msg })["Tags"]`. `Host` is the
 * service a host's Layer provides to say it can show these elements, which
 * `mount` requires for the root.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Elements {
  readonly Msg: unknown
  readonly Tags: unknown
  readonly Host: unknown
}

/**
 * The runtime half of a vocabulary: its element constructors, installed on `h`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Vocabulary<out V extends Elements = Elements> {
  readonly name: string
  readonly tags: Readonly<Record<string, (...children: ReadonlyArray<any>) => ElementBuilder<any, any, any, any>>>
  /**
   * The only tags that may hold text, for a vocabulary such as a native one
   * where text lives in a text primitive. `h.el` checks it at runtime. Text
   * goes anywhere when it's left out.
   */
  readonly textParents?: ReadonlyArray<string> | undefined
  /**
   * Phantom: the type-level half of the vocabulary. A vocabulary written as a
   * module, such as `Html`, exports it as an `undefined` value, so the module
   * namespace itself is a `Vocabulary`.
   */
  readonly Elements?: V | undefined
}

/**
 * The app's registered vocabulary, declared once by module augmentation.
 *
 * **Example** (Registering an HTML vocabulary)
 *
 * ```ts
 * declare module "effect/ui/View" {
 *   interface Register {
 *     readonly elements: MyElements
 *   }
 * }
 *
 * interface MyElements {
 *   readonly Msg: unknown
 *   readonly Tags: unknown
 *   readonly Host: unknown
 * }
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Register {}

/**
 * The registered vocabulary, or `never` when nothing is registered.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Registered = Register extends { readonly elements: infer V extends Elements } ? V : never

/**
 * The element names a vocabulary adds to `h`, bound to a component's message
 * type. Nothing when `V` is `never`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Tags<V, Msg> = [V] extends [never] ? {} : V extends Elements ? (V & { readonly Msg: Msg })["Tags"] : {}

let registered: Vocabulary<any> | undefined

/**
 * Installs the app's vocabulary at runtime: the other half of `Register`.
 *
 * **Details**
 *
 * It's read when a view runs, not when a component is made, so module order
 * doesn't matter as long as it runs before the first render. For the HTML
 * vocabulary, importing `effect/ui/html/register` does both halves.
 *
 * @stability experimental
 * @category vocabularies
 * @since 4.1.5
 */
export const registerElements = (elements: Vocabulary<any>): void => {
  registered = elements
}

/**
 * The vocabulary installed with `registerElements`, if any.
 *
 * @stability experimental
 * @category vocabularies
 * @since 4.1.5
 */
export const registeredElements = (): Vocabulary<any> | undefined => registered

/**
 * The view helper, `h` in `view`: bound to the component's message type and
 * carrying its props.
 *
 * **Details**
 *
 * The core helper has `el`, `child` and `text`. A vocabulary's element names
 * are mixed in by `Component.make`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Helper<Msg, Props> {
  readonly props: Props
  /** Any host element by name, with untyped event payloads. What host-neutral code uses. */
  el<const C extends ReadonlyArray<Input<Msg>>>(
    tag: string,
    ...children: C
  ): ElementBuilder<Msg, Requirements<C[number]>>
  /** A text node. The only way to put text in a native view. */
  text(text: string): Text
  /**
   * Whether this instance has a run of the Command queued or running, of the
   * group if a pick of its `group` fields is given. It ends when the run's
   * message has been delivered, or at fiber exit for a run that sends none.
   * Per instance and view only: `update` ignores a submit while saving with
   * `mode: "drop"`.
   */
  isRunning<Args, G extends string>(
    command: Command.Definition<Args, any, boolean, any, G>,
    ...group: Command.GroupArg<Args, G>
  ): boolean
  /** A feature by service. The parent requires the service only. */
  child<Self, Props, Events, RF = never>(
    service: Feature.Service<Self, Props, Events>,
    options: Child.Options<Props, Events, Msg> & {
      /** Required: the service may be building (`Initial`) or failed (`Failure`). */
      readonly fallback: (result: Child.Fallback) => Node<Msg, RF>
    }
  ): Child<Msg, Self | RF>
  /** A component by value. Its requirements surface in the parent's. */
  child<Props, Events, RC, RF = never>(
    component: Component.Mountable<Props, Events, RC>,
    options: Child.Options<Props, Events, Msg> & {
      /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
      readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Node<Msg, RF>) | undefined
    }
  ): Child<Msg, RC | RF>
}

/**
 * What `h.isRunning` asks: whether the instance has a run of the named Command,
 * of the group key if given.
 *
 * @internal
 */
export type Running = (name: string, groupKey: string | undefined) => boolean

const notRunning: Running = () => false

class HelperImpl<Msg, Props> implements Helper<Msg, Props> {
  readonly props: Props
  readonly elements: Vocabulary<any> | undefined
  readonly runningFn: Running
  constructor(props: Props, elements: Vocabulary<any> | undefined, running: Running | undefined) {
    this.props = props
    this.elements = elements
    this.runningFn = running ?? notRunning
  }
  isRunning(command: Command.Definition.Any, group?: unknown): boolean {
    return this.runningFn(Command.nameOf(command), Command.groupKeyOf(command, group))
  }
  el(tag: string, ...inputs: ReadonlyArray<Input<Msg>>): ElementBuilder<Msg, any> {
    const nodes = children(inputs)
    const textParents = this.elements?.textParents
    if (textParents !== undefined && !textParents.includes(tag) && nodes.some((node) => node._tag === "Text")) {
      throw new Error(
        `<${tag}> can't hold text in the ${this.elements!.name} vocabulary; text goes inside ${textParents.join(", ")}`
      )
    }
    return new ElementBuilder(tag, nodes)
  }
  text(value: string): Text {
    return text(value)
  }
  child(
    component: Component.Any | Feature.Any,
    options: {
      readonly key: string
      readonly props?: unknown
      readonly onEmit?: ((events: any) => Msg | undefined) | undefined
      readonly fallback?: ((result: any) => Node<Msg, any>) | undefined
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
    }
  ): Child<Msg, any> {
    return {
      _tag: "Child",
      component,
      key: options.key,
      props: options.props ?? {},
      onEmit: options.onEmit ?? ignore,
      fallback: options.fallback,
      onFailure: options.onFailure
    }
  }
}

const ignore = () => undefined

const helperClasses = new WeakMap<Vocabulary<any>, typeof HelperImpl<any, any>>()

/**
 * Builds the view helper for one render, with a vocabulary's element names
 * mixed in when one is given.
 *
 * @internal
 */
export const makeHelper = <Msg, Props, V extends Elements = never>(
  props: Props,
  elements: Vocabulary<V> | undefined,
  running?: Running | undefined
): Helper<Msg, Props> & Tags<V, Msg> => {
  if (elements === undefined) return new HelperImpl(props, undefined, running) as any
  let Class = helperClasses.get(elements)
  if (Class === undefined) {
    const Made = class extends HelperImpl<any, any> {}
    Object.assign(Made.prototype, elements.tags)
    helperClasses.set(elements, Made)
    Class = Made
  }
  return new Class(props, elements, running) as any
}

/**
 * The text of a view, with the text of every element concatenated in order.
 * Child slots contribute nothing.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const textOf = (node: Node<any, any>): string => {
  switch (node._tag) {
    case "Text":
      return node.text
    case "Element":
      return node.children.map(textOf).join("")
    case "Child":
      return ""
  }
}

/**
 * Every node of a view in document order, the root first.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.5
 */
export const nodes = function*<Msg>(node: Node<Msg, any>): Generator<Node<Msg, any>> {
  yield node
  if (node._tag === "Element") {
    for (const child of node.children) yield* nodes(child)
  }
}
