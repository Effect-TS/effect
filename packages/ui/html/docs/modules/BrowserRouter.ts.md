---
title: BrowserRouter.ts
nav_order: 2
parent: Modules
---

## BrowserRouter.ts overview

The browser's Router: `window.history` behind the `effect/ui` Router
contract, plus link interception, scroll, route-change announcements and
focus.

**Details**

Provide `layer` (or `layerHash`, for static hosting) next to the host. The
root holds the route: its props carry the initial one and
`Router.subscription` delivers each change as a message.

Links are plain anchors with a printed route. A click is intercepted only
when the routes parse its href and it has no modifier key, `target` or
`download`. Anything else is a full page load. `<form method="get">` is
intercepted by the same test.

Once a navigation settles (the first flush after the root received it in
which no Layer build begun since is still pending), the router scrolls,
announces the page in a live region and moves focus. A push goes to the top
or to its `#hash` element, and back and forward restore the saved position.

**Example** (A two-page app)

```ts
import { BrowserHost, BrowserRouter, Html } from "@effect/ui-html"
import { Effect, Layer, Option, Schema } from "effect"
import { Component, Route, Router } from "effect/ui"

const AppRoute = Route.union({
  Home: Route.make("/"),
  Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
  NotFound: Route.make("/*")
})
type AppRoute = typeof AppRoute.Type

const Message = Schema.TaggedUnion({ ChangedRoute: { route: AppRoute } })

const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: AppRoute,
  message: Message,
  elements: Html,
  init: ($) => $.props.route,
  update: (route, message) => (AppRoute.print(message.route) === AppRoute.print(route) ? route : message.route),
  subscriptions: () => [Router.subscription(AppRoute, (route) => Message.make({ _tag: "ChangedRoute", route }))],
  view: (route, h) =>
    h.div(
      h.a("Ada").attr("href", AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 1 } }))),
      h.h1(route._tag)
    )
})

const main = Effect.gen(function* () {
  const router = yield* Router.Router
  yield* BrowserHost.mount(App, { route: router.location().route as AppRoute }, document.getElementById("app")!)
  return yield* Effect.never
}).pipe(Effect.scoped, Effect.provide(BrowserRouter.layer({ routes: AppRoute })))
```

Since v4.1.3

---

## Exports Grouped by Category

- [layers](#layers)
  - [layer](#layer)
  - [layerHash](#layerhash)
- [models](#models)
  - [Options (interface)](#options-interface)

---

# layers

## layer

The browser Router, with routes in the URL's path.

**Details**

There's one per document: building a second fails as a defect, and the
claim is released when the Layer's Scope closes.

**Signature**

```ts
declare const layer: (options: Options) => Layer.Layer<Router.Services>
```

[Source](https://effect.website/blob/main/src/BrowserRouter.ts#L112)

Since v4.1.3

## layerHash

The browser Router for static hosting, with routes in the URL's fragment,
as `/#/people/1`.

**Details**

Parsing and printing work as with `layer`, with the base `"#"`. As the
fragment holds the route, there are no in-page `#hash` links.

**Signature**

```ts
declare const layerHash: (options: Omit<Options, "base">) => Layer.Layer<Router.Services>
```

[Source](https://effect.website/blob/main/src/BrowserRouter.ts#L127)

Since v4.1.3

# models

## Options (interface)

The options of `layer`.

**Signature**

```ts
export interface Options {
  readonly routes: Route.AnyUnion
  /**
   * The base path the routes are relative to. A string is used as it is. A
   * function is given the first segment of the URL's path at startup and
   * says whether it's the base, as with an i18n prefix like `/en`.
   */
  readonly base?: string | ((segment: string) => boolean) | undefined
  /** Scroll to the top, a `#hash` or the saved position after a navigation. Defaults to `true`. */
  readonly scroll?: boolean | undefined
  /** Announce each navigation in a live region. Defaults to `true`. */
  readonly announce?: boolean | undefined
  /** Move focus after each navigation. Defaults to `true`. */
  readonly focus?: boolean | undefined
  /** The window to run in. Defaults to the global `window`. */
  readonly window?: Window | undefined
}
```

[Source](https://effect.website/blob/main/src/BrowserRouter.ts#L82)

Since v4.1.3
