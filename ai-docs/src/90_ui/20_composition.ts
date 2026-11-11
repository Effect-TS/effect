/**
 * @title Composing components, data and Layers
 *
 * Load a note with a `Loader` read and show it with child components. The
 * page handles a child's events, provides Layers with `Component.provide`,
 * and makes one child swappable with `Feature.Service`. This entry module
 * mounts the page, which is in `fixtures/pages/NotePage.ts`.
 */
import { Effect, Layer } from "effect"
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
import { Notes } from "./fixtures/notes/services/Notes.ts"
import { NotePageLive } from "./fixtures/pages/NotePage.ts"

// `NotePageLive` provides its own loader, command and feature Layers with
// `Component.provide`. Only `Notes` is left for the entry module, so the
// page's file doesn't decide where the notes come from.
const NotePageMount = BrowserHost.mount(NotePageLive, { id: "welcome" }, document.getElementById("app")!).pipe(
  Layer.provide(Notes.layerHttp)
)

Layer.launch(NotePageMount).pipe(Effect.runFork)
