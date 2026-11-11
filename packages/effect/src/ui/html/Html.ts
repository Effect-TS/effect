/**
 * The HTML element vocabulary for `effect/ui`: element names on `h`, typed
 * events with plain payloads, controlled properties, refs typed by tag, and
 * ref Commands.
 *
 * The module is itself a vocabulary. Register it once for the app by
 * importing `effect/ui/html/register`, or set it on one component with
 * `elements: Html`.
 *
 * Event handlers get plain data, never a DOM event: `input` is `{ value }`,
 * `keydown` is `{ key, shift, ctrl, alt, meta }` and `submit` is `{ fields }`.
 * `value`, `checked`, `selected` and `open` are controlled: the host puts the
 * Model's value back after every patch and after every event that could have
 * changed it, so the element always shows what the Model says.
 *
 * **Example** (Registering the vocabulary for the app)
 *
 * ```ts
 * import "effect/ui/html/register"
 * ```
 *
 * **Example** (A controlled text field)
 *
 * ```ts import.meta.vitest
 * import { Html } from "effect/ui/html"
 * import { Schema } from "effect"
 * import { Component } from "effect/ui"
 *
 * const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Add: {} })
 *
 * const NewTodo = Html.ref("NewTodo", "input")
 *
 * const Form = Component.make({
 *   name: "Form",
 *   model: Schema.String,
 *   message: Message,
 *   elements: Html,
 *   init: () => "",
 *   update: (draft, message) => (message._tag === "Typed" ? message.value : ""),
 *   view: (draft, h) =>
 *     h.form(
 *       h.input().ref(NewTodo).attr("aria-label", "New todo").value(draft)
 *         .onInput(({ value }) => Message.make({ _tag: "Typed", value })),
 *       h.button("Add").attr("type", "submit")
 *     ).onSubmit(Message.make({ _tag: "Add" }))
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as Command from "../Command.ts"
import * as Renderer from "../Renderer.ts"
import * as View from "../View.ts"

// ---------------------------------------------------------------------------
// host
// ---------------------------------------------------------------------------

/**
 * The HTML host marker: a host Layer that can show HTML elements provides it.
 *
 * **Details**
 *
 * `mount` requires it for an HTML root, so mounting one on another host is a
 * type error. It's a framework service, so a Command may use it without it
 * appearing in a component's requirements. It holds the element operations
 * the ref Commands use, which a test on `TestHost` fakes with
 * `Layer.succeed(Html.Host, ...)`.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export class Host extends Context.Service<Host, {
  readonly focus: (element: globalThis.Element, options: { readonly preventScroll?: boolean | undefined }) => void
  readonly blur: (element: globalThis.Element) => void
  readonly scrollIntoView: (element: globalThis.Element, options: ScrollOptions) => void
  readonly measure: (element: globalThis.Element) => Rect
}>()("effect/ui/html/Html/Host") {}

declare module "../Command.ts" {
  interface FrameworkServices {
    readonly HtmlHost: Host
  }
}

/**
 * An element's box, from `measure`, in CSS pixels relative to the viewport.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * The options of `scrollIntoView`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ScrollOptions {
  readonly behavior?: "auto" | "instant" | "smooth" | undefined
  readonly block?: "start" | "center" | "end" | "nearest" | undefined
  readonly inline?: "start" | "center" | "end" | "nearest" | undefined
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

/**
 * The payload of `click`, `dblclick`, `contextmenu`, `mousedown` and
 * `mouseup`: the button, the position in the viewport, and the modifier keys.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface PointerPayload {
  readonly button: number
  readonly x: number
  readonly y: number
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}

/**
 * The payload of `keydown` and `keyup`.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface KeyPayload {
  readonly key: string
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}

/**
 * The payload of `input` and `change` on a `textarea` or `select`: the
 * value the user left in the element.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface ValuePayload {
  readonly value: string
}

/**
 * The payload of `input` and `change` on an `input`: its value, and whether
 * it's checked (a checkbox or radio button).
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface InputPayload {
  readonly value: string
  readonly checked: boolean
}

/**
 * The payload of `submit`: the form's fields.
 *
 * **Details**
 *
 * `fields` holds the first value of each named field, and `entries` every
 * name and value in document order, for names used more than once. Files are
 * left out. The browser's own submission is always prevented.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface SubmitPayload {
  readonly fields: Readonly<Record<string, string>>
  readonly entries: ReadonlyArray<readonly [name: string, value: string]>
}

/**
 * The payload of `toggle` on a `details` or `dialog`: whether it's open now.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface TogglePayload {
  readonly open: boolean
}

/**
 * The payload of `scroll`: the element's scroll offsets.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface ScrollPayload {
  readonly top: number
  readonly left: number
}

/**
 * The events every HTML element has, with their payloads.
 *
 * **Details**
 *
 * `focus`, `blur`, `mouseenter`, `mouseleave` and `scroll` don't bubble: only
 * the element they happen on gets them. The others go to the innermost element
 * with a handler.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export interface Events {
  readonly click: PointerPayload
  readonly dblclick: PointerPayload
  readonly contextmenu: PointerPayload
  readonly mousedown: PointerPayload
  readonly mouseup: PointerPayload
  readonly mouseenter: {}
  readonly mouseleave: {}
  readonly keydown: KeyPayload
  readonly keyup: KeyPayload
  readonly focus: {}
  readonly blur: {}
  readonly focusin: {}
  readonly focusout: {}
  readonly scroll: ScrollPayload
}

/**
 * The events of one tag: the shared `Events` plus the tag's own.
 *
 * @stability experimental
 * @category events
 * @since 4.1.5
 */
export type EventsOf<K extends string> =
  & Events
  & (K extends "input" ? { readonly input: InputPayload; readonly change: InputPayload } : {})
  & (K extends "textarea" | "select" ? { readonly input: ValuePayload; readonly change: ValuePayload } : {})
  & (K extends "form" ? { readonly submit: SubmitPayload; readonly reset: {} } : {})
  & (K extends "details" ? { readonly toggle: TogglePayload } : {})
  & (K extends "dialog" ?
    { readonly toggle: TogglePayload; readonly close: { readonly returnValue: string }; readonly cancel: {} }
    : {})
  & (K extends "img" | "iframe" | "video" | "audio" ? { readonly load: {}; readonly error: {} } : {})

// ---------------------------------------------------------------------------
// elements
// ---------------------------------------------------------------------------

/**
 * The nodes whose `value` is controlled.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type ValueNode = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * An HTML element builder: the core builder plus typed event sugar, controlled
 * properties and a few attribute helpers.
 *
 * **Details**
 *
 * `Events` are the tag's events and `Node` the DOM element it renders to,
 * which types `ref` and `onMount`. Every method returns a copy.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export class Element<out Msg, out R = never, in out E = Record<string, unknown>, in out Node = unknown>
  extends View.ElementBuilder<Msg, R, E, Node>
{
  /**
   * Sets the `id` attribute.
   *
   * @since 4.1.5
   */
  id(id: string): this {
    return this.attr("id", id)
  }
  /**
   * Sets the `class` attribute from class tokens, skipping `false`, `null`,
   * `undefined` and `""`.
   *
   * **Details**
   *
   * The remaining tokens are joined with one space, as `classNames` does.
   * When none remain, the attribute is removed instead of rendering
   * `class=""`. Calling `class` again replaces the earlier value.
   *
   * **Example** (Adding classes conditionally)
   *
   * ```ts
   * import type { Html } from "effect/ui/html"
   *
   * declare const h: Html.Tags<never>
   * declare const model: { readonly saving: boolean; readonly error: string | undefined }
   *
   * const save = h.button("Save").class(
   *   "rounded px-3 py-1",
   *   model.saving && "opacity-50",
   *   model.error !== undefined && "ring-2 ring-red-500"
   * )
   * ```
   *
   * @since 4.1.5
   */
  class(...tokens: ReadonlyArray<ClassToken>): this {
    const value = classNames(...tokens)
    return this.attr("class", value === "" ? undefined : value)
  }
  /**
   * Sets or removes the `disabled` boolean attribute.
   *
   * @since 4.1.5
   */
  disabled(disabled: boolean): this {
    return this.attr("disabled", disabled ? "" : undefined)
  }
  /**
   * The controlled `value` of an `input`, `textarea` or `select`. The element
   * always shows it, whatever the user types, until the Model changes.
   *
   * @since 4.1.5
   */
  value<N extends ValueNode>(this: Element<Msg, R, E, N>, value: string): Element<Msg, R, E, N> {
    return this.prop("value", value)
  }
  /**
   * The controlled `checked` state of a checkbox or radio button.
   *
   * @since 4.1.5
   */
  checked(this: Element<Msg, R, E, HTMLInputElement>, checked: boolean): Element<Msg, R, E, HTMLInputElement> {
    return this.prop("checked", checked)
  }
  /**
   * The controlled `selected` state of an `option`.
   *
   * @since 4.1.5
   */
  selected(
    this: Element<Msg, R, E, HTMLOptionElement>,
    selected: boolean
  ): Element<Msg, R, E, HTMLOptionElement> {
    return this.prop("selected", selected)
  }
  /**
   * The controlled `open` state of a `details` or `dialog`.
   *
   * @since 4.1.5
   */
  open<N extends HTMLDetailsElement | HTMLDialogElement>(
    this: Element<Msg, R, E, N>,
    open: boolean
  ): Element<Msg, R, E, N> {
    return this.prop("open", open)
  }
  /**
   * Sugar for `on("click", handler)`.
   *
   * @since 4.1.5
   */
  onClick(handler: View.Handler<Msg, PointerPayload>): this {
    return this.on("click" as any, handler as any)
  }
  /**
   * Sugar for `on("dblclick", handler)`.
   *
   * @since 4.1.5
   */
  onDoubleClick(handler: View.Handler<Msg, PointerPayload>): this {
    return this.on("dblclick" as any, handler as any)
  }
  /**
   * Sugar for `on("keydown", handler)`.
   *
   * @since 4.1.5
   */
  onKeyDown(handler: View.Handler<Msg, KeyPayload>): this {
    return this.on("keydown" as any, handler as any)
  }
  /**
   * Sugar for `on("keyup", handler)`.
   *
   * @since 4.1.5
   */
  onKeyUp(handler: View.Handler<Msg, KeyPayload>): this {
    return this.on("keyup" as any, handler as any)
  }
  /**
   * Sugar for `on("focus", handler)`.
   *
   * @since 4.1.5
   */
  onFocus(handler: View.Handler<Msg, {}>): this {
    return this.on("focus" as any, handler as any)
  }
  /**
   * Sugar for `on("blur", handler)`.
   *
   * @since 4.1.5
   */
  onBlur(handler: View.Handler<Msg, {}>): this {
    return this.on("blur" as any, handler as any)
  }
  /**
   * Sugar for `on("input", handler)`, on the elements that have it.
   *
   * @since 4.1.5
   */
  onInput<E2 extends E & { readonly input: unknown }>(
    this: Element<Msg, R, E2, Node>,
    handler: View.Handler<Msg, E2["input"]>
  ): Element<Msg, R, E2, Node> {
    return this.on("input", handler)
  }
  /**
   * Sugar for `on("change", handler)`, on the elements that have it.
   *
   * @since 4.1.5
   */
  onChange<E2 extends E & { readonly change: unknown }>(
    this: Element<Msg, R, E2, Node>,
    handler: View.Handler<Msg, E2["change"]>
  ): Element<Msg, R, E2, Node> {
    return this.on("change", handler)
  }
  /**
   * Sugar for `on("submit", handler)`, on a `form`.
   *
   * @since 4.1.5
   */
  onSubmit<E2 extends E & { readonly submit: unknown }>(
    this: Element<Msg, R, E2, Node>,
    handler: View.Handler<Msg, E2["submit"]>
  ): Element<Msg, R, E2, Node> {
    return this.on("submit", handler)
  }
  /**
   * Sugar for `on("toggle", handler)`, on a `details` or `dialog`.
   *
   * @since 4.1.5
   */
  onToggle<E2 extends E & { readonly toggle: unknown }>(
    this: Element<Msg, R, E2, Node>,
    handler: View.Handler<Msg, E2["toggle"]>
  ): Element<Msg, R, E2, Node> {
    return this.on("toggle", handler)
  }
}

/**
 * One class token for `classNames` and `Element.class`: a class string, or
 * `false`, `null` or `undefined` for a class that is left out.
 *
 * **Details**
 *
 * `true` and numbers aren't tokens, which catches `cond || "x"` and
 * `count && "x"` mistakes at compile time.
 *
 * @stability experimental
 * @category attributes
 * @since 4.1.5
 */
export type ClassToken = string | false | null | undefined

/**
 * Joins class tokens with one space, skipping `false`, `null`, `undefined`
 * and `""`.
 *
 * **When to use**
 *
 * Use to build a class string outside `Element.class`, such as an attribute
 * other than `class` or a value passed to a child component.
 *
 * **Details**
 *
 * Tokens are kept as written: there is no splitting, deduplication or
 * conflict resolution between utility classes. With no tokens left it returns
 * `""`.
 *
 * **Example** (Building a class string)
 *
 * ```ts import.meta.vitest
 * import { Html } from "effect/ui/html"
 *
 * const tabClass = (active: boolean) => Html.classNames("tab", active && "tab-active")
 *
 * tabClass(true) // => "tab tab-active"
 * tabClass(false) // => "tab"
 * ```
 *
 * @stability experimental
 * @category attributes
 * @since 4.1.5
 */
export const classNames = (...tokens: ReadonlyArray<ClassToken>): string => {
  let out = ""
  for (const token of tokens) {
    if (token) out = out === "" ? token : `${out} ${token}`
  }
  return out
}

/**
 * The tags that take children.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export const containerTags = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "i",
  "iframe",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "meter",
  "nav",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "search",
  "section",
  "select",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "video"
] as const

/**
 * The void tags, which take no children.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export const voidTags = ["br", "col", "hr", "img", "input", "source", "track", "wbr"] as const

/**
 * A tag that takes children.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export type ContainerTag = typeof containerTags[number]

/**
 * A void tag.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export type VoidTag = typeof voidTags[number]

/**
 * The element names the vocabulary adds to `h`, bound to a component's
 * message type. Document-level tags (`html`, `head`, `body`, `title`, `meta`,
 * `link`, `base`, `script`, `style`) aren't here: the document head is managed
 * through a component's `head`.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export type Tags<Msg> =
  & {
    readonly [K in ContainerTag]: <const C extends ReadonlyArray<View.Input<Msg>>>(
      ...children: C
    ) => Element<Msg, View.Requirements<C[number]>, EventsOf<K>, HTMLElementTagNameMap[K]>
  }
  & { readonly [K in VoidTag]: () => Element<Msg, never, EventsOf<K>, HTMLElementTagNameMap[K]> }

/**
 * The type-level vocabulary, for `View.Register`.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export interface Elements extends View.Elements {
  readonly Tags: Tags<this["Msg"]>
  readonly Host: Host
}

/**
 * Phantom: carries `Elements` on the module, so the module namespace is a
 * `View.Vocabulary<Elements>`. It's `undefined` at runtime.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export const Elements: Elements | undefined = undefined

/**
 * The vocabulary's name, which a host lists to show it.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export const name = "html"

const makeTags = (): Readonly<Record<string, (...children: ReadonlyArray<any>) => Element<any, any, any, any>>> => {
  const out: Record<string, (...children: ReadonlyArray<any>) => Element<any, any, any, any>> = {}
  for (const tag of containerTags) {
    out[tag] = (...children: ReadonlyArray<View.Input<any>>) => new Element(tag, View.children(children))
  }
  for (const tag of voidTags) out[tag] = () => new Element(tag, [])
  return out
}

/**
 * The element constructors installed on `h`.
 *
 * @stability experimental
 * @category vocabulary
 * @since 4.1.5
 */
export const tags: Readonly<Record<string, (...children: ReadonlyArray<any>) => Element<any, any, any, any>>> =
  makeTags()

// ---------------------------------------------------------------------------
// refs
// ---------------------------------------------------------------------------

/**
 * Declares a ref to an element of tag `tag`. Attaching it to another tag
 * doesn't compile. List rows use `Row.at(id)`.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const ref = <K extends keyof HTMLElementTagNameMap>(
  name: string,
  _tag: K
): Renderer.Ref<HTMLElementTagNameMap[K]> => Renderer.ref<HTMLElementTagNameMap[K]>(name)

/**
 * What `focus`, `blur` and `scrollIntoView` report: whether the ref was
 * rendered.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export interface Found {
  readonly found: boolean
}

const withElement = <A>(
  ref: Renderer.Ref<any>,
  f: (host: Context.Service.Shape<typeof Host>, element: globalThis.Element) => A
): Effect.Effect<Option.Option<A>, never, Renderer.Refs | Host> =>
  Renderer.Refs.use((refs) =>
    Effect.flatMap(refs.lookup(ref), (node) =>
      Option.isNone(node)
        ? Effect.succeed(Option.none())
        : Host.useSync((host) => Option.some(f(host, node.value as globalThis.Element))))
  )

const FocusOptions = Schema.Struct({ preventScroll: Schema.optional(Schema.Boolean) })
const ScrollOptionsSchema = Schema.Struct({
  behavior: Schema.optional(Schema.Literals(["auto", "instant", "smooth"])),
  block: Schema.optional(Schema.Literals(["center", "end", "nearest", "start"])),
  inline: Schema.optional(Schema.Literals(["center", "end", "nearest", "start"]))
})

/**
 * The Command behind `focus`, for a story's `.resolve(Html.Focus, { found })`.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const Focus: Command.Factory<
  { readonly ref: Renderer.Ref<any>; readonly options?: { readonly preventScroll?: boolean | undefined } | undefined },
  Found
> = Command.make(
  "Html.focus",
  { args: { ref: Renderer.Ref, options: Schema.optional(FocusOptions) } },
  ({ options, ref }) =>
    Effect.map(
      withElement(ref, (host, element) => host.focus(element, options ?? {})),
      (done): Found => ({ found: Option.isSome(done) })
    )
)

/**
 * The Command behind `blur`.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const Blur: Command.Factory<{ readonly ref: Renderer.Ref<any> }, Found> = Command.make(
  "Html.blur",
  { args: { ref: Renderer.Ref } },
  ({ ref }) =>
    Effect.map(withElement(ref, (host, element) => host.blur(element)), (done): Found => ({
      found: Option.isSome(done)
    }))
)

/**
 * The Command behind `scrollIntoView`.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const ScrollIntoView: Command.Factory<
  { readonly ref: Renderer.Ref<any>; readonly options?: ScrollOptions | undefined },
  Found
> = Command.make(
  "Html.scrollIntoView",
  { args: { ref: Renderer.Ref, options: Schema.optional(ScrollOptionsSchema) } },
  ({ options, ref }) =>
    Effect.map(withElement(ref, (host, element) => host.scrollIntoView(element, options ?? {})), (done): Found => ({
      found: Option.isSome(done)
    }))
)

/**
 * The Command behind `measure`.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const Measure: Command.Factory<{ readonly ref: Renderer.Ref<any> }, Option.Option<Rect>> = Command.make(
  "Html.measure",
  { args: { ref: Renderer.Ref } },
  ({ ref }) => withElement(ref, (host, element) => host.measure(element))
)

/**
 * Focuses the element `ref` names, once the render the issuing `update`
 * caused is committed, and sends `f`'s message.
 *
 * **Details**
 *
 * A ref that isn't rendered gives `{ found: false }`. The ref resolves within
 * the issuing instance. `Refs` and `Html.Host` are framework services, so
 * this adds nothing to a component's requirements.
 *
 * **Example** (Focusing the new-todo field after adding)
 *
 * ```ts
 * import { Html } from "effect/ui/html"
 * import { Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Add: {}, Focused: {} })
 * const NewTodo = Html.ref("NewTodo", "input")
 *
 * const command = Html.focus(NewTodo, () => Message.make({ _tag: "Focused" }))
 * ```
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const focus = <N extends HTMLElement | SVGElement, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg,
  options?: { readonly preventScroll?: boolean | undefined }
): Command.Mapped<Command.Effectful<Found>, Msg> =>
  Command.map(Focus(options === undefined ? { ref } : { ref, options }), f)

/**
 * Takes focus away from the element `ref` names, and sends `f`'s message.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const blur = <N extends HTMLElement | SVGElement, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg
): Command.Mapped<Command.Effectful<Found>, Msg> => Command.map(Blur({ ref }), f)

/**
 * Scrolls the element `ref` names into view, and sends `f`'s message.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const scrollIntoView = <N extends globalThis.Element, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg,
  options?: ScrollOptions
): Command.Mapped<Command.Effectful<Found>, Msg> =>
  Command.map(ScrollIntoView(options === undefined ? { ref } : { ref, options }), f)

/**
 * Measures the element `ref` names, and sends `f`'s message with its box, or
 * `Option.none()` when the ref isn't rendered.
 *
 * @stability experimental
 * @category refs
 * @since 4.1.5
 */
export const measure = <N extends globalThis.Element, Msg>(
  ref: Renderer.Ref<N>,
  f: (rect: Option.Option<Rect>) => Msg
): Command.Mapped<Command.Effectful<Option.Option<Rect>>, Msg> => Command.map(Measure({ ref }), f)
