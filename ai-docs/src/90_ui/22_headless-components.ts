/**
 * @title Headless components
 *
 * Build a filterable listbox that owns its state, keyboard handling and ARIA
 * but no markup, and draw it from a consumer with `h.child` and a `view`
 * closure. This browser entry module mounts the consumer, which is in
 * `fixtures/notes/components/NoteLinkPicker.ts`.
 */
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { BrowserHost } from "effect/ui/html"
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
// Read them in this order:
//
// - `fixtures/kit/Listbox.ts`: the headless component. `Component.define`
//   finished with `parts` instead of `view` makes a `Component.Headless`.
//   It has its own Model, `update` and Commands, and `parts` returns plain
//   values and parts for whoever draws it.
// - `fixtures/notes/components/NoteLinkPicker.ts`: a consumer, which draws
//   the Listbox in its own markup and handles what it emits.
//
// A headless component can't be mounted, routed to or provided as a
// feature. It is always placed by a consumer, so this module mounts the
// picker.
import { NoteLinkPicker } from "./fixtures/notes/components/NoteLinkPicker.ts"

const Main = BrowserHost.mount(NoteLinkPicker, { noteId: "welcome" }, document.getElementById("app")!).pipe(
  Layer.provide(FetchHttpClient.layer)
)

Layer.launch(Main).pipe(Effect.runFork)
