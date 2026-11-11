/**
 * @title Building a component with effect/ui
 *
 * Define a component from Schemas and pure functions, run its side effects
 * through a `Command.Service`, autosave with a Subscription, and mount it in
 * the browser with `BrowserHost`.
 */
import { Effect, Layer, Schema, Stream } from "effect"
import { Command, Component, Subscription, View } from "effect/ui"
// Only the `effect/ui/html` paths need the DOM lib types. `effect/ui` and
// `effect/ui/testing` are host-neutral.
import { BrowserHost, Html } from "effect/ui/html"
import { Note, NotesTag } from "./fixtures/domain/Note.ts"
import { Notes } from "./fixtures/services/Notes.ts"

// Register the element vocabulary once for the app: the augmentation is the
// type half, `registerElements` the runtime half. Every `view` then has
// `h.form`, `h.button`, ... It must run before the first render, in tests
// too. A component that can't rely on it sets `elements: Html` instead.
declare module "effect/ui/View" {
  interface Register {
    readonly elements: Html.Elements
  }
}
View.registerElements(Html)

// Props, Model, messages and events are Schemas, so the runtime can log,
// serialise and hydrate them. Build a message with `Message.make({ _tag })`.
export const NoteEditorMessage = Schema.TaggedUnion({
  Edited: { body: Schema.String },
  Save: {},
  Saved: { note: Note },
  SaveFailed: { reason: Schema.String }
})

// What the editor reports to its parent.
export const NoteEditorEvents = Schema.TaggedUnion({ Saved: { note: Note } })

// A side effect is a Command, and I/O goes through a `Command.Service`. Its
// implementation runs once, when the Layer is built, and captures the
// services it uses: a component requires `SaveNote`, never `Notes`.
// `Command.make` is only for bodies that need no service. Calling `fetch`
// in one compiles, but a test can't fake it.
export class SaveNote extends Command.Service<SaveNote>()(
  "notes/SaveNote",
  {
    args: { note: Note },
    // Saves from one editor run one at a time, in order.
    mode: "queue",
    // Required: the loader reads a run makes stale. `() => []` for none.
    invalidates: () => [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return ({ note }) => notes.save(note)
  })
) {}

export const NoteEditor = Component.make({
  name: "NoteEditor",
  props: Schema.Struct({ note: Note }),
  model: Schema.Struct({
    draft: Schema.String,
    saved: Schema.String,
    edits: Schema.Number,
    error: Schema.NullOr(Schema.String)
  }),
  message: NoteEditorMessage,
  events: NoteEditorEvents,
  // `init`, `update` and `view` are pure. Props are `$.props` and `h.props`.
  // A props change re-renders, but never reaches `update`.
  init: ($) => ({ draft: $.props.note.body, saved: $.props.note.body, edits: 0, error: null }),
  update: (model, message, $) =>
    NoteEditorMessage.match(message, {
      // With nothing to run or emit, return the next Model.
      Edited: ({ body }) => ({ ...model, draft: body, edits: model.edits + 1 }),
      Save: () =>
        model.draft === model.saved
          ? model
          // `$.set` replaces the Model and doesn't merge. `$.run` only takes
          // Commands whose result is one of this component's messages:
          // `SaveNote` can fail, so `Command.match` maps both channels. A
          // Command that can't fail takes `Command.map`.
          : $.set({ ...model, error: null }).run(
            SaveNote.make({ note: { ...$.props.note, body: model.draft } }).pipe(Command.match({
              onSuccess: (note) => NoteEditorMessage.make({ _tag: "Saved", note }),
              onFailure: (error) => NoteEditorMessage.make({ _tag: "SaveFailed", reason: error.reason })
            }))
          ),
      // `$.emit` reports to the parent.
      Saved: ({ note }) => $.set({ ...model, saved: note.body }).emit(NoteEditorEvents.make({ _tag: "Saved", note })),
      SaveFailed: ({ reason }) => ({ ...model, error: reason })
    }),
  // A Subscription is a keyed Stream that runs while it is listed. Use one
  // when you can say "while ...", and a Command for a single event. This one
  // autosaves while there are unsaved edits. `edits` is part of its key, so
  // each keystroke restarts the timer: a debounce. Save continuously like
  // this, not in a finalizer when the editor leaves. The source is the clock
  // or a service, never a global, so tests drive it.
  subscriptions: (model) => [
    model.draft !== model.saved &&
    Subscription.make(
      "autosave",
      model.edits,
      () => Stream.fromEffect(Effect.as(Effect.sleep("2 seconds"), NoteEditorMessage.make({ _tag: "Save" })))
    )
  ],
  // Children are rest arguments, and `false`, `null` and `undefined` render
  // nothing. A handler is a message, or a function of a plain payload
  // (`{ value }` for `input`), never of a DOM event. `value` is controlled:
  // the field always shows the Model's draft.
  view: (model, h) =>
    h.form(
      h.h2(h.props.note.title),
      h.textarea().attr("aria-label", "Body").value(model.draft)
        .onInput(({ value }) => NoteEditorMessage.make({ _tag: "Edited", body: value })),
      // `h.running` is true while this instance has a save queued or running.
      h.button(h.running(SaveNote) ? "Saving…" : "Save").attr("type", "submit")
        .disabled(model.draft === model.saved),
      model.error !== null && h.p(model.error).attr("role", "alert")
    ).onSubmit(NoteEditorMessage.make({ _tag: "Save" }))
})

const scratchpad: Note = { id: "scratchpad", title: "Scratchpad", body: "" }

// `mount` is a Layer: the tree is mounted for as long as the Layer is built.
// The component's requirements are the Layer's, so this doesn't compile until
// `SaveNote` is provided. `Layer.suspend` delays the `document` lookup until
// the app runs, because other modules import this one.
export const NoteEditorLive = Layer.suspend(() =>
  BrowserHost.mount(NoteEditor, { note: scratchpad }, document.getElementById("app")!)
).pipe(Layer.provide(SaveNote.layer.pipe(Layer.provide(Notes.layerHttp))))

// Run it from the browser entry module with `Effect.runFork(main)`.
export const main = Layer.launch(NoteEditorLive)
