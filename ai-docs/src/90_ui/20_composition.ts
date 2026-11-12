/**
 * @title Composing components, data and Layers
 *
 * Load a note with a `Loader` read and show it with child components. The
 * page handles a child's events, provides Layers with `Component.provide`,
 * and makes one child swappable with `Feature.Service`. This entry module
 * mounts the page, which is in `fixtures/pages/NotePage.ts`.
 */
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { BrowserHost } from "effect/ui/html"
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
// A page is one file in `pages/`, and it imports what it is composed from
// out of the features:
//
// - `fixtures/pages/NotePage.ts`: the page, its loader field and its Layers
// - `fixtures/notes/loaders/GetNote.ts`: the read behind the loader field
// - `fixtures/notes/components/NoteEditor.ts`: a child by value
// - `fixtures/notes/components/NoteActivity.ts`: a child by service
// - `fixtures/notes/components/ActivityLog.ts`: that service's implementation
import { NotePage } from "./fixtures/pages/NotePage.ts"

// `NotePage` provides its loader and feature Layers with
// `Component.provide`, and the editor inside it provides its own command.
// The plain name is always the component with its Layers provided, and
// `NotePageNoDeps` is the one without. Only the HTTP client is left for the
// entry module.
const Main = BrowserHost.mount(NotePage, { id: "welcome" }, document.getElementById("app")!).pipe(
  Layer.provide(FetchHttpClient.layer)
)

Layer.launch(Main).pipe(Effect.runFork)
