import { HtmlServer } from "@effect/ui-html"
import { Effect, Schema } from "effect"
import { Component, Head } from "effect/ui"

const App = Component.make({
  name: "App",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Home"), Head.lang("en")],
  view: (_, h) => h.el("h1", "Home")
})

const page = Effect.gen(function*() {
  const { bodyAttributes, head, html, htmlAttributes, state } = yield* HtmlServer.renderToHtml(App, {})
  return `<!doctype html>
<html ${htmlAttributes}>
  <head><meta charset="utf-8">${head}</head>
  <body ${bodyAttributes}>
    <div id="app">${html}</div>
    <script type="application/json" id="state">${HtmlServer.serializeState(state)}</script>
  </body>
</html>`
})