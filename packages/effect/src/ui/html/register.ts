/**
 * Registers `Html` as the app's element vocabulary through a side-effect
 * import. Every `view` then has the HTML elements on `h`, and no component
 * needs `elements: Html`.
 *
 * Import it once, before the first render, in tests too. The import declares
 * `Html.Elements` as `View.Register` and calls `View.registerElements(Html)`.
 * It reads no DOM global, so it is safe to import on a server.
 *
 * **Example** (Registering the HTML vocabulary)
 *
 * ```ts
 * import "effect/ui/html/register"
 * import { Schema } from "effect"
 * import { Component } from "effect/ui"
 *
 * const Greeting = Component.define({
 *   name: "Greeting",
 *   model: Schema.Struct({}),
 *   message: Schema.Never
 * }).make({
 *   init: () => ({}),
 *   update: (model) => model,
 *   view: (_, h) => h.p("Hello")
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import { registerElements } from "../View.ts"
import * as Html from "./Html.ts"

declare module "../View.ts" {
  interface Register {
    readonly elements: Html.Elements
  }
}

registerElements(Html)
