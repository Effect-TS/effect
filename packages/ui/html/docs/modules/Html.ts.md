---
title: Html.ts
nav_order: 3
parent: Modules
---

## Html.ts overview

The HTML element vocabulary for `effect/ui`: element names on `h`, typed
events with plain payloads, controlled properties, refs typed by tag, and
ref Commands.

The module is itself a vocabulary. Register it once for the app, with the
type half by module augmentation and the runtime half with
`View.registerElements`, or set it on one component with `elements: Html`.

Event handlers get plain data, never a DOM event: `input` is `{ value }`,
`keydown` is `{ key, shift, ctrl, alt, meta }` and `submit` is `{ fields }`.
`value`, `checked`, `selected` and `open` are controlled: the host puts the
Model's value back after every patch and after every event that could have
changed it, so the element always shows what the Model says.

**Example** (Registering the vocabulary for the app)

```ts
import { Html } from "@effect/ui-html"
import { View } from "effect/ui"

declare module "effect/ui/View" {
  interface Register {
    readonly elements: Html.Elements
  }
}

View.registerElements(Html)
```

**Example** (A controlled text field)

```ts
import { Html } from "@effect/ui-html"
import { Schema } from "effect"
import { Component } from "effect/ui"

const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Add: {} })

const NewTodo = Html.ref("NewTodo", "input")

const Form = Component.make({
  name: "Form",
  model: Schema.String,
  message: Message,
  elements: Html,
  init: () => "",
  update: (draft, message) => (message._tag === "Typed" ? message.value : ""),
  view: (draft, h) =>
    h
      .form(
        h
          .input()
          .ref(NewTodo)
          .attr("aria-label", "New todo")
          .value(draft)
          .onInput(({ value }) => Message.make({ _tag: "Typed", value })),
        h.button("Add").attr("type", "submit")
      )
      .onSubmit(Message.make({ _tag: "Add" }))
})
```

Since v4.1.3

---

## Exports Grouped by Category

- [events](#events)
  - [Events (interface)](#events-interface)
  - [EventsOf (type alias)](#eventsof-type-alias)
  - [InputPayload (interface)](#inputpayload-interface)
  - [KeyPayload (interface)](#keypayload-interface)
  - [PointerPayload (interface)](#pointerpayload-interface)
  - [ScrollPayload (interface)](#scrollpayload-interface)
  - [SubmitPayload (interface)](#submitpayload-interface)
  - [TogglePayload (interface)](#togglepayload-interface)
  - [ValuePayload (interface)](#valuepayload-interface)
- [models](#models)
  - [Element (class)](#element-class)
    - [id (method)](#id-method)
    - [class (method)](#class-method)
    - [disabled (method)](#disabled-method)
    - [value (method)](#value-method)
    - [checked (method)](#checked-method)
    - [selected (method)](#selected-method)
    - [open (method)](#open-method)
    - [onClick (method)](#onclick-method)
    - [onDoubleClick (method)](#ondoubleclick-method)
    - [onKeyDown (method)](#onkeydown-method)
    - [onKeyUp (method)](#onkeyup-method)
    - [onFocus (method)](#onfocus-method)
    - [onBlur (method)](#onblur-method)
    - [onInput (method)](#oninput-method)
    - [onChange (method)](#onchange-method)
    - [onSubmit (method)](#onsubmit-method)
    - [onToggle (method)](#ontoggle-method)
  - [Rect (interface)](#rect-interface)
  - [ScrollOptions (interface)](#scrolloptions-interface)
  - [ValueNode (type alias)](#valuenode-type-alias)
- [refs](#refs)
  - [Blur](#blur)
  - [Focus](#focus)
  - [Found (interface)](#found-interface)
  - [Measure](#measure)
  - [ScrollIntoView](#scrollintoview)
  - [blur](#blur-1)
  - [focus](#focus-1)
  - [measure](#measure-1)
  - [ref](#ref)
  - [scrollIntoView](#scrollintoview-1)
- [services](#services)
  - [Host (class)](#host-class)
- [vocabulary](#vocabulary)
  - [ContainerTag (type alias)](#containertag-type-alias)
  - [Elements](#elements)
  - [Elements (interface)](#elements-interface)
  - [Tags (type alias)](#tags-type-alias)
  - [VoidTag (type alias)](#voidtag-type-alias)
  - [containerTags](#containertags)
  - [name](#name)
  - [tags](#tags)
  - [voidTags](#voidtags)

---

# events

## Events (interface)

The events every HTML element has, with their payloads.

**Details**

`focus`, `blur`, `mouseenter`, `mouseleave` and `scroll` don't bubble: only
the element they happen on gets them. The others go to the innermost element
with a handler.

**Signature**

```ts
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
```

[Source](https://effect.website/blob/main/src/Html.ts#L247)

Since v4.1.3

## EventsOf (type alias)

The events of one tag: the shared `Events` plus the tag's own.

**Signature**

```ts
type EventsOf<K extends string> = Events &
  (K extends "input" ? { readonly input: InputPayload; readonly change: InputPayload } : {}) &
  (K extends "textarea" | "select" ? { readonly input: ValuePayload; readonly change: ValuePayload } : {}) &
  (K extends "form" ? { readonly submit: SubmitPayload; readonly reset: {} } : {}) &
  (K extends "details" ? { readonly toggle: TogglePayload } : {}) &
  (K extends "dialog"
    ? { readonly toggle: TogglePayload; readonly close: { readonly returnValue: string }; readonly cancel: {} }
    : {}) &
  (K extends "img" | "iframe" | "video" | "audio" ? { readonly load: {}; readonly error: {} } : {})
```

[Source](https://effect.website/blob/main/src/Html.ts#L271)

Since v4.1.3

## InputPayload (interface)

The payload of `input` and `change` on an `input`: its value, and whether
it's checked (a checkbox or radio button).

**Signature**

```ts
export interface InputPayload {
  readonly value: string
  readonly checked: boolean
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L188)

Since v4.1.3

## KeyPayload (interface)

The payload of `keydown` and `keyup`.

**Signature**

```ts
export interface KeyPayload {
  readonly key: string
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L160)

Since v4.1.3

## PointerPayload (interface)

The payload of `click`, `dblclick`, `contextmenu`, `mousedown` and
`mouseup`: the button, the position in the viewport, and the modifier keys.

**Signature**

```ts
export interface PointerPayload {
  readonly button: number
  readonly x: number
  readonly y: number
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L143)

Since v4.1.3

## ScrollPayload (interface)

The payload of `scroll`: the element's scroll offsets.

**Signature**

```ts
export interface ScrollPayload {
  readonly top: number
  readonly left: number
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L229)

Since v4.1.3

## SubmitPayload (interface)

The payload of `submit`: the form's fields.

**Details**

`fields` holds the first value of each named field, and `entries` every
name and value in document order, for names used more than once. Files are
left out. The browser's own submission is always prevented.

**Signature**

```ts
export interface SubmitPayload {
  readonly fields: Readonly<Record<string, string>>
  readonly entries: ReadonlyArray<readonly [name: string, value: string]>
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L206)

Since v4.1.3

## TogglePayload (interface)

The payload of `toggle` on a `details` or `dialog`: whether it's open now.

**Signature**

```ts
export interface TogglePayload {
  readonly open: boolean
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L218)

Since v4.1.3

## ValuePayload (interface)

The payload of `input` and `change` on a `textarea` or `select`: the
value the user left in the element.

**Signature**

```ts
export interface ValuePayload {
  readonly value: string
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L176)

Since v4.1.3

# models

## Element (class)

An HTML element builder: the core builder plus typed event sugar, controlled
properties and a few attribute helpers.

**Details**

`Events` are the tag's events and `Node` the DOM element it renders to,
which types `ref` and `onMount`. Every method returns a copy.

**Signature**

```ts
declare class Element<Msg, R, E, Node>
```

[Source](https://effect.website/blob/main/src/Html.ts#L308)

Since v4.1.3

### id (method)

Sets the `id` attribute.

**Signature**

```ts
declare const id: (id: string) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L316)

Since v4.1.3

### class (method)

Sets the `class` attribute.

**Signature**

```ts
declare const class: (value: string) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L324)

Since v4.1.3

### disabled (method)

Sets or removes the `disabled` boolean attribute.

**Signature**

```ts
declare const disabled: (disabled: boolean) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L332)

Since v4.1.3

### value (method)

The controlled `value` of an `input`, `textarea` or `select`. The element
always shows it, whatever the user types, until the Model changes.

**Signature**

```ts
declare const value: <N extends ValueNode>(this: Element<Msg, R, E, N>, value: string) => Element<Msg, R, E, N>
```

[Source](https://effect.website/blob/main/src/Html.ts#L341)

Since v4.1.3

### checked (method)

The controlled `checked` state of a checkbox or radio button.

**Signature**

```ts
declare const checked: (
  this: Element<Msg, R, E, HTMLInputElement>,
  checked: boolean
) => Element<Msg, R, E, HTMLInputElement>
```

[Source](https://effect.website/blob/main/src/Html.ts#L349)

Since v4.1.3

### selected (method)

The controlled `selected` state of an `option`.

**Signature**

```ts
declare const selected: (
  this: Element<Msg, R, E, HTMLOptionElement>,
  selected: boolean
) => Element<Msg, R, E, HTMLOptionElement>
```

[Source](https://effect.website/blob/main/src/Html.ts#L357)

Since v4.1.3

### open (method)

The controlled `open` state of a `details` or `dialog`.

**Signature**

```ts
declare const open: <N extends HTMLDetailsElement | HTMLDialogElement>(
  this: Element<Msg, R, E, N>,
  open: boolean
) => Element<Msg, R, E, N>
```

[Source](https://effect.website/blob/main/src/Html.ts#L368)

Since v4.1.3

### onClick (method)

Sugar for `on("click", handler)`.

**Signature**

```ts
declare const onClick: (handler: View.Handler<Msg, PointerPayload>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L379)

Since v4.1.3

### onDoubleClick (method)

Sugar for `on("dblclick", handler)`.

**Signature**

```ts
declare const onDoubleClick: (handler: View.Handler<Msg, PointerPayload>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L387)

Since v4.1.3

### onKeyDown (method)

Sugar for `on("keydown", handler)`.

**Signature**

```ts
declare const onKeyDown: (handler: View.Handler<Msg, KeyPayload>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L395)

Since v4.1.3

### onKeyUp (method)

Sugar for `on("keyup", handler)`.

**Signature**

```ts
declare const onKeyUp: (handler: View.Handler<Msg, KeyPayload>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L403)

Since v4.1.3

### onFocus (method)

Sugar for `on("focus", handler)`.

**Signature**

```ts
declare const onFocus: (handler: View.Handler<Msg, {}>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L411)

Since v4.1.3

### onBlur (method)

Sugar for `on("blur", handler)`.

**Signature**

```ts
declare const onBlur: (handler: View.Handler<Msg, {}>) => this
```

[Source](https://effect.website/blob/main/src/Html.ts#L419)

Since v4.1.3

### onInput (method)

Sugar for `on("input", handler)`, on the elements that have it.

**Signature**

```ts
declare const onInput: <E2 extends E & { readonly input: unknown }>(
  this: Element<Msg, R, E2, Node>,
  handler: View.Handler<Msg, E2["input"]>
) => Element<Msg, R, E2, Node>
```

[Source](https://effect.website/blob/main/src/Html.ts#L427)

Since v4.1.3

### onChange (method)

Sugar for `on("change", handler)`, on the elements that have it.

**Signature**

```ts
declare const onChange: <E2 extends E & { readonly change: unknown }>(
  this: Element<Msg, R, E2, Node>,
  handler: View.Handler<Msg, E2["change"]>
) => Element<Msg, R, E2, Node>
```

[Source](https://effect.website/blob/main/src/Html.ts#L438)

Since v4.1.3

### onSubmit (method)

Sugar for `on("submit", handler)`, on a `form`.

**Signature**

```ts
declare const onSubmit: <E2 extends E & { readonly submit: unknown }>(
  this: Element<Msg, R, E2, Node>,
  handler: View.Handler<Msg, E2["submit"]>
) => Element<Msg, R, E2, Node>
```

[Source](https://effect.website/blob/main/src/Html.ts#L449)

Since v4.1.3

### onToggle (method)

Sugar for `on("toggle", handler)`, on a `details` or `dialog`.

**Signature**

```ts
declare const onToggle: <E2 extends E & { readonly toggle: unknown }>(
  this: Element<Msg, R, E2, Node>,
  handler: View.Handler<Msg, E2["toggle"]>
) => Element<Msg, R, E2, Node>
```

[Source](https://effect.website/blob/main/src/Html.ts#L460)

Since v4.1.3

## Rect (interface)

An element's box, from `measure`, in CSS pixels relative to the viewport.

**Signature**

```ts
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
```

[Source](https://effect.website/blob/main/src/Html.ts#L107)

Since v4.1.3

## ScrollOptions (interface)

The options of `scrollIntoView`.

**Signature**

```ts
export interface ScrollOptions {
  readonly behavior?: "auto" | "instant" | "smooth" | undefined
  readonly block?: "start" | "center" | "end" | "nearest" | undefined
  readonly inline?: "start" | "center" | "end" | "nearest" | undefined
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L125)

Since v4.1.3

## ValueNode (type alias)

The nodes whose `value` is controlled.

**Signature**

```ts
type ValueNode = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
```

[Source](https://effect.website/blob/main/src/Html.ts#L293)

Since v4.1.3

# refs

## Blur

The Command behind `blur`.

**Signature**

```ts
declare const Blur: Command.Factory<[ref: Renderer.Ref<any>], Found, false>
```

[Source](https://effect.website/blob/main/src/Html.ts#L726)

Since v4.1.3

## Focus

The Command behind `focus`, for a story's `.resolve(Html.Focus, { found })`.

**Signature**

```ts
declare const Focus: Command.Factory<
  [ref: Renderer.Ref<any>, options?: { readonly preventScroll?: boolean | undefined } | undefined],
  Found,
  false
>
```

[Source](https://effect.website/blob/main/src/Html.ts#L707)

Since v4.1.3

## Found (interface)

What `focus`, `blur` and `scrollIntoView` report: whether the ref was
rendered.

**Signature**

```ts
export interface Found {
  readonly found: boolean
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L686)

Since v4.1.3

## Measure

The Command behind `measure`.

**Signature**

```ts
declare const Measure: Command.Factory<[ref: Renderer.Ref<any>], Option.Option<Rect>, false>
```

[Source](https://effect.website/blob/main/src/Html.ts#L757)

Since v4.1.3

## ScrollIntoView

The Command behind `scrollIntoView`.

**Signature**

```ts
declare const ScrollIntoView: Command.Factory<
  [ref: Renderer.Ref<any>, options?: ScrollOptions | undefined],
  Found,
  false
>
```

[Source](https://effect.website/blob/main/src/Html.ts#L741)

Since v4.1.3

## blur

Takes focus away from the element `ref` names, and sends `f`'s message.

**Signature**

```ts
declare const blur: <N extends HTMLElement | SVGElement, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg
) => Command.Mapped<Command.Effectful<Found>, Msg>
```

[Source](https://effect.website/blob/main/src/Html.ts#L801)

Since v4.1.3

## focus

Focuses the element `ref` names, once the render the issuing `update`
caused is committed, and sends `f`'s message.

**Details**

A ref that isn't rendered gives `{ found: false }`. The ref resolves within
the issuing instance. `Refs` and `Html.Host` are framework services, so
this adds nothing to a component's requirements.

**Example** (Focusing the new-todo field after adding)

```ts
import { Html } from "@effect/ui-html"
import { Schema } from "effect"

const Message = Schema.TaggedUnion({ Add: {}, Focused: {} })
const NewTodo = Html.ref("NewTodo", "input")

const command = Html.focus(NewTodo, () => Message.make({ _tag: "Focused" }))
```

**Signature**

```ts
declare const focus: <N extends HTMLElement | SVGElement, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg,
  options?: { readonly preventScroll?: boolean | undefined }
) => Command.Mapped<Command.Effectful<Found>, Msg>
```

[Source](https://effect.website/blob/main/src/Html.ts#L788)

Since v4.1.3

## measure

Measures the element `ref` names, and sends `f`'s message with its box, or
`Option.none()` when the ref isn't rendered.

**Signature**

```ts
declare const measure: <N extends globalThis.Element, Msg>(
  ref: Renderer.Ref<N>,
  f: (rect: Option.Option<Rect>) => Msg
) => Command.Mapped<Command.Effectful<Option.Option<Rect>>, Msg>
```

[Source](https://effect.website/blob/main/src/Html.ts#L827)

Since v4.1.3

## ref

Declares a ref to an element of tag `tag`. Attaching it to another tag
doesn't compile. List rows use `Row.at(id)`.

**Signature**

```ts
declare const ref: <K extends keyof HTMLElementTagNameMap>(
  name: string,
  _tag: K
) => Renderer.Ref<HTMLElementTagNameMap[K]>
```

[Source](https://effect.website/blob/main/src/Html.ts#L673)

Since v4.1.3

## scrollIntoView

Scrolls the element `ref` names into view, and sends `f`'s message.

**Signature**

```ts
declare const scrollIntoView: <N extends globalThis.Element, Msg>(
  ref: Renderer.Ref<N>,
  f: (result: Found) => Msg,
  options?: ScrollOptions
) => Command.Mapped<Command.Effectful<Found>, Msg>
```

[Source](https://effect.website/blob/main/src/Html.ts#L813)

Since v4.1.3

# services

## Host (class)

The HTML host marker: a host Layer that can show HTML elements provides it.

**Details**

`mount` requires it for an HTML root, so mounting one on another host is a
type error. It's a framework service, so a Command may use it without it
appearing in a component's requirements. It holds the element operations
the ref Commands use, which a test on `TestHost` fakes with
`Layer.succeed(Html.Host, ...)`.

**Signature**

```ts
declare class Host
```

[Source](https://effect.website/blob/main/src/Html.ts#L87)

Since v4.1.3

# vocabulary

## ContainerTag (type alias)

A tag that takes children.

**Signature**

```ts
type ContainerTag = (typeof containerTags)[number]
```

[Source](https://effect.website/blob/main/src/Html.ts#L582)

Since v4.1.3

## Elements

Phantom: carries `Elements` on the module, so the module namespace is a
`View.Vocabulary<Elements>`. It's `undefined` at runtime.

**Signature**

```ts
declare const Elements: Elements | undefined
```

[Source](https://effect.website/blob/main/src/Html.ts#L631)

Since v4.1.3

## Elements (interface)

The type-level vocabulary, for `View.Register`.

**Signature**

```ts
export interface Elements extends View.Elements {
  readonly Tags: Tags<this["Msg"]>
  readonly Host: Host
}
```

[Source](https://effect.website/blob/main/src/Html.ts#L618)

Since v4.1.3

## Tags (type alias)

The element names the vocabulary adds to `h`, bound to a component's
message type. Document-level tags (`html`, `head`, `body`, `title`, `meta`,
`link`, `base`, `script`, `style`) aren't here: the document head is managed
through a component's `head`.

**Signature**

```ts
type Tags<Msg> = {
  readonly [K in ContainerTag]: <const C extends ReadonlyArray<View.Input<Msg>>>(
    ...children: C
  ) => Element<Msg, View.Requirements<C[number]>, EventsOf<K>, HTMLElementTagNameMap[K]>
} & { readonly [K in VoidTag]: () => Element<Msg, never, EventsOf<K>, HTMLElementTagNameMap[K]> }
```

[Source](https://effect.website/blob/main/src/Html.ts#L603)

Since v4.1.3

## VoidTag (type alias)

A void tag.

**Signature**

```ts
type VoidTag = (typeof voidTags)[number]
```

[Source](https://effect.website/blob/main/src/Html.ts#L591)

Since v4.1.3

## containerTags

The tags that take children.

**Signature**

```ts
declare const containerTags: readonly [
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
]
```

[Source](https://effect.website/blob/main/src/Html.ts#L475)

Since v4.1.3

## name

The vocabulary's name, which a host lists to show it.

**Signature**

```ts
declare const name: "html"
```

[Source](https://effect.website/blob/main/src/Html.ts#L640)

Since v4.1.3

## tags

The element constructors installed on `h`.

**Signature**

```ts
declare const tags: Readonly<Record<string, (...children: ReadonlyArray<any>) => Element<any, any, any, any>>>
```

[Source](https://effect.website/blob/main/src/Html.ts#L658)

Since v4.1.3

## voidTags

The void tags, which take no children.

**Signature**

```ts
declare const voidTags: readonly ["br", "col", "hr", "img", "input", "source", "track", "wbr"]
```

[Source](https://effect.website/blob/main/src/Html.ts#L573)

Since v4.1.3
