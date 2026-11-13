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
}

const noOwned: ReadonlyArray<Owned> = []

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
  /** The layers the parts of headless components added, in the order they were applied. */
  readonly owned: ReadonlyArray<Owned>
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
 * One child argument of an element: a node, an element builder, text, an
 * array of them, or a hole (`false`, `null`, `undefined`) that renders
 * nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Input<Msg> =
  | Content<Msg, any>
  | string
  | false
  | null
  | undefined
  | ReadonlyArray<Content<Msg, any> | string | false | null | undefined>

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
export const children = <Msg>(inputs: ReadonlyArray<Input<Msg>>): Array<Node<Msg, any>> => {
  const out: Array<Node<Msg, any>> = []
  const push = (input: Content<Msg, any> | string | false | null | undefined) => {
    if (input === false || input === null || input === undefined) return
    const node: Node<Msg, any> = typeof input === "string" ? text(input) : toNode(input)
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
      push(input as Content<Msg, any> | string | false | null | undefined)
    }
  }
  return out
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
export const build = <Msg, R, const C extends ReadonlyArray<Input<Msg>>>(
  builder: ElementBuilder<Msg, R, any, any>,
  inputs: C
): Element<Msg, R | Requirements<C[number]>> => ({
  _tag: "Element",
  tag: builder.tag,
  elementKey: builder.elementKey,
  attrs: builder.attrs,
  props: builder.props,
  handlers: builder.handlers,
  eventOptions: builder.eventOptions,
  refKey: builder.refKey,
  mount: builder.mount,
  owned: builder.owned,
  children: inputs.length === 0 ? [] : children(inputs)
})

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
): B => Object.assign(Object.create(Object.getPrototypeOf(builder)), builder, fields)

/**
 * A part of a headless component: it takes the builder of an element the
 * consumer wrote and returns it with the part's attributes, properties and
 * owned layer added.
 *
 * **Details**
 *
 * `N` is the host node the part is declared for, `Args` what it takes after
 * the builder, and `R` what its mount requires, which joins the headless
 * component's requirements. The result is the builder's chain type, never
 * the callable root, so `m.trigger(h.button)("Open")` doesn't compile.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Part<in out N, in Args extends ReadonlyArray<any>, out R = never> {
  <B extends PartTarget<N>>(builder: B, ...args: Args): ReturnType<B["attr"]>
  readonly "~R"?: (_: never) => R
}

/**
 * What a part accepts: a builder for the host node `N`, either a tag's
 * callable root or its chain type.
 *
 * **Details**
 *
 * It's structural on purpose. With `ElementBuilder` as the constraint, a
 * callable root such as `h.dialog` infers as the constraint and loses its
 * chain type.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface PartTarget<in out N> {
  readonly "~HostNode"?: ((_: N) => N) | undefined
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
 * attributes and properties are written over the consumer's, and its
 * handlers, event options, ref and mount become one owned layer.
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
  const layer: Owned = {
    owner,
    handlers: patch.handlers,
    eventOptions: patch.eventOptions,
    refKey: patch.refKey,
    mount: patch.mount
  }
  return withFields(builder, {
    attrs: { ...builder.attrs, ...patch.attrs },
    props: { ...builder.props, ...patch.props },
    owned: [...builder.owned, layer]
  })
}

const blankFields = {
  elementKey: undefined,
  attrs: {},
  props: {},
  handlers: {},
  eventOptions: {},
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
  in out HostNode = unknown
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
   * The options set with `on`, by event name.
   *
   * @since 4.1.5
   */
  readonly eventOptions: Readonly<Record<string, EventOptions>> = {}
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
    const handlers = { ...this.handlers, [event]: handler }
    if (options === undefined && !Object.hasOwn(this.eventOptions, event)) return withFields(this, { handlers })
    const { [event]: _, ...rest } = this.eventOptions
    return withFields(this, { handlers, eventOptions: options === undefined ? rest : { ...rest, [event]: options } })
  }
  /**
   * Keeps this element's node when its siblings move. Unique among siblings.
   *
   * @since 4.1.5
   */
  key(key: string): this {
    return withFields(this, { elementKey: key })
  }
  /**
   * Sets an attribute, or removes it with `undefined`.
   *
   * @since 4.1.5
   */
  attr(name: string, value: string | undefined): this {
    const { [name]: _, ...rest } = this.attrs
    return withFields(this, { attrs: value === undefined ? rest : { ...rest, [name]: value } })
  }
  /**
   * Sets a property. The host decides what it means.
   *
   * @since 4.1.5
   */
  prop(name: string, value: unknown): this {
    return withFields(this, { props: { ...this.props, [name]: value } })
  }
  /**
   * Names this element for ref Commands, which reach it through
   * `Renderer.Refs` within the instance that renders it. A ref declared for
   * another kind of node doesn't compile.
   *
   * @since 4.1.5
   */
  ref(ref: Renderer.Ref<HostNode>): this {
    return withFields(this, { refKey: ref.key })
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
   * itself. A vocabulary's element class overrides it to return its own
   * class, so the chain goes on after it.
   *
   * @since 4.1.5
   */
  onMount<R2>(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg, never, R2>
  ): ElementBuilder<Msg, R | R2, Handlers, HostNode> {
    return withFields(this, { mount: { name, run } }) as any
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
  in out HostNode = unknown
> extends ElementBuilder<Msg, R, Handlers, HostNode> {
  /**
   * Like `ElementBuilder.onMount`, keeping `children`.
   *
   * @since 4.1.5
   */
  override onMount<R2>(
    name: string,
    run: (node: HostNode) => Effect.Effect<Msg, never, R2>
  ): ContainerBuilder<Msg, R | R2, Handlers, HostNode> {
    return super.onMount(name, run) as any
  }
  /**
   * Ends the chain with the element's children: nodes, builders, text,
   * arrays to flatten, and holes (`false`, `null`, `undefined`). Their
   * requirements join the element's.
   *
   * @since 4.1.5
   */
  children<const C extends ReadonlyArray<Input<Msg>>>(...inputs: C): Element<Msg, R | Requirements<C[number]>> {
    return build(this, inputs)
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
  const root = (...inputs: ReadonlyArray<Input<any>>) => (root as any).children(...inputs)
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
  el<const C extends readonly [Input<Msg>, ...ReadonlyArray<Input<Msg>>]>(
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
  /** A component by value. Its requirements surface in the parent's. */
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
  child<Props, Events, Parts, RC, RV = never, RF = never>(
    component: Component.Headless<Props, Events, Parts, RC>,
    options: Child.Options<Props, Events, Msg> & {
      /** Shown if the child fails, until its key changes. Without it, the slot is blank. */
      readonly fallback?: ((result: AsyncResult.Failure<never, unknown>) => Content<Msg, RF>) | undefined
      readonly view: (parts: Parts) => Content<Msg, RV>
    }
  ): Child<Msg, RC | RV | NoInfer<RF>>
  // Keep this overload last so a missing feature fallback is the final diagnostic.
  /** A feature by service. The parent requires the service only. */
  child<Self, Props, Events, RF = never>(
    service: Feature.Service<Self, Props, Events>,
    options: Child.Options<Props, Events, Msg> & {
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
  el(tag: string, ...inputs: ReadonlyArray<Input<Msg>>): any {
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
      readonly key: string
      readonly props?: unknown
      readonly onEmit?: ((events: any) => Msg | undefined) | undefined
      readonly fallback?: ((result: any) => Content<Msg, any>) | undefined
      readonly onFailure?: ((failure: AsyncResult.Failure<never, unknown>) => Msg | undefined) | undefined
      readonly view?: ((parts: any) => Content<Msg, any>) | undefined
    }
  ): Child<Msg, any> {
    return {
      _tag: "Child",
      component: component as Component.Any,
      key: options.key,
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
  override children<const C extends ReadonlyArray<Input<Msg>>>(...inputs: C): Element<Msg, Requirements<C[number]>> {
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
