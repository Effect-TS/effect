/**
 * Views are values: a tree of element, text and child nodes that a component's
 * `view` returns and a host renders.
 *
 * The core `h` has only `el`, `child` and `text`. An element vocabulary such as
 * the HTML one adds element names and its own element class, registered once
 * for the app by module augmentation of `Register` plus `registerElements`, or
 * set on one component with `elements`.
 *
 * An element's attributes and handlers come first and its children last:
 * `h.el("form").on("submit", msg).children(...)`. `children` ends the chain
 * and returns a node with no chain methods, and `h.el(tag, ...children)` is
 * shorthand for it. A builder with no children is itself a valid child or
 * view. Arrays of children are flattened, and `false`, `null` and
 * `undefined` render nothing. Adjacent text merges into one text node when
 * the view is built, and empty text is dropped.
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
 *   h.el("div", h.el("button").on("click", Message.make({ _tag: "Increment" })).children("+"), String(count))
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as Effect from "../Effect.ts"
import type * as AsyncResult from "../reactivity/AsyncResult.ts"
import type * as Stream from "../Stream.ts"
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
 * How a host treats one event of an element, set with the handler by `on`.
 *
 * **Details**
 *
 * With `preventDefault: true`, the host cancels the event's default action
 * when the handler produces a message, after the handler runs and before the
 * message is sent. A handler that returns `undefined` leaves the event alone,
 * so one handler decides per event, such as Enter but not Shift+Enter. A
 * message value always prevents. With `preventDefault: "always"`, the host
 * cancels the default whatever the handler returns. A host whose events have
 * no default ignores it.
 *
 * Nothing stops an event's propagation. A host gives each event to the
 * innermost element with a handler for it, and only that one, even when the
 * handler returns `undefined`.
 *
 * A vocabulary may extend these options for its own events, such as what a
 * drop target accepts. They stay plain data on the element: hosts and tests
 * read what they know and ignore the rest.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface EventOptions {
  readonly preventDefault?: boolean | "always" | undefined
}

/**
 * Who a layer of an element belongs to: one headless instance. The runtime
 * makes one per instance, and a story one per expanded child.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Owner {
  readonly path: string
  readonly depth: number
}

/**
 * What a part of a headless component added to an element: its handlers,
 * their options, its ref and its mount, kept apart from the author's.
 *
 * **Details**
 *
 * `tokens` holds the part's token-list attributes, such as `class` and
 * `aria-describedby`. They're added to the element's own value, whether the
 * consumer set it before or after applying the part, and a token already
 * there isn't repeated. The part's other attributes are written over what
 * the consumer set before applying it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Owned {
  readonly owner: Owner
  readonly handlers: Readonly<Record<string, Handler<any, any>>>
  readonly eventOptions: Readonly<Record<string, EventOptions>>
  readonly refKey: string | undefined
  readonly mount: Mount<any> | undefined
  readonly tokens: Readonly<Record<string, string>>
}

/**
 * The attributes whose value is a space-separated list, which a part adds
 * its tokens to rather than replacing: `class`, `rel` and the ARIA
 * attributes that list ids.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export const tokenListAttributes: ReadonlySet<string> = new Set([
  "class",
  "rel",
  "aria-controls",
  "aria-describedby",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns"
])

const noOwned: ReadonlyArray<Owned> = []

/**
 * The attributes, properties, handlers and event options of a builder that
 * has set none. One frozen record that every such builder shares, so the
 * runtime and a host know an empty one by looking at it, without reading it.
 *
 * @internal
 */
export const noFields: Readonly<Record<string, never>> = Object.freeze({})

/**
 * An element node, as data.
 *
 * **Details**
 *
 * `attrs` are strings set as attributes. `props` are typed values the host
 * decides the meaning of. `handlers` map an event name to its handler, so
 * re-rendering never touches listeners, and `eventOptions` holds the
 * `EventOptions` set with a handler. `key` keeps the element's node when
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
  readonly eventOptions: Readonly<Record<string, EventOptions>>
  readonly refKey: string | undefined
  readonly mount: Mount<Msg> | undefined
  /**
   * The layers the parts of headless components added, in the order they
   * were applied. An element written by hand may leave it out.
   */
  readonly owned?: ReadonlyArray<Owned> | undefined
  readonly children: ReadonlyArray<Node<Msg, R>>
}

/**
 * What `onMount` stores: a name shown in the tree, the work to run with the
 * host's node once the element is committed, and the input it was given, if
 * any.
 *
 * **Details**
 *
 * `run` gets the node and a Stream of the input's values. The input is
 * present only when `onMount` was given one, so a story can check the
 * value the view rendered with `"input" in mount`. Without one, the Stream
 * is empty.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Mount<out Msg> {
  readonly name: string
  readonly run: (node: any, changes: Stream.Stream<any>) => Effect.Effect<Msg | Component.Noop, never, any>
  /** The input given to `onMount(name, input, run)`. */
  readonly input?: unknown
}

/**
 * The text of the type error `onMount` gives for an Effect that doesn't end
 * with a message or `Component.noop`, such as an `Effect<void>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type MountHint =
  "onMount's Effect ends with a message or Component.noop. A mount with nothing to send ends with Effect.as(Component.noop)"

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
  /** The slot's key: the ref's key for a slot rendered with a ref. */
  readonly key: string
  /** The ref the parent sends to this slot with, if it was rendered with one. */
  readonly ref: Component.Ref.Any | undefined
  readonly props: unknown
  readonly onEmit: (events: any) => Msg | undefined
  /** What the slot shows while its child can't be shown. Required for a feature child. */
  readonly fallback:
    | ((result: AsyncResult.Initial<never, unknown> | AsyncResult.Failure<never, unknown>) => Content<Msg, any>)
    | undefined
  /** Also tells the parent that the child failed. */
  readonly onFailure: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
  /** A headless child's whole view, written by whoever declared the slot. */
  readonly view: ((parts: any) => Content<Msg, any>) | undefined
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
   * The options of `h.child`. `props` may be left out when the component takes
   * none.
   *
   * **Details**
   *
   * A slot takes exactly one of `key` and `ref`. With a ref, the ref's key
   * is the slot's key, and the parent can `$.send` to the slot. `SlotRef`
   * is the ref the slot takes; `h.child` checks what it receives against
   * what the component receives, so a ref made from a component also fits a
   * provided copy of it or a feature implementation. An erased
   * `Component.Ref.Any` names no slot: every typed ref fits it, so a slot
   * that took it would take a ref the component doesn't receive.
   *
   * @category models
   * @since 4.1.5
   */
  export type Options<Props, Events, Msg, SlotRef = Component.Ref<never>> =
    & (
      | {
        readonly key: string
        readonly ref?: undefined
      }
      | {
        /** Names the slot, so the parent can send it messages. Its key is the slot's key. */
        readonly ref: SlotRef
        readonly key?: undefined
      }
    )
    & {
      /** Handles the child's whole `events` union and returns `undefined` for the cases it ignores. */
      readonly onEmit?: ((events: Events) => Msg | undefined) | undefined
      /** Also tells the parent that the child failed. The failure stays in the slot either way. */
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
    }
    & ({} extends Props ? { readonly props?: Props | undefined } : { readonly props: Props })

  /**
   * Passes when every message a ref receives, `RefRcv`, is one the
   * component receives, `Rcv`, and otherwise names the ones it doesn't. A
   * ref whose `RefRcv` is `unknown`, such as the ref of a feature whose
   * `receives` is `Schema.Unknown`, takes no message, so it fits any slot.
   *
   * @category models
   * @since 4.1.5
   */
  export type RefFits<RefRcv, Rcv> = unknown extends RefRcv ? unknown
    : [RefRcv] extends [Rcv] ? unknown
    : { readonly "This ref sends messages the component doesn't receive": Exclude<RefRcv, Rcv> }

  /**
   * What a component or feature receives, as `h.child` checks a ref against
   * it: `Rcv`, or nothing when `Rcv` is `any`, as for an erased component or
   * `Feature.Any`.
   *
   * @category models
   * @since 4.1.5
   */
  export type Receives<Rcv> = 0 extends 1 & Rcv ? never : Rcv
}

/**
 * One child argument of an element: a node, an element builder, text, an
 * array of them, or a hole (`false`, `null`, `undefined`) that renders
 * nothing. `R` is what the child requires, as for `Content`.
 *
 * **When to use**
 *
 * Use to type the children a shared view helper passes on. Leaving `R` out
 * accepts only children that need no service, so a child that needs one
 * fails at the call site. To pass on whatever the children need, take them
 * as a generic tuple, as in the example: the element adds their
 * requirements to its own.
 *
 * **Gotchas**
 *
 * `Input<Msg, any>` as a parameter's type, outside a generic, erases what
 * the children require.
 *
 * **Example** (A view helper that keeps its children's requirements)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Component, View } from "effect/ui"
 *
 * const Msg = Schema.TaggedUnion({ Close: {} })
 * const PageDef = Component.define({
 *   name: "Page",
 *   model: Schema.Null,
 *   message: Msg
 * })
 *
 * const card = <const C extends ReadonlyArray<View.Input<typeof Msg.Type, any>>>(
 *   h: Component.Helper<typeof PageDef>,
 *   ...children: C
 * ) => h.el("section").children(...children)
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Input<Msg, R = never> =
  | Content<Msg, R>
  | string
  | false
  | null
  | undefined
  | ReadonlyArray<Content<Msg, R> | string | false | null | undefined>

/**
 * What a view, a child and a fallback may return: a node, or an element
 * builder with no children yet, such as `h.br` or `h.input.value(draft)`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Content<Msg, R = never> = Node<Msg, R> | ElementBuilder<Msg, R, any, any>

/**
 * The requirements of a tuple of children, collected one at a time, so two
 * siblings with different needs give the union. `Requirements<any>` is
 * `any`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Requirements<T> = 0 extends 1 & T ? any : T extends string | false | null | undefined ? never
: T extends Text ? never
: T extends ReadonlyArray<infer E> ? Requirements<E>
: T extends Child<infer _Msg, infer R> ? R
: T extends Element<infer _Msg, infer R> ? R
: T extends ElementBuilder<infer _Msg, infer R, any, any> ? R
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
 * Normalises element children: holes are dropped, arrays are flattened,
 * element builders become elements with no children, and adjacent text
 * merges into one node with empty text dropped.
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
export const children = <Msg>(inputs: ReadonlyArray<Input<Msg, any>>): Array<Node<Msg, any>> => {
  const out: Array<Node<Msg, any>> = []
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    if (Array.isArray(input)) {
      for (let j = 0; j < input.length; j++) pushChild(out, input[j])
    } else {
      pushChild(out, input as Content<Msg, any> | string | false | null | undefined)
    }
  }
  return out
}

const pushChild = <Msg>(
  out: Array<Node<Msg, any>>,
  input: Content<Msg, any> | string | false | null | undefined
): void => {
  if (input === false || input === null || input === undefined) return
  if (typeof input === "string") {
    if (input === "") return
    const last = out.length === 0 ? undefined : out[out.length - 1]
    if (last !== undefined && last._tag === "Text") out[out.length - 1] = text(last.text + input)
    else out.push(text(input))
    return
  }
  const node: Node<Msg, any> = toNode(input)
  if (node._tag === "Text") {
    if (node.text === "") return
    const last = out.length === 0 ? undefined : out[out.length - 1]
    if (last !== undefined && last._tag === "Text") {
      out[out.length - 1] = text(last.text + node.text)
      return
    }
  }
  out.push(node)
}

/**
 * Whether a value is an element builder.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isElementBuilder = (u: unknown): u is ElementBuilder<unknown, unknown, unknown, unknown> =>
  u instanceof ElementBuilder

/**
 * Turns view content into a node: an element builder becomes its element
 * with no children, and a node is returned as it is.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const toNode = <Msg, R>(content: Content<Msg, R>): Node<Msg, R> =>
  content instanceof ElementBuilder ? build(content, []) : content

/**
 * Builds the element node a builder describes, with the given children
 * normalised as `children` does. What a builder's `children` method calls.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const build = <Msg, R, const C extends ReadonlyArray<Input<Msg, any>>>(
  builder: ElementBuilder<Msg, R, any, any>,
  inputs: C
): Element<Msg, R | Requirements<C[number]>> => buildWith(builder, inputs.length === 0 ? [] : children(inputs))

/**
 * `build`, for inputs the caller owns and is done with, such as a
 * `children` method's rest arguments: the array is reused for the
 * element's children where it can be. What a builder's `children` calls.
 *
 * @internal
 */
export const buildOwned = <Msg, R, const C extends ReadonlyArray<Input<Msg, any>>>(
  builder: ElementBuilder<Msg, R, any, any>,
  inputs: C
): Element<Msg, R | Requirements<C[number]>> =>
  buildWith(builder, inputs.length === 0 ? [] : childrenOf(inputs as unknown as Array<Input<Msg, any>>))

const buildWith = <Msg, R>(
  builder: ElementBuilder<Msg, any, any, any>,
  children: Array<Node<Msg, any>>
): Element<Msg, R> => ({
  _tag: "Element",
  tag: builder.tag,
  elementKey: builder.elementKey,
  attrs: builder.owned.length === 0 ? builder.attrs : withTokens(builder.attrs, builder.owned),
  props: builder.props,
  handlers: builder.handlers,
  eventOptions: builder.eventOptions,
  refKey: builder.refKey,
  mount: builder.mount,
  owned: builder.owned,
  children
})

/**
 * `children`, for an array the caller owns, such as a method's rest
 * arguments. While the inputs are nodes, builders and text that stands
 * alone, each is turned into its node where it is, and the array itself is
 * the result: no second array, and none with room to spare. The first input
 * that needs more, a hole, a nested array or text to join, hands what's left
 * to `children`.
 */
const childrenOf = <Msg>(inputs: Array<Input<Msg, any>>): Array<Node<Msg, any>> => {
  let afterText = false
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    if (typeof input === "string") {
      if (input === "" || afterText) return children(inputs)
      inputs[i] = text(input)
      afterText = true
    } else if (input === false || input === null || input === undefined || Array.isArray(input)) {
      return children(inputs)
    } else {
      const node: Node<Msg, any> = toNode(input as Content<Msg, any>)
      if (node._tag === "Text") {
        if (node.text === "" || afterText) return children(inputs)
        afterText = true
      } else {
        afterText = false
      }
      inputs[i] = node
    }
  }
  return inputs as Array<Node<Msg, any>>
}

const withTokens = (
  attrs: Readonly<Record<string, string>>,
  owned: ReadonlyArray<Owned>
): Readonly<Record<string, string>> => {
  let out: Record<string, string> | undefined
  for (const layer of owned) {
    for (const name in layer.tokens) {
      out ??= { ...attrs }
      out[name] = joinTokens(out[name], layer.tokens[name]!)
    }
  }
  return out ?? attrs
}

const joinTokens = (current: string | undefined, added: string): string => {
  const tokens = current === undefined ? [] : current.split(/\s+/).filter((token) => token !== "")
  for (const token of added.split(/\s+/)) {
    if (token !== "" && !tokens.includes(token)) tokens.push(token)
  }
  return tokens.join(" ")
}

/**
 * Copies a builder with some of its fields replaced, keeping its class. Every
 * chain method is written with it, so a builder stays a value.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const withFields = <B extends ElementBuilder<any, any, any, any>>(
  builder: B,
  fields: Partial<
    Pick<
      Element<unknown>,
      "elementKey" | "attrs" | "props" | "handlers" | "eventOptions" | "refKey" | "mount" | "owned"
    >
  >
): B => Object.assign(copyBuilder(builder), fields)

/**
 * A copy of a builder, with its class and every field it holds.
 *
 * A view copies a builder for each chain call, so the copy is what building a
 * view costs most. A builder that holds only the base class's fields is
 * copied by a constructor made for its class, which stores them one by one:
 * several times faster than a generic copy. A builder whose class adds
 * fields of its own is copied generically.
 */
const copyBuilder = <B extends ElementBuilder<any, any, any, any>>(builder: B): B => {
  // Counted in place: `Object.keys` would make an array for every copy.
  let fields = 0
  for (const _ in builder) fields++
  // A field under a symbol isn't counted, so it is asked for.
  if (fields === builderFields.length && Object.getOwnPropertySymbols(builder).length === 0) {
    const proto = Object.getPrototypeOf(builder)
    let copier = copiers.get(proto)
    if (copier === undefined) {
      copier = makeCopier(proto, builder)
      copiers.set(proto, copier)
    }
    if (copier !== null) return new copier(builder) as B
  }
  return Object.assign(Object.create(Object.getPrototypeOf(builder)), builder)
}

const builderFields = [
  "elementKey",
  "attrs",
  "props",
  "handlers",
  "eventOptions",
  "refKey",
  "mount",
  "owned",
  "tag"
] as const

type Copier = new(builder: ElementBuilder<any, any, any, any>) => ElementBuilder<any, any, any, any>

/** A class's copier by its prototype, or `null` for a class whose builders are copied generically. */
const copiers = new WeakMap<object, Copier | null>()

/**
 * A constructor that copies the base fields of a builder of the class with
 * `proto`. `null` when `first`, the first builder of the class to be copied,
 * lacks a base field, which a count of its keys doesn't show.
 */
const makeCopier = (proto: object, first: ElementBuilder<any, any, any, any>): Copier | null => {
  for (const field of builderFields) {
    if (!Object.hasOwn(first, field)) return null
  }
  const copier = function(this: Mutable<ElementBuilder<any, any, any, any>>, from: ElementBuilder<any, any, any, any>) {
    this.elementKey = from.elementKey
    this.attrs = from.attrs
    this.props = from.props
    this.handlers = from.handlers
    this.eventOptions = from.eventOptions
    this.refKey = from.refKey
    this.mount = from.mount
    this.owned = from.owned
    this.tag = from.tag
  }
  copier.prototype = proto
  return copier as unknown as Copier
}

/**
 * A part of a headless component: it takes the builder of an element the
 * consumer wrote and returns it with the part's attributes, properties and
 * owned layer added.
 *
 * **Details**
 *
 * `Tag` is the tag, or the union of tags, the part is declared for, and
 * `string` for a part that takes any element. `Args` is what the part takes
 * after the builder, and `R` what its mount requires, which joins the
 * headless component's requirements.
 *
 * A part is tied to tag names, the same check the runtime makes: a part
 * declared for `"h2"` takes `h.h2` and rejects `h.h3`, although both
 * render an `HTMLHeadingElement`. A part that takes several tags lists them,
 * as `p.part(["h2", "h3"], ...)`.
 *
 * The result is the builder's chain type, never the callable root, so
 * `m.trigger(h.button)("Open")` doesn't compile.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Part<in out Tag extends string, in Args extends ReadonlyArray<any>, out R = never> {
  <B extends PartTarget<Tag>>(builder: B, ...args: Args): ReturnType<B["attr"]>
  readonly "~R"?: (_: never) => R
}

/**
 * What a part accepts: a builder whose declared tag is one of `Tag`, either
 * a tag's callable root or its chain type.
 *
 * **Details**
 *
 * It's structural on purpose. With `ElementBuilder` as the constraint, a
 * callable root such as `h.dialog` infers as the constraint and loses its
 * chain type. A builder whose tag isn't known, such as `h.el("x-foo")`'s,
 * only fits a part declared without a tag.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface PartTarget<out Tag extends string> {
  readonly "~Tag"?: Tag | undefined
  readonly attr: (...args: any) => any
}

/**
 * The requirements of the parts in a headless component's `parts` record.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type PartRequirements<P> = P extends { readonly "~R"?: (_: never) => infer R } ? R : never

/**
 * Makes a part for one owner. `decorate` gets an empty builder of the
 * consumer's class and tag, so it never sees what the consumer set. Its
 * attributes and properties are written over the consumer's, except token
 * lists, and its handlers, event options, ref, mount and token lists become
 * one owned layer.
 *
 * @internal
 */
export const makePart = (
  owner: Owner,
  tags: ReadonlyArray<string> | undefined,
  decorate: (builder: any, ...args: ReadonlyArray<any>) => ElementBuilder<any, any, any, any>
): Part<any, any, any> =>
(target: PartTarget<any>, ...args: ReadonlyArray<any>): any => {
  const builder: unknown = target
  if (!(builder instanceof ElementBuilder)) {
    throw new Error(owner.path + ": a part takes an element builder, such as h.button")
  }
  if (tags !== undefined && !tags.includes(builder.tag)) {
    throw new Error(owner.path + ": a part for <" + tags.join("> or <") + "> was given <" + builder.tag + ">")
  }
  const blank: ElementBuilder<any, any, any, any> = Object.assign(
    Object.create(Object.getPrototypeOf(builder)),
    blankFields,
    { tag: builder.tag }
  )
  const patch = decorate(blank, ...args)
  if (!(patch instanceof ElementBuilder)) {
    throw new Error(owner.path + ": a part returns the builder it was given, without children")
  }
  if (patch.elementKey !== undefined) throw new Error(owner.path + ": a part can't set an element's key")
  if (patch.owned.length > 0) throw new Error(owner.path + ": a part can't apply another part")
  const attrs: Record<string, string> = { ...builder.attrs }
  const tokens: Record<string, string> = {}
  for (const name in patch.attrs) {
    if (tokenListAttributes.has(name)) tokens[name] = patch.attrs[name]!
    else attrs[name] = patch.attrs[name]!
  }
  const layer: Owned = {
    owner,
    handlers: patch.handlers,
    eventOptions: patch.eventOptions,
    refKey: patch.refKey,
    mount: patch.mount,
    tokens
  }
  return withFields(builder, {
    attrs,
    props: { ...builder.props, ...patch.props },
    owned: [...builder.owned, layer]
  })
}

/**
 * `record` with `name` set to `value` as its last entry, or without `name`
 * when `value` is `undefined`.
 */
const withEntry = <A>(
  record: Readonly<Record<string, A>>,
  name: string,
  value: A | undefined
): Readonly<Record<string, A>> => {
  if (!Object.hasOwn(record, name)) return value === undefined ? record : assoc(record, name, value)
  const out: Record<string, A> = {}
  for (const key in record) {
    if (key !== name) put(out, key, record[key]!)
  }
  if (value !== undefined) put(out, name, value)
  return out
}

/**
 * `{ ...record, [name]: value }`, written as a copy and a store: an object
 * literal with a computed key is several times slower.
 */
const assoc = <A>(record: Readonly<Record<string, A>>, name: string, value: A): Readonly<Record<string, A>> => {
  // The first entry of most records: nothing to copy.
  const out: Record<string, A> = record === noFields ? {} : { ...record }
  put(out, name, value)
  return out
}

/** Sets an own entry, `__proto__` included, which a plain store would take as the prototype. */
const put = <A>(record: Record<string, A>, name: string, value: A): void => {
  if (name === "__proto__") {
    Object.defineProperty(record, name, { value, writable: true, enumerable: true, configurable: true })
  } else {
    record[name] = value
  }
}

type Mutable<A> = { -readonly [K in keyof A]: A[K] }

const blankFields = {
  elementKey: undefined,
  attrs: noFields,
  props: noFields,
  handlers: noFields,
  eventOptions: noFields,
  refKey: undefined,
  mount: undefined,
  owned: noOwned
}

/**
 * An id for an element of the instance at `path`, the same on the server and
 * the client. The path, the name and the key are each escaped down to
 * `[A-Za-z0-9]` and joined with a hyphen, which no escaped field contains:
 * two ids are equal only when all three are. The result is safe in a
 * space-separated list such as `aria-labelledby`, and in a selector.
 *
 * @internal
 */
export const idOf = (path: string, name: string, key?: string | number | undefined): string =>
  escapeId(path) + "-" + escapeId(name) + (key === undefined ? "" : "-" + escapeId(String(key)))

// The underscore that opens and closes an escape is escaped too, so the escaping can be undone.
const escapeId = (value: string): string =>
  value.replace(/[^A-Za-z0-9]/g, (char) => "_" + char.codePointAt(0)!.toString(36) + "_")

/**
 * The element builder: `h.el(tag)` and a vocabulary's element names. It
 * holds attributes, properties, handlers, a key, a ref and a mount, and no
 * children: an element's children go in last, with `children`.
 *
 * **Details**
 *
 * Every method returns a copy, so a view stays a value. `Handlers` maps an
 * event name to its payload; a vocabulary's element class fixes it and adds
 * sugar. The core builder leaves payloads untyped.
 *
 * This base class has no `children`, so it's the shape of a void element.
 * `ContainerBuilder` adds it, and a vocabulary does the same for the tags
 * that take children. A builder is itself valid content: as a child or a
 * view it renders as its element with no children.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export class ElementBuilder<
  out Msg,
  out R = never,
  in out Handlers = Record<string, unknown>,
  in out HostNode = unknown,
  out Tag extends string = string
> {
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
  readonly attrs: Readonly<Record<string, string>> = noFields
  /**
   * The properties set with `prop`.
   *
   * @since 4.1.5
   */
  readonly props: Readonly<Record<string, unknown>> = noFields
  /**
   * The handlers set with `on`, by event name.
   *
   * @since 4.1.5
   */
  readonly handlers: Readonly<Record<string, Handler<Msg, any>>> = noFields
  /**
   * The options set with `on`, by event name.
   *
   * @since 4.1.5
   */
  readonly eventOptions: Readonly<Record<string, EventOptions>> = noFields
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
   * The layers added by the parts of headless components.
   *
   * @since 4.1.5
   */
  readonly owned: ReadonlyArray<Owned> = noOwned
  /**
   * Phantom: the requirements of the element's mount, which surface in the
   * component's.
   *
   * @since 4.1.5
   */
  declare readonly "~R"?: (_: never) => R
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
   * Phantom: the element's tag as the vocabulary declares it, which a part
   * of a headless component checks. `string` when it isn't known, as for
   * `h.el`.
   *
   * @since 4.1.5
   */
  declare readonly "~Tag"?: Tag
  /**
   * The element's tag.
   *
   * @since 4.1.5
   */
  readonly tag: string
  constructor(tag: string) {
    this.tag = tag
  }
  /**
   * Sends a message when `event` fires: a value, or a function of the payload.
   * `options` sets how the host treats the event, such as `preventDefault`.
   * Setting `event` again replaces its handler and its options.
   *
   * @since 4.1.5
   */
  on<K extends keyof Handlers & string>(
    event: K,
    handler: Handler<Msg, Handlers[K]>,
    options?: EventOptions | undefined
  ): this {
    const out = copyBuilder(this) as Mutable<this>
    out.handlers = assoc(this.handlers, event, handler)
    const eventOptions = this.eventOptions
    if (eventOptions === noFields) {
      if (options !== undefined) out.eventOptions = assoc(eventOptions, event, options)
    } else if (options !== undefined || Object.hasOwn(eventOptions, event)) {
      out.eventOptions = withEntry(eventOptions, event, options)
    }
    return out
  }
  /**
   * Keeps this element's node when its siblings move. Unique among siblings.
   *
   * @since 4.1.5
   */
  key(key: string): this {
    const out = copyBuilder(this) as Mutable<this>
    out.elementKey = key
    return out
  }
  /**
   * Sets an attribute, or removes it with `undefined`.
   *
   * @since 4.1.5
   */
  attr(name: string, value: string | undefined): this {
    const out = copyBuilder(this) as Mutable<this>
    const attrs = this.attrs
    if (attrs === noFields) {
      if (value !== undefined) out.attrs = assoc(attrs, name, value)
      // Removing an attribute that isn't set leaves the record as it is.
    } else if (value !== undefined || Object.hasOwn(attrs, name)) {
      out.attrs = withEntry(attrs, name, value)
    }
    return out
  }
  /**
   * Sets a property. The host decides what it means.
   *
   * @since 4.1.5
   */
  prop(name: string, value: unknown): this {
    const out = copyBuilder(this) as Mutable<this>
    out.props = assoc(this.props, name, value)
    return out
  }
  /**
   * Names this element for ref Commands, which reach it through
   * `Renderer.Refs` within the instance that renders it. A ref declared for
   * another kind of node doesn't compile.
   *
   * @since 4.1.5
   */
  ref(ref: Renderer.Ref<HostNode>): this {
    const out = copyBuilder(this) as Mutable<this>
    out.refKey = ref.key
    return out
  }
  /**
   * Runs `run` with this element's host node after it's committed, in a Scope
   * that closes when the element goes and survives patches. A message it
   * ends with comes back to the component, and one that ends with
   * `Component.noop` sends nothing and logs no `Update`. Its requirements
   * join the component's.
   *
   * **Details**
   *
   * `run` runs once per element, so it doesn't see a later render's values.
   * With an `input`, `run` also gets `changes`: a Stream that starts with
   * the current input and gives each new one, when a render's input differs
   * by `Equal`. A reader that falls behind gets only the latest value. To
   * redo work for every value, run it over the Stream:
   * `Stream.runForEach(changes, (data) => draw(node, data))`.
   *
   * A defect fails the instance. It never runs on the server or on a host that
   * doesn't run mounts, such as `TestHost`, where a test sends the message
   * itself. A vocabulary's element class overrides it to return its own
   * class, so the chain goes on after it.
   *
   * **Gotchas**
   *
   * A mount returns one message, so a running mount can't send messages as
   * it goes. Its Effect ends with a message or `Component.noop`: an
   * `Effect<void>` doesn't compile, because a `void` type can hold any value,
   * which would be sent as a message. End a mount with nothing to send with
   * `Effect.as(Component.noop)`.
   *
   * @since 4.1.5
   */
  onMount<R2>(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg | Component.Noop, never, R2>
  ): ElementBuilder<Msg, R | R2, Handlers, HostNode, Tag>
  onMount<I, R2>(
    name: string,
    input: I,
    run: (node: HostNode, changes: Stream.Stream<I>) => Effect.Effect<Msg | Component.Noop, never, R2>
  ): ElementBuilder<Msg, R | R2, Handlers, HostNode, Tag>
  /**
   * Rejects any other mount result, with a type error that says what to end
   * it with.
   *
   * @since 4.1.5
   */
  onMount(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg | Component.Noop | MountHint, never, any>
  ): never
  onMount<I>(
    name: string,
    input: I,
    run: (node: HostNode, changes: Stream.Stream<I>) => Effect.Effect<Msg | Component.Noop | MountHint, never, any>
  ): never
  onMount(name: string, ...args: ReadonlyArray<any>): any {
    return withFields(this, {
      mount: args.length === 1 ? { name, run: args[0] } : { name, input: args[0], run: args[1] }
    })
  }
}

/**
 * The builder of an element that takes children: what `h.el` returns.
 *
 * **Details**
 *
 * `children` ends the chain and returns the element node, which has no chain
 * methods, so attributes and handlers always come before the children.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export class ContainerBuilder<
  out Msg,
  out R = never,
  in out Handlers = Record<string, unknown>,
  in out HostNode = unknown,
  out Tag extends string = string
> extends ElementBuilder<Msg, R, Handlers, HostNode, Tag> {
  /**
   * Like `ElementBuilder.onMount`, keeping `children`.
   *
   * @since 4.1.5
   */
  override onMount<R2>(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg | Component.Noop, never, R2>
  ): ContainerBuilder<Msg, R | R2, Handlers, HostNode, Tag>
  override onMount<I, R2>(
    name: string,
    input: I,
    run: (node: HostNode, changes: Stream.Stream<I>) => Effect.Effect<Msg | Component.Noop, never, R2>
  ): ContainerBuilder<Msg, R | R2, Handlers, HostNode, Tag>
  /**
   * Rejects any other mount result, with a type error that says what to end
   * it with.
   *
   * @since 4.1.5
   */
  override onMount(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg | Component.Noop | MountHint, never, any>
  ): never
  override onMount<I>(
    name: string,
    input: I,
    run: (node: HostNode, changes: Stream.Stream<I>) => Effect.Effect<Msg | Component.Noop | MountHint, never, any>
  ): never
  override onMount(name: string, ...args: ReadonlyArray<any>): any {
    return (super.onMount as any)(name, ...args)
  }
  /**
   * Ends the chain with the element's children: nodes, builders, text,
   * arrays to flatten, and holes (`false`, `null`, `undefined`). Their
   * requirements join the element's.
   *
   * @since 4.1.5
   */
  children<const C extends ReadonlyArray<Input<Msg, any>>>(...inputs: C): Element<Msg, R | Requirements<C[number]>> {
    return buildOwned(this, inputs)
  }
}

/**
 * A root builder that is also callable: `b(...inputs)` is
 * `b.children(...inputs)`. What a vocabulary puts on `h` for a tag that
 * takes children, such as `h.button("Add")`.
 *
 * **Details**
 *
 * The chain methods return the builder `B`, which isn't callable, and the
 * call returns a node, so `h.div(a).class("x")` doesn't compile.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Shorthand<B extends { readonly children: (...inputs: any) => any }> = Omit<B, never> & B["children"]

/**
 * Makes a builder callable as `Shorthand` describes, for a vocabulary's
 * `tags`. Make one per tag, once: `h` shares it across renders.
 *
 * **Details**
 *
 * The result is a function with the builder's class and fields. Its chain
 * methods copy only the builder's fields, so the function's own `name` and
 * `length` never reach a node.
 *
 * @stability experimental
 * @category vocabularies
 * @since 4.1.5
 */
export const shorthand = <
  B extends ElementBuilder<any, any, any, any> & { readonly children: (...inputs: any) => any }
>(
  builder: B
): Shorthand<B> => {
  const root = (...inputs: ReadonlyArray<Input<any, any>>) => (root as any).children(...inputs)
  Object.setPrototypeOf(root, Object.getPrototypeOf(builder))
  return Object.assign(root, builder) as any
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
 * The runtime half of a vocabulary: its root element builders, installed on
 * `h` and shared by every render.
 *
 * **Details**
 *
 * A tag that takes children is a `shorthand` builder, so `h.span(title)`
 * works; a void tag is a plain builder.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Vocabulary<out V extends Elements = Elements> {
  readonly name: string
  readonly tags: Readonly<Record<string, ElementBuilder<any, any, any, any>>>
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
 * are mixed in by `Component.define`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Helper<Msg, Props> {
  readonly props: Props
  /**
   * Any host element by name, with untyped event payloads. What host-neutral
   * code uses: `h.el("x-foo").attr("a", "b").children(...)`.
   */
  el(tag: string): ContainerBuilder<Msg>
  /** Shorthand for `h.el(tag).children(...children)`, with at least one child. */
  el<const C extends readonly [Input<Msg, any>, ...ReadonlyArray<Input<Msg, any>>]>(
    tag: string,
    ...children: C
  ): Element<Msg, Requirements<C[number]>>
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
  /**
   * An id for an element of this instance, derived from the instance's path:
   * the same on the server and the client, and different for every instance.
   */
  id(name: string, key?: string | number | undefined): string
  /**
   * A component by value. Its requirements surface in the parent's. `Rcv` has
   * no default: one would stop a nested call, such as an inline
   * `Component.provide(C, layer)`, from being inferred.
   */
  child<Props, Events, RC, Rcv, RefRcv = Child.Receives<Rcv>, RF = never>(
    component: Component.Mountable<Props, Events, RC, Rcv>,
    options:
      & Child.Options<Props, Events, Msg, Component.Ref<RefRcv>>
      & Child.RefFits<NoInfer<RefRcv>, NoInfer<Child.Receives<Rcv>>>
      & {
        /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
        readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Content<Msg, RF>) | undefined
      }
  ): Child<Msg, RC | NoInfer<RF>>
  /**
   * A component by value, with `Props`, `Events` and `RC` given explicitly. It
   * receives nothing as far as the types know, so it takes a key, not a ref.
   */
  child<Props, Events, RC, RF = never>(
    component: Component.Mountable<Props, Events, RC>,
    options: Child.Options<Props, Events, Msg> & {
      /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
      readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Content<Msg, RF>) | undefined
    }
  ): Child<Msg, RC | NoInfer<RF>>
  /**
   * A headless component by value. `view` is the child's whole view, built
   * from its parts. Its requirements, and the view's, surface in the parent's.
   */
  child<Props, Events, Parts, RC, Rcv, RefRcv = Child.Receives<Rcv>, RV = never, RF = never>(
    component: Component.Headless<Props, Events, Parts, RC, Rcv>,
    options:
      & Child.Options<Props, Events, Msg, Component.Ref<RefRcv>>
      & Child.RefFits<NoInfer<RefRcv>, NoInfer<Child.Receives<Rcv>>>
      & {
        /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
        readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Content<Msg, RF>) | undefined
        /**
         * The child's whole view, from its parts. It's this view's code: the
         * children it declares report to this component, and it runs again
         * whenever this component or the child renders.
         */
        readonly view: (parts: Parts) => Content<Msg, RV>
      }
  ): Child<Msg, RC | RV | NoInfer<RF>>
  // Keep this overload last so a missing feature fallback is the final diagnostic.
  /** A feature by service. The parent requires the service only. */
  child<Self, Props, Events, Rcv = never, RefRcv = Child.Receives<Rcv>, RF = never>(
    service: Feature.Service<Self, Props, Events, Rcv>,
    options:
      & Child.Options<Props, Events, Msg, Component.Ref<RefRcv>>
      & Child.RefFits<NoInfer<RefRcv>, NoInfer<Child.Receives<Rcv>>>
      & {
        /** Required: the service may be building (`Initial`) or failed (`Failure`). */
        readonly fallback: (
          result: AsyncResult.Initial<never, unknown> | AsyncResult.Failure<never, unknown>
        ) => Content<Msg, RF>
      }
  ): Child<Msg, Self | NoInfer<RF>>
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
  readonly instancePath: string
  constructor(props: Props, elements: Vocabulary<any> | undefined, running: Running | undefined, path: string) {
    this.props = props
    this.elements = elements
    this.runningFn = running ?? notRunning
    this.instancePath = path
  }
  isRunning(command: Command.Definition.Any, group?: unknown): boolean {
    return this.runningFn(Command.nameOf(command), Command.groupKeyOf(command, group))
  }
  id(name: string, key?: string | number | undefined): string {
    return idOf(this.instancePath, name, key)
  }
  el(tag: string, ...inputs: ReadonlyArray<Input<Msg, any>>): any {
    const textParents = this.elements?.textParents
    const builder = textParents === undefined || textParents.includes(tag)
      ? new ContainerBuilder<Msg>(tag)
      : new NoTextBuilder<Msg>(tag, this.elements!.name, textParents)
    return inputs.length === 0 ? builder : builder.children(...inputs)
  }
  text(value: string): Text {
    return text(value)
  }
  child(
    component: Component.Any | Component.Headless.Any | Feature.Any,
    options: {
      readonly key?: string | undefined
      // Every ref fits `Ref.Any`; the overloads have checked what it receives.
      readonly ref?: Component.Ref.Any | undefined
      readonly props?: unknown
      readonly onEmit?: ((events: any) => Msg | undefined) | undefined
      readonly fallback?: ((result: any) => Content<Msg, any>) | undefined
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
      readonly view?: ((parts: any) => Content<Msg, any>) | undefined
    }
  ): Child<Msg, any> {
    // A slot with a key and a ref would have two identities that can disagree.
    if ((options.key === undefined) === (options.ref === undefined)) {
      throw new Error("h.child takes exactly one of key and ref")
    }
    return {
      _tag: "Child",
      component: component as Component.Any,
      key: options.ref !== undefined ? options.ref.key : options.key!,
      ref: options.ref,
      props: options.props ?? {},
      onEmit: options.onEmit ?? ignore,
      fallback: options.fallback,
      onFailure: options.onFailure,
      view: options.view
    }
  }
}

const ignore = () => undefined

/** `h.el` of a tag that can't hold text in the helper's vocabulary. */
class NoTextBuilder<Msg> extends ContainerBuilder<Msg> {
  readonly vocabulary: string
  readonly textParents: ReadonlyArray<string>
  constructor(tag: string, vocabulary: string, textParents: ReadonlyArray<string>) {
    super(tag)
    this.vocabulary = vocabulary
    this.textParents = textParents
  }
  override children<const C extends ReadonlyArray<Input<Msg, any>>>(
    ...inputs: C
  ): Element<Msg, Requirements<C[number]>> {
    const node = super.children(...inputs)
    if (node.children.some((child) => child._tag === "Text")) {
      throw new Error(
        `<${this.tag}> can't hold text in the ${this.vocabulary} vocabulary; text goes inside ${
          this.textParents.join(", ")
        }`
      )
    }
    return node
  }
}

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
  running?: Running | undefined,
  path?: string | undefined
): Helper<Msg, Props> & Tags<V, Msg> => {
  if (elements === undefined) return new HelperImpl(props, undefined, running, path ?? "") as any
  let Class = helperClasses.get(elements)
  if (Class === undefined) {
    const Made = class extends HelperImpl<any, any> {}
    Object.assign(Made.prototype, elements.tags)
    helperClasses.set(elements, Made)
    Class = Made
  }
  return new Class(props, elements, running, path ?? "") as any
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
