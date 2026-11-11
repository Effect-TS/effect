import { Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Head } from "effect/ui"
import { ActivityLog } from "../notes/components/ActivityLog.ts"
import { NoteActivity } from "../notes/components/NoteActivity.ts"
import { NoteEditor, SaveNote } from "../notes/components/NoteEditor.ts"
import { GetNote } from "../notes/loaders/GetNote.ts"

// The Model stores what a read returned as a snapshot, under the field's name.
const NoteSnapshot = Loader.Snapshot(GetNote, "note")

export const NotePageMessage = Schema.TaggedUnion({
  NoteChanged: { snapshot: NoteSnapshot, title: Schema.String },
  Saved: {},
  EditorFailed: {}
})

export const NotePage = Component.make({
  name: "NotePage",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ note: NoteSnapshot, title: Schema.String, notice: Schema.String }),
  message: NotePageMessage,
  // Returns the arguments of each loader field's read, or `undefined` to
  // disable it.
  loaders: { note: (_model, props) => ({ id: props.id }) },
  // `$.empty` holds an empty snapshot for every loader field.
  init: ($) => ({ ...$.empty, title: "Loading note", notice: "" }),
  update: (model, message) =>
    NotePageMessage.match(message, {
      NoteChanged: ({ snapshot, title }) => ({ ...model, note: snapshot, title }),
      Saved: () => ({ ...model, notice: "Saved" }),
      EditorFailed: () => ({ ...model, notice: "The editor crashed" })
    }),
  // With loader fields, `subscriptions` must start with `$.watch`. It takes
  // one handler per field, and each handler turns a change into the message
  // that stores the snapshot.
  subscriptions: (_model, _props, $) => [
    $.watch({
      note: (snapshot, result) =>
        NotePageMessage.make({
          _tag: "NoteChanged",
          snapshot,
          title: AsyncResult.isSuccess(result) ? result.value.title : "Note"
        })
    })
  ],
  // `head` only sees the Model, so `update` copies the title into it.
  head: (model) => [Head.title(model.title)],
  view: (model, h) =>
    // `h.loaded.note` is the field as an `AsyncResult`.
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
          model.notice !== "" && h.p(model.notice).attr("role", "status")
        )
    })
})

// `Component.provide` is `Effect.provide` for a component and everything
// below it. `NotePage` requires `GetNote | SaveNote | NoteActivity`. This
// one requires only `Notes`, which the app provides at the root.
//
// - Provide Layers where their context lives: the page, the feature or the app.
// - A Layer value is built once and shared by the instances using it. Pass
//   `{ local: true }` or a function of props for state each instance owns.
// - Nothing is rebuilt when props change. Re-key the component instead.
// - A Layer that can fail needs `{ onFailure: (failure) => message }`.
export const NotePageLive = NotePage.pipe(
  Component.provide([GetNote.layer, SaveNote.layer, NoteActivity.layer(ActivityLog)])
)
