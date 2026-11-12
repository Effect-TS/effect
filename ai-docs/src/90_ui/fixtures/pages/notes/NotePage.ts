import { Layer, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Component, Head } from "effect/ui"
import { ActivityLog } from "../../notes/components/ActivityLog.ts"
import { NoteActivity } from "../../notes/components/NoteActivity.ts"
import { NoteEditor } from "../../notes/components/NoteEditor.ts"
import { GetNote } from "../../notes/loaders/GetNote.ts"
import { Notes } from "../../notes/services/Notes.ts"

export const NotePageMessage = Schema.TaggedUnion({
  Saved: {},
  EditorFailed: {}
})

export const NotePageNoDeps = Component.make({
  name: "NotePage",
  props: Schema.Struct({ id: Schema.String }),
  // The Model holds no copy of the note. The runtime keeps each loader's
  // last result in a slot beside the Model, and the Model plus the slots is
  // the instance's state.
  model: Schema.Struct({ notice: Schema.String }),
  message: NotePageMessage,
  // Each loader names its read and returns the read's args, or `undefined`
  // to disable it. The runtime watches the read at those args and writes
  // every change to the slot, which re-renders the page. No message or
  // `update` case is involved.
  loaders: { note: { load: GetNote, args: (_model, props) => ({ id: props.id }) } },
  init: () => ({ notice: "" }),
  // `update` can read the slots too, as `$.loaded`.
  update: (model, message) =>
    NotePageMessage.match(message, {
      Saved: () => ({ ...model, notice: "Saved" }),
      EditorFailed: () => ({ ...model, notice: "The editor crashed" })
    }),
  // `head` gets the Model and the loaders' results, so the title comes
  // straight from the loaded note.
  head: (_model, loaded) => [Head.title(AsyncResult.isSuccess(loaded.note) ? loaded.note.value.title : "Note")],
  view: (model, h) =>
    // `h.loaded.note` is the loader's slot as an `AsyncResult`.
    AsyncResult.match(h.loaded.note, {
      onInitial: () => h.p("Loading note…"),
      onFailure: () => h.p("This note doesn't exist."),
      onSuccess: ({ value: note }) =>
        h.article(
          // A child by value. Its key is its identity, so a new key mounts
          // a fresh instance. Props never reach the child's `update`, so
          // re-key to reset a child.
          h.child(NoteEditor, {
            key: note.id,
            props: { note },
            // Maps the child's events to this component's messages.
            onEmit: () => NotePageMessage.make({ _tag: "Saved" }),
            // Every slot is a failure boundary. A failed child shows
            // `fallback` and stays down until its key changes.
            onFailure: () => NotePageMessage.make({ _tag: "EditorFailed" }),
            fallback: () => h.p("The editor is unavailable.")
          }),
          // A child by service. `fallback` is required here, and it shows
          // while the feature's Layer builds (`Initial`) and after a failure.
          h.child(NoteActivity, {
            key: "activity",
            props: { noteId: note.id },
            fallback: (result) => h.p(AsyncResult.isInitial(result) ? "Loading activity…" : "No activity.")
          }),
          model.notice !== "" && h.p.attr("role", "status").children(model.notice)
        )
    })
})

// `NotePageNoDeps` requires `GetNote | NoteActivity`. `NoteEditor` already
// provides its own `SaveNote`, so that one doesn't surface here. The plain
// name is the page with its Layers provided, which is what `App` uses.
//
// - Provide domain Layers in the component that needs them, not at the root.
//   The root keeps platform Layers: the Router, the HTTP client, logging.
// - A Layer value is built once and shared by the instances using it. Pass
//   `{ local: true }` or a function of props for state each instance owns.
// - Nothing is rebuilt when props change. Re-key the component instead.
// - A Layer that can fail needs `{ onFailure: (failure) => message }`.
export const NotePage = NotePageNoDeps.pipe(
  Component.provide([
    GetNote.layer.pipe(Layer.provide(Notes.layerHttp)),
    NoteActivity.toLayer(ActivityLog)
  ])
)
