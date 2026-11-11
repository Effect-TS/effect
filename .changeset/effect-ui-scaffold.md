---
"effect": patch
---

Add `effect/ui`, a Layer-composed frontend framework for Effect, and `effect/ui/html`, which runs it in the DOM and on the server.

The host-agnostic core holds `Component`, `Command`, `Subscription`, `Feature` and `View`, plus `Renderer` to mount a component tree on any host and `MessageLog` to record what it does. `effect/ui/testing` adds `Story` for one-instance tests, `TestHost` and `Query` for runtime tests, and `Story.fromLog` to replay a logged session. `Route` defines a typed route table that parses and prints URLs, `Router.current(AppRoute)` reads the initial route for a root's props, `Router` holds the current route with navigation Commands and a `Router.blocked` Subscription (`Router.push(AppRoute, route)` takes only routes of the table, `Router.memory` is for tests and `Router.static` for the server), and restores a page's Model on back and forward, skipping the `Command.Service`s declared `server: true`, and a component's `head` option sets the document title, meta, links, JSON-LD and `<html>` / `<body>` attributes. Commands take an `args` Schema, and a `Command.Service` declares what its runs invalidate, patch and write in the `effect/reactivity/Loader` cache that each mount owns; its runs outside `switch` finish after the issuing component unmounts, for as long as the Layer that provides them and the mount live. The modules are experimental.

`effect/ui/html` runs the same components in a real DOM. It is the only part of `effect/ui` whose types need the `DOM` lib, and nothing else in `effect` re-exports it. `Html` is the element vocabulary (typed events with plain payloads, controlled `value` / `checked` / `selected` / `open`, refs typed by tag, and the `focus`, `blur`, `scrollIntoView` and `measure` ref Commands), `BrowserHost.mount` mounts an HTML root into an element with delegated events and keeps the document head in sync, `BrowserRouter` routes through `window.history` with link interception, scroll restoration and route-change announcements, `HtmlQuery` in `effect/ui/html/testing` finds elements by ARIA role and accessible name.

Server rendering: `HtmlServer.renderToHtml` renders a tree to HTML within a `budget`, fetching the loaders it watches once per request and running no Command, and returns the markup, the state the client adopts (the settled loader entries included), the root's Model and the head as escaped strings. `BrowserHost.mount(App, props, container, { state })` hydrates it, adopting the server's nodes and Models, and `root.adopted` completes when no slot is still waiting for its Layer. `Component.provide(..., { server: false })` keeps a Layer off the server, and `ssr` in `effect/ui/html/testing` renders, hydrates and checks the two agree.

```ts
import { Schema } from "effect"
import { Component } from "effect/ui"
import { Story } from "effect/ui/testing"

const Message = Schema.TaggedUnion({ Increment: {}, Decrement: {} })

const Counter = Component.make({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: Message,
  init: () => ({ count: 0 }),
  update: (model, message) =>
    Message.match(message, {
      Increment: () => ({ count: model.count + 1 }),
      Decrement: () => ({ count: model.count - 1 })
    }),
  view: (model, h) =>
    h.el("div", h.el("button", "+").on("click", Message.make({ _tag: "Increment" })), String(model.count))
})

Story.make(Counter, {}, (s) =>
  s.click("+").model((model) => {
    if (model.count !== 1) throw new Error("expected 1")
  }))
```
