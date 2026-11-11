/**
 * @title Composing components, data and Layers
 *
 * Load a note with a `Loader` read and show it with child components. The
 * example handles a child's events, provides Layers with
 * `Component.provide`, and makes one child swappable with `Feature.Service`.
 */
import { Effect, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Feature, Head } from "effect/ui"
import { NoteEditor, SaveNote } from "./10_basics.ts"
import { Note, NoteNotFound, NotesTag } from "./fixtures/domain/Note.ts"
import { Notes } from "./fixtures/services/Notes.ts"

// A read is data loaded by its arguments and cached, so components watching
// the same note share one entry and one fetch. Like a `Command.Service`, it
// captures `Notes` when its Layer is built. `SaveNote` invalidates
// `NotesTag`, so a save refetches it.
export class GetNote extends Loader.Service<GetNote>()(
  "notes/GetNote",
  {
    args: { id: Schema.String },
    success: Note,
    error: NoteNotFound,
    staleTime: "30 seconds",
    tags: [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return ({ id }) => notes.get(id)
  })
) {}

// A feature is a component referred to by service. The service holds the
// contract (props and events Schemas) and a Layer picks the implementation,
// so a test can fake it and the app can load it lazily.
export class NoteActivity extends Feature.Service<NoteActivity>()("NoteActivity", {
  props: Schema.Struct({ noteId: Schema.String })
}) {}

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

// One implementation of the feature. Its props must fit the contract.
const ActivityLog = Component.make({
  name: "ActivityLog",
  props: NoteActivity.props,
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.aside(`No activity yet on note ${h.props.noteId}.`)
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
