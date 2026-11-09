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
 * import type { View } from "@effect/ui"
 * import { Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Increment: {} })
 *
 * const view = (count: number, h: View.Helper<typeof Message.Type, {}>) =>
 *   h.el("div", h.el("button", "+").on("click", Message.make({ _tag: "Increment" })), String(count))
 * ```
 *
 * @stability unstable
 * @since 0.1.0
 */
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import type * as Component from "./Component.ts"
import type * as Feature from "./Feature.ts"

/**
 * A node of a view: an element, text, or a child component slot.
 *
 * **Details**
 *
 * `Msg` is the message type the view's handlers send. `R` collects the
 * requirements of the children declared by value, which surface in the
 * parent's requirements.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export type Node<Msg, R = never> = Element<Msg, R> | Text | Child<Msg, R>

/**
 * A text node.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
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
 * @stability unstable
 * @category models
 * @since 0.1.0
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
 * its siblings move; unkeyed elements match by position.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Element<out Msg, out R = never> {
  readonly _tag: "Element"
  readonly tag: string
  readonly elementKey: string | undefined
  readonly attrs: Readonly<Record<string, string>>
  readonly props: Readonly<Record<string, unknown>>
  readonly handlers: Readonly<Record<string, Handler<Msg, any>>>
  readonly children: ReadonlyArray<Node<Msg, R>>
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
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Child<out Msg, out R = never> {
  readonly _tag: "Child"
  /** A component value, or a feature service resolved from the instance's context when it mounts. */
  readonly component: Component.Any | Feature.Any
  readonly key: string
  readonly props: unknown
  readonly onEmit: (emits: any) => Msg | undefined
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
 * @stability unstable
 * @since 0.1.0
 */
export declare namespace Child {
  /**
   * What a slot's `fallback` receives: the child's service is still building,
   * or the child failed.
   *
   * @category models
   * @since 0.1.0
   */
  export type Fallback = AsyncResult.Initial<never, unknown> | AsyncResult.Failure<never, unknown>

  /**
   * The options of `h.child`. `props` may be left out when the component takes
   * none.
   *
   * @category models
   * @since 0.1.0
   */
  export type Options<Props, Emits, Msg> =
    & {
      readonly key: string
      /** Handles the child's whole `emits` union and returns `undefined` for the cases it ignores. */
      readonly onEmit?: ((emits: Emits) => Msg | undefined) | undefined
      /** Also tells the parent that the child failed. The failure stays in the slot either way. */
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
    }
    & ({} extends Props ? { readonly props?: Props | undefined } : { readonly props: Props })
}

/**
 * One child argument of an element: a node, text, an array of them, or a hole
 * (`false`, `null`, `undefined`) that renders nothing.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
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
 * @stability unstable
 * @category utility types
 * @since 0.1.0
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
 * @stability unstable
 * @category constructors
 * @since 0.1.0
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
 * @stability unstable
 * @category constructors
 * @since 0.1.0
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
 * Every setter returns a copy, so a view stays a value. `Events` maps an event
 * name to its payload; a vocabulary's element class fixes it and adds sugar.
 * The core builder leaves payloads untyped.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export class ElementBuilder<out Msg, out R = never, in out Events = Record<string, unknown>>
  implements Element<Msg, R>
{
  /**
   * The node kind.
   *
   * @since 0.1.0
   */
  readonly _tag = "Element"
  /**
   * The key set with `key`, if any.
   *
   * @since 0.1.0
   */
  readonly elementKey: string | undefined = undefined
  /**
   * The attributes set with `attr`.
   *
   * @since 0.1.0
   */
  readonly attrs: Readonly<Record<string, string>> = {}
  /**
   * The properties set with `prop`.
   *
   * @since 0.1.0
   */
  readonly props: Readonly<Record<string, unknown>> = {}
  /**
   * The handlers set with `on`, by event name.
   *
   * @since 0.1.0
   */
  readonly handlers: Readonly<Record<string, Handler<Msg, any>>> = {}
  /**
   * Phantom: the element's events and their payloads.
   *
   * @since 0.1.0
   */
  declare readonly "~Events"?: Events
  /**
   * The element's tag.
   *
   * @since 0.1.0
   */
  readonly tag: string
  /**
   * The element's children, normalised.
   *
   * @since 0.1.0
   */
  readonly children: ReadonlyArray<Node<Msg, R>>
  constructor(tag: string, children: ReadonlyArray<Node<Msg, R>>) {
    this.tag = tag
    this.children = children
  }
  /**
   * Copies this element with a patch applied.
   *
   * @since 0.1.0
   */
  protected with(patch: Partial<Pick<Element<Msg, R>, "elementKey" | "attrs" | "props" | "handlers">>): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, patch)
  }
  /**
   * Sends a message when `event` fires: a value, or a function of the payload.
   *
   * @since 0.1.0
   */
  on<K extends keyof Events & string>(event: K, handler: Handler<Msg, Events[K]>): this {
    return this.with({ handlers: { ...this.handlers, [event]: handler } })
  }
  /**
   * Keeps this element's node when its siblings move. Unique among siblings.
   *
   * @since 0.1.0
   */
  key(key: string): this {
    return this.with({ elementKey: key })
  }
  /**
   * Sets an attribute, or removes it with `undefined`.
   *
   * @since 0.1.0
   */
  attr(name: string, value: string | undefined): this {
    const { [name]: _, ...rest } = this.attrs
    return this.with({ attrs: value === undefined ? rest : { ...rest, [name]: value } })
  }
  /**
   * Sets a property. The host decides what it means.
   *
   * @since 0.1.0
   */
  prop(name: string, value: unknown): this {
    return this.with({ props: { ...this.props, [name]: value } })
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
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Elements {
  readonly Msg: unknown
  readonly Tags: unknown
  readonly Host: unknown
}

/**
 * The runtime half of a vocabulary: its element constructors, installed on `h`.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Vocabulary<out V extends Elements = Elements> {
  readonly name: string
  readonly tags: Readonly<Record<string, (...children: ReadonlyArray<any>) => ElementBuilder<any, any, any>>>
  readonly "~V"?: V
}

/**
 * The app's registered vocabulary, declared once by module augmentation.
 *
 * **Example** (Registering an HTML vocabulary)
 *
 * ```ts
 * declare module "@effect/ui/View" {
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
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Register {}

/**
 * The registered vocabulary, or `never` when nothing is registered.
 *
 * @stability unstable
 * @category utility types
 * @since 0.1.0
 */
export type Registered = Register extends { readonly elements: infer V extends Elements } ? V : never

/**
 * The element names a vocabulary adds to `h`, bound to a component's message
 * type. Nothing when `V` is `never`.
 *
 * @stability unstable
 * @category utility types
 * @since 0.1.0
 */
export type Tags<V, Msg> = [V] extends [never] ? {} : V extends Elements ? (V & { readonly Msg: Msg })["Tags"] : {}

let registered: Vocabulary<any> | undefined

/**
 * Installs the app's vocabulary at runtime: the other half of `Register`.
 *
 * **Details**
 *
 * It's read when a view runs, not when a component is made, so module order
 * doesn't matter as long as it runs before the first render.
 *
 * @stability unstable
 * @category vocabularies
 * @since 0.1.0
 */
export const registerElements = (elements: Vocabulary<any>): void => {
  registered = elements
}

/**
 * The vocabulary installed with `registerElements`, if any.
 *
 * @stability unstable
 * @category vocabularies
 * @since 0.1.0
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
 * @stability unstable
 * @category models
 * @since 0.1.0
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
  /** A feature by service. The parent requires the service only. */
  child<Self, Props, Emits, RF = never>(
    service: Feature.Service<Self, Props, Emits>,
    options: Child.Options<Props, Emits, Msg> & {
      /** Required: the service may be building (`Initial`) or failed (`Failure`). */
      readonly fallback: (result: Child.Fallback) => Node<Msg, RF>
    }
  ): Child<Msg, Self | RF>
  /** A component by value. Its requirements surface in the parent's. */
  child<Props, Emits, RC, RF = never>(
    component: Component.Mountable<Props, Emits, RC>,
    options: Child.Options<Props, Emits, Msg> & {
      /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
      readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Node<Msg, RF>) | undefined
    }
  ): Child<Msg, RC | RF>
}

class HelperImpl<Msg, Props> implements Helper<Msg, Props> {
  readonly props: Props
  constructor(props: Props) {
    this.props = props
  }
  el(tag: string, ...inputs: ReadonlyArray<Input<Msg>>): ElementBuilder<Msg, any> {
    return new ElementBuilder(tag, children(inputs))
  }
  text(value: string): Text {
    return text(value)
  }
  child(
    component: Component.Any | Feature.Any,
    options: {
      readonly key: string
      readonly props?: unknown
      readonly onEmit?: ((emits: any) => Msg | undefined) | undefined
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

const helperClasses = new WeakMap<Vocabulary<any>, new(props: any) => Helper<any, any>>()

/**
 * Builds the view helper for one render, with a vocabulary's element names
 * mixed in when one is given.
 *
 * @internal
 */
export const makeHelper = <Msg, Props, V extends Elements = never>(
  props: Props,
  elements: Vocabulary<V> | undefined
): Helper<Msg, Props> & Tags<V, Msg> => {
  if (elements === undefined) return new HelperImpl(props) as any
  let Class = helperClasses.get(elements)
  if (Class === undefined) {
    Class = class extends HelperImpl<any, any> {}
    Object.assign(Class.prototype, elements.tags)
    helperClasses.set(elements, Class)
  }
  return new Class(props) as any
}

/**
 * The text of a view, with the text of every element concatenated in order.
 * Child slots contribute nothing.
 *
 * @stability unstable
 * @category queries
 * @since 0.1.0
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
 * @stability unstable
 * @category queries
 * @since 0.1.0
 */
export const nodes = function*<Msg>(node: Node<Msg, any>): Generator<Node<Msg, any>> {
  yield node
  if (node._tag === "Element") {
    for (const child of node.children) yield* nodes(child)
  }
}
