import { Effect, Layer, Schema, Stream } from "effect"
import { Command, Component, Subscription } from "effect/ui"
import { Note, NotesTag } from "../domain/Note.ts"
import { Notes } from "../services/Notes.ts"

// Props, Model, messages and events are Schemas, so the runtime can log,
// serialise and hydrate them. Build a message with `Message.make({ _tag })`.
export const NoteEditorMessage = Schema.TaggedUnion({
  Edited: { body: Schema.String },
  Save: {},
  Saved: { note: Note },
  SaveFailed: { reason: Schema.String },
  AskDiscard: {},
  ActionsToggled: { open: Schema.Boolean },
  Answered: { choice: Schema.String },
  KeepEditing: {}
})

// What the editor reports to its parent.
export const NoteEditorEvents = Schema.TaggedUnion({ Saved: { note: Note } })

// A side effect is a Command, and I/O goes through a `Command.Service`. Its
// implementation runs once, when the Layer is built, and captures the
// services it uses. That is why a component requires `SaveNote` and never
// `Notes`. `Command.make` is only for bodies that need no service. Calling
// `fetch` in one compiles, but a test can't fake it.
//
// The command lives in the file of the component that runs it. A second
// component that needs the same write shares `Notes.save` and keeps its own
// command.
export class SaveNote extends Command.Service<SaveNote>()(
  "notes/SaveNote",
  {
    args: { note: Note },
    // Saves from one editor run one at a time, in order.
    mode: "queue",
    // Required. Returns the tags of the reads a run makes stale, or `[]`.
    invalidates: () => [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return ({ note }) => notes.save(note)
  })
) {}

// The component as defined, which requires `SaveNote`. It is exported so a
// test can provide its own Layers.
export const NoteEditorNoDeps = Component.make({
  name: "NoteEditor",
  props: Schema.Struct({ note: Note }),
  model: Schema.Struct({
    draft: Schema.String,
    saved: Schema.String,
    edits: Schema.Number,
    error: Schema.NullOr(Schema.String),
    confirming: Schema.Boolean,
    actionsOpen: Schema.Boolean
  }),
  message: NoteEditorMessage,
  events: NoteEditorEvents,
  // `init`, `update` and `view` are pure. They read props from `$.props` and
  // `h.props`. A props change re-renders, but never reaches `update`.
  init: ($) => ({
    draft: $.props.note.body,
    saved: $.props.note.body,
    edits: 0,
    error: null,
    confirming: false,
    actionsOpen: false
  }),
  update: (model, message, $) =>
    NoteEditorMessage.match(message, {
      // With nothing to run or emit, return the next Model.
      Edited: ({ body }) => ({ ...model, draft: body, edits: model.edits + 1 }),
      Save: () =>
        model.draft === model.saved
          ? model
          // `$.set` replaces the Model and doesn't merge. `$.run` only takes
          // Commands whose result is one of this component's messages.
          // `SaveNote` can fail, so `Command.match` maps its success and
          // its failure. A Command that can't fail takes `Command.map`.
          : $.set({ ...model, error: null }).run(
            SaveNote.make({ note: { ...$.props.note, body: model.draft } }).pipe(Command.match({
              onSuccess: (note) => NoteEditorMessage.make({ _tag: "Saved", note }),
              onFailure: (error) => NoteEditorMessage.make({ _tag: "SaveFailed", reason: error.reason })
            }))
          ),
      // `$.emit` reports to the parent.
      Saved: ({ note }) => $.set({ ...model, saved: note.body }).emit(NoteEditorEvents.make({ _tag: "Saved", note })),
      SaveFailed: ({ reason }) => ({ ...model, error: reason }),
      // The confirm dialog's state is in the Model, like any other.
      // Choosing a menu item closes the menu; the Model says so.
      AskDiscard: () => ({ ...model, confirming: true, actionsOpen: false }),
      // An auto popover is followed: the browser opens it from its button and
      // closes it on Escape or a click outside, and the Model keeps up.
      ActionsToggled: ({ open }) => ({ ...model, actionsOpen: open }),
      Answered: ({ choice }) =>
        choice === "discard"
          ? { ...model, draft: model.saved, confirming: false }
          : { ...model, confirming: false },
      KeepEditing: () => ({ ...model, confirming: false })
    }),
  // A Subscription is a keyed Stream that runs while it is listed. Use one
  // when you can say "while ...", and a Command for a single event. This one
  // autosaves while there are unsaved edits. `edits` is part of its key, so
  // each keystroke restarts the timer, which makes it a debounce. Save
  // continuously like this instead of in a finalizer when the editor leaves.
  // Its source has to be the clock or a service so that tests can drive it.
  subscriptions: (model) => [
    model.draft !== model.saved &&
    Subscription.make(
      "autosave",
      model.edits,
      () => Stream.fromEffect(Effect.as(Effect.sleep("2 seconds"), NoteEditorMessage.make({ _tag: "Save" })))
    )
  ],
  // `h.form`, `h.button` and the other HTML elements are on `h` because the
  // entry module imports `effect/ui/html/register`. Children are rest arguments, and `false`, `null` and `undefined` render
  // nothing. A handler is a message, or a function from a plain payload such
  // as `{ value }` for `input`. It never sees the DOM event. `value` is
  // controlled, so the field always shows the Model's draft. `class` takes
  // several tokens and skips `false`, `null` and `undefined` the same way,
  // so a conditional class is `cond && "name"`. `Html.classNames` builds
  // the same string anywhere else.
  view: (model, h) =>
    h.div(
      h.form(
        h.h2(h.props.note.title),
        h.textarea().attr("aria-label", "Body").value(model.draft)
          .class("note-body", model.draft !== model.saved && "unsaved")
          .onInput(({ value }) => NoteEditorMessage.make({ _tag: "Edited", body: value }))
          // Ctrl+S or Cmd+S saves instead of opening the browser's save
          // dialog. With `preventDefault`, the browser's default is cancelled
          // only when the handler returns a message, so every other key types
          // as usual. Nothing stops the event's propagation, and a form's
          // `submit` is always cancelled, so `onSubmit` takes no options.
          .onKeyDown(
            ({ ctrl, key, meta }) =>
              (ctrl || meta) && key === "s" ? NoteEditorMessage.make({ _tag: "Save" }) : undefined,
            { preventDefault: true }
          ),
        // `h.isRunning` is true while this instance has a save queued or running.
        h.button(h.isRunning(SaveNote) ? "Saving…" : "Save").attr("type", "submit")
          .disabled(model.draft === model.saved),
        // A menu is an auto popover in the top layer, so no ancestor's
        // `overflow` clips it. Its button is a `popovertarget` invoker: the
        // browser opens and closes it with no handler, and `onToggle` keeps
        // the Model in step with that and with Escape or a click outside.
        // CSS anchor positioning puts the menu under its button; a browser
        // without it shows the menu centred.
        h.button("More actions").attr("type", "button").attr("popovertarget", `actions-${h.props.note.id}`)
          .attr("style", `anchor-name: --actions-${h.props.note.id}`),
        h.div(
          h.button("Discard changes").attr("type", "button").disabled(model.draft === model.saved)
            .onClick(NoteEditorMessage.make({ _tag: "AskDiscard" }))
        ).attr("id", `actions-${h.props.note.id}`).attr("role", "menu").attr("aria-label", "Note actions")
          .attr("style", `position-anchor: --actions-${h.props.note.id}; position-area: bottom span-left; margin: 0`)
          .popover("auto", model.actionsOpen)
          .onToggle(({ open }) => NoteEditorMessage.make({ _tag: "ActionsToggled", open })),
        model.error !== null && h.p(model.error).attr("role", "alert")
      ).attr("aria-label", "Edit note").onSubmit(NoteEditorMessage.make({ _tag: "Save" })),
      // A modal dialog is open while the Model says so. The browser host shows
      // it in the top layer, keeps focus inside and gives focus back when it
      // closes. Escape is a close request: it comes to `onCancel`, and the
      // dialog closes only when `update` says so. A form in the dialog is the
      // app's like any other, so the choice is read from the submission's
      // `entries`, not from `returnValue`, and `method="dialog"` isn't needed.
      h.dialog(
        h.h2("Discard your changes?"),
        h.form(
          h.button("Keep editing").attr("name", "choice").attr("value", "keep"),
          h.button("Discard").attr("name", "choice").attr("value", "discard")
        ).onSubmit(({ entries }) =>
          NoteEditorMessage.make({ _tag: "Answered", choice: entries.find(([name]) => name === "choice")?.[1] ?? "" })
        )
      ).attr("aria-label", "Discard your changes?")
        .modal(model.confirming)
        .onCancel(NoteEditorMessage.make({ _tag: "KeepEditing" }))
    )
})

// The component the app uses, under the plain name. `Component.provide` is
// `Effect.provide` for a component and everything below it. A component
// provides the domain Layers it needs itself, so a parent or an entry module
// can use it without knowing what it runs. Only `HttpClient` is left, for
// the entry module.
export const NoteEditor = NoteEditorNoDeps.pipe(
  Component.provide(SaveNote.layer.pipe(Layer.provide(Notes.layerHttp)))
)
