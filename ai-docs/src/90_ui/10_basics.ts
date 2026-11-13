/**
 * @title Building a component with effect/ui
 *
 * Build a note editor from Schemas and pure functions, with its update split
 * into slices on a `Component.define` definition. It saves through a
 * `Command.Service` and autosaves with a Subscription. This is the browser
 * entry module, which mounts it with `BrowserHost`. The editor is in
 * `fixtures/notes/components/NoteEditor.ts`.
 */
import { Effect, Layer } from "effect"
// Only the `effect/ui/html` paths need the DOM lib types. `effect/ui` and
// `effect/ui/testing` are host-neutral.
import { FetchHttpClient } from "effect/http"
import { BrowserHost } from "effect/ui/html"
// Registers the HTML elements once for the app, so every `view` has
// `h.form`, `h.button` and so on. Importing `effect/ui/html` alone doesn't
// do it. The import has to run before the first render, so each entry module
// has it: this one, the server's and the tests'. A component that can't rely
// on it sets `elements: Html` instead.
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
// An entry module defines no components. The editor and its `SaveNote`
// command are in the notes feature, next to the domain and the service they
// use. Read them in this order:
//
// - `fixtures/notes/domain/Note.ts`: the Schema, the errors and `NotesTag`
// - `fixtures/notes/services/Notes.ts`: the service all the I/O goes through
// - `fixtures/notes/components/NoteEditor.ts`: the component, its command
//   and the Layers it provides for itself
import { NoteEditor } from "./fixtures/notes/components/NoteEditor.ts"
import type { Note } from "./fixtures/notes/domain/Note.ts"

const scratchpad: Note = { id: "scratchpad", title: "Scratchpad", body: "" }

// `mount` returns a Layer, and the tree stays mounted for as long as that
// Layer is built. The component's requirements become the Layer's, so this
// doesn't compile until they are all provided.
//
// `NoteEditor` provides its own domain Layers, `SaveNote` and `Notes`. An
// entry module provides only platform Layers: the HTTP client here, and the
// Router or a logger in a larger app. Domain Layers don't belong here.
//
// A module that others import wraps the mount in `Layer.suspend`, so that
// `document` is read when the Layer is built and not on import.
const Main = BrowserHost.mount(NoteEditor, { note: scratchpad }, document.getElementById("app")!).pipe(
  Layer.provide(FetchHttpClient.layer)
)

// Launching the Layer mounts the editor and keeps it mounted.
Layer.launch(Main).pipe(Effect.runFork)
