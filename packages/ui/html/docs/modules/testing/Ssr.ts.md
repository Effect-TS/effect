---
title: Ssr.ts
nav_order: 12
parent: Modules
---

## Ssr.ts overview

Server rendering tests: render a tree on the server, hydrate it in a fresh
document, and check that hydration adopted what the server rendered.

`ssr` fails with `SsrError` when:

- an instance the server rendered didn't adopt its Model, or its Model,
  encoded again after adoption, differs from the server's. Props that drift
  between the server and the client show up here, as paths that don't line
  up;
- a node the server rendered outside a deferred instance was rebuilt
  instead of adopted, or a marker is left behind;
- the server's merged head differs from the client's first merge. JSON-LD
  is compared canonically, `class` as a set and `data-*` per name;
- the head sync warns about the server's document.

**Example** (Checking a page hydrates)

```ts
import { ssr } from "@effect/ui-html/testing"
import { Effect, Schema } from "effect"
import { Component, Head } from "effect/ui"

const App = Component.make({
  name: "App",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Home")],
  view: (_, h) => h.el("h1", "Home")
})

const test = Effect.gen(function* () {
  const result = yield* ssr(App, {})
  return result.adopted // ["/App"]
}).pipe(Effect.scoped)
```

Since v4.1.3

---

## Exports Grouped by Category

- [constructors](#constructors)
  - [ssr](#ssr)
- [errors](#errors)
  - [SsrError (class)](#ssrerror-class)
- [models](#models)
  - [Ssr (interface)](#ssr-interface)

---

# constructors

## ssr

Renders a component tree on the server, hydrates the HTML in a fresh
document with the same props, waits for `root.adopted`, and checks that
hydration adopted what the server rendered.

**Details**

Both sides run with the caller's services, so provide the ones the tree
needs, such as `Router.memory`, around `ssr`. The client mount lives as
long as the current Scope. `budget` is passed to `HtmlServer.renderToHtml`.

**Signature**

```ts
declare const ssr: <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & BrowserHost.HtmlRoot<V>,
  props: Props,
  options?: { readonly budget?: Duration.Input | undefined }
) => Effect.Effect<Ssr<Model, Msg>, SsrError, Exclude<R, Html.Host> | Scope.Scope>
```

[Source](https://effect.website/blob/main/src/Ssr.ts#L200)

Since v4.1.3

# errors

## SsrError (class)

Hydration didn't adopt what the server rendered. `problems` lists each
difference, by path or head identity.

**Signature**

```ts
declare class SsrError
```

[Source](https://effect.website/blob/main/src/Ssr.ts#L97)

Since v4.1.3

# models

## Ssr (interface)

What `ssr` hands back once hydration has adopted.

**Details**

`html`, `state` and `model` are the server's, `head` its merged head.
`document` is the hydrated page and `container` the app's element in it.
`adopted` lists the paths whose Model the client adopted. `log` is the
client's log from hydration on, which holds the `CommandDropped` entries
of replayed server Commands, and `serverLog` the server's. `commands` are
the Commands adopted instances ran after replaying `init`, by position.

**Signature**

```ts
export interface Ssr<out Model, in Msg> {
  readonly html: string
  readonly state: Renderer.State
  readonly model: Model | undefined
  readonly head: Head.Head
  readonly document: Document
  readonly container: globalThis.Element
  readonly root: Renderer.Root<Model, Msg>
  readonly adopted: ReadonlyArray<string>
  readonly log: ReadonlyArray<MessageLog.Entry>
  readonly serverLog: ReadonlyArray<MessageLog.Entry>
  readonly commands: ReadonlyArray<{ readonly path: string; readonly name: string; readonly index: number }>
}
```

[Source](https://effect.website/blob/main/src/Ssr.ts#L75)

Since v4.1.3
