---
title: BrowserHost.ts
nav_order: 1
parent: Modules
---

## BrowserHost.ts overview

The DOM host for `effect/ui`: mounts a component tree into an element of a
real document.

Events are delegated: the host keeps one listener per event name on the
document, and each element stores its handlers as data, so re-rendering
never touches listeners. An event goes to the innermost element with a
handler for it, and its handler gets a plain payload built from the DOM
event, never the event itself. A form the app renders never submits
natively, whether or not it has a `submit` handler.

`value`, `checked`, `selected` and `open` are controlled. The host sets them
after the element's children exist, skips a no-op so the caret doesn't jump,
and puts the Model's value back after the user changes it and the Model
didn't follow, whether `update` rejected the change or nothing handled it.

**Example** (Mounting an app)

```ts
import { BrowserHost, Html } from "@effect/ui-html"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"

const Message = Schema.TaggedUnion({ Increment: {} })

const Counter = Component.make({
  name: "Counter",
  model: Schema.Number,
  message: Message,
  elements: Html,
  init: () => 0,
  update: (count) => count + 1,
  view: (count, h) => h.button(String(count)).onClick(Message.make({ _tag: "Increment" }))
})

const main = BrowserHost.mount(Counter, {}, document.getElementById("app")!).pipe(
  Effect.andThen(Effect.never),
  Effect.scoped
)
```

Since v4.1.3

---

## Exports Grouped by Category

- [constructors](#constructors)
  - [htmlHost](#htmlhost)
  - [makeHost](#makehost)
  - [mount](#mount)
- [layers](#layers)
  - [layer](#layer)
- [utility types](#utility-types)
  - [HtmlRoot (type alias)](#htmlroot-type-alias)

---

# constructors

## htmlHost

The element operations behind `Html.focus`, `blur`, `scrollIntoView` and
`measure`, on DOM elements.

**Signature**

```ts
declare const htmlHost: {
  readonly focus: (element: globalThis.Element, options: { readonly preventScroll?: boolean | undefined }) => void
  readonly blur: (element: globalThis.Element) => void
  readonly scrollIntoView: (element: globalThis.Element, options: Html.ScrollOptions) => void
  readonly measure: (element: globalThis.Element) => Html.Rect
}
```

[Source](https://effect.website/blob/main/src/BrowserHost.ts#L396)

Since v4.1.3

## makeHost

Makes a DOM host for `document`, plus `dispose`, which removes its
listeners.

**Details**

Most apps use `layer` or `mount`, which manage this for them. The host shows
the `html` vocabulary and host-neutral components. A component of another
vocabulary fails its own slot when it mounts.

The host keeps the document head in sync with the tree's merged
`Head.Head`. It owns only tags marked `data-eui`, plus `<title>` and
`lang` / `dir` on `<html>`, and restores the shell's value once no entry
sets one. Static titles, `lang`, classes and `data-*` on `<html>` and
`<body>` belong in the root component's `head`, not in the shell: HTML
keeps the first copy of a duplicated attribute, so the shell's copy would
hide the framework's. `warn` reports a shell that conflicts with the head
on the first sync, and defaults to `console.warn`. The check runs in every
build, as `effect` has no development switch; it looks at the shell once,
and `warn: () => {}` silences it.

**Signature**

```ts
declare const makeHost: (
  document: Document,
  options?: { readonly warn?: ((message: string) => void) | undefined }
) => Renderer.Host<globalThis.Node> & { readonly dispose: () => void }
```

[Source](https://effect.website/blob/main/src/BrowserHost.ts#L204)

Since v4.1.3

## mount

Mounts a component tree into `container`, for the life of the current
Scope.

**Details**

The root must render HTML (or be host-neutral): mounting a root of another
vocabulary is a type error. Nested components are checked when they mount,
and one of another vocabulary fails its own slot. The tree's requirements
are the root's, minus `Html.Host`, which the host provides. When the root
itself fails, `fallback` is shown in its place.

Commands and Subscriptions run on the default scheduler, the render flush
on a microtask.

**Hydration.** Pass the `state` from `HtmlServer.renderToHtml`, with the
server's HTML already in `container` and the same props, to adopt the
server's nodes instead of building them. Each instance adopts its server
Model and replays `init` only to recover its Commands; server Commands the
Model already has the result of are skipped, and those that missed the
budget run now. `onMount` fires on adoption. An instance whose view doesn't
match the server's nodes is rebuilt on its own, and one the server deferred
is built fresh.

An instance whose provided Layer is still building keeps the server's
nodes until the Layer is ready, and everything else is live at once. A
waiting slot is inert: its buttons do nothing, links still navigate through
the Router, a `<form>` submits natively, and typed input is overwritten
when it adopts. `root.adopted` completes when no slot is waiting, and head
sync starts after it.

**Signature**

```ts
declare const mount: <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements, RF = never>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & HtmlRoot<V>,
  props: Props,
  container: globalThis.Element,
  options?: {
    readonly fallback?:
      | ((
          failure: AsyncResult.Failure<never, unknown>,
          h: View.Helper<never, {}> & View.Tags<V, never>
        ) => View.Node<never, RF>)
      | undefined
    readonly state?: Renderer.State | undefined
  }
) => Effect.Effect<Renderer.Root<Model, Msg>, never, Exclude<R | RF, Html.Host> | Scope.Scope>
```

[Source](https://effect.website/blob/main/src/BrowserHost.ts#L483)

Since v4.1.3

# layers

## layer

Provides the DOM host as the `Renderer`, and `Html.Host`, for the life of
the Layer.

**Details**

`document` defaults to the global `document`. Closing the Layer removes the
host's listeners.

**Signature**

```ts
declare const layer: (options?: {
  readonly document?: Document | undefined
}) => Layer.Layer<Renderer.Renderer | Html.Host>
```

[Source](https://effect.website/blob/main/src/BrowserHost.ts#L428)

Since v4.1.3

# utility types

## HtmlRoot (type alias)

Passes when a root shows HTML or is host-neutral, and otherwise names the
host its vocabulary needs.

**Signature**

```ts
type HtmlRoot<V> = [Renderer.HostOf<V>] extends [Html.Host]
  ? unknown
  : { readonly "BrowserHost.mount shows HTML elements. This root's vocabulary needs": Renderer.HostOf<V> }
```

[Source](https://effect.website/blob/main/src/BrowserHost.ts#L445)

Since v4.1.3
