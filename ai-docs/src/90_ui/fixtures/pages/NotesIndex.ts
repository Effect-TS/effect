import { Layer, Match, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Component, Head } from "effect/ui"
import { ListNotes } from "../notes/loaders/ListNotes.ts"
import { Notes } from "../notes/services/Notes.ts"
import { AppRoute } from "../routes.ts"

const noteUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Note", params: { id } }))

export const NotesIndexMessage = Schema.TaggedUnion({
  Pinned: { id: Schema.String },
  Dragging: { over: Schema.Boolean }
})

// A drag carries strings by type. An app's own type keeps other drags,
// such as text or files, from landing on its targets.
const NoteType = "application/x-note"

export const NotesIndexNoDeps = Component.make({
  name: "NotesIndex",
  // The Model holds only what the user did here. The notes live in the
  // `notes` loader's slot, which the runtime keeps beside the Model.
  model: Schema.Struct({ pinned: Schema.Array(Schema.String), over: Schema.Boolean }),
  message: NotesIndexMessage,
  // `ListNotes` takes no args, so this read is the same for every instance.
  loaders: { notes: { load: ListNotes, args: () => ({}) } },
  init: () => ({ pinned: [], over: false }),
  update: (model, message) =>
    Match.valueTags(message, {
      Pinned: ({ id }) => ({ ...model, pinned: model.pinned.includes(id) ? model.pinned : [...model.pinned, id] }),
      Dragging: ({ over }) => ({ ...model, over })
    }),
  // Every mounted instance contributes head entries. They merge in document
  // order, and the later entry wins.
  head: () => [Head.title("All notes"), Head.meta({ name: "description", content: "Every note you wrote" })],
  view: (model, h) =>
    AsyncResult.match(h.loaded.notes, {
      onInitial: () => h.p("Loading notes…"),
      onFailure: () => h.p("The notes couldn't be loaded."),
      // Links are plain anchors with a printed route. The browser Router
      // intercepts clicks on hrefs the routes parse. `.key` identifies a row.
      onSuccess: ({ value: notes }) =>
        h.div(
          h.ul(notes.map((note) =>
            h.li.key(note.id)
              // A drag source: the host puts this data on the drag.
              .draggable({ [NoteType]: note.id }, { effectAllowed: "link" }).children(
                h.a.attr("href", noteUrl(note.id)).children(note.title),
                // Drag and drop needs a pointer, so every drag has a button
                // that sends the same message, for the keyboard and touch.
                h.button.attr("aria-label", `Pin ${note.title}`)
                  .onClick(NotesIndexMessage.make({ _tag: "Pinned", id: note.id })).children("Pin")
              )
          )),
          // A drop target takes the drags whose types it accepts. Enter and
          // leave go to the target the drop would land on, once each, and
          // not to its children, so the highlight doesn't flicker.
          h.aside.attr("aria-label", "Pinned").class("pins", model.over && "drop-here")
            .onDrop(
              ({ data }) => NotesIndexMessage.make({ _tag: "Pinned", id: data[NoteType] ?? "" }),
              { accepts: [NoteType], dropEffect: "link" }
            )
            .onDragEnter(NotesIndexMessage.make({ _tag: "Dragging", over: true }))
            .onDragLeave(NotesIndexMessage.make({ _tag: "Dragging", over: false })).children(
              h.h2("Pinned"),
              h.ul(model.pinned.map((id) => h.li.key(id).children(notes.find((note) => note.id === id)?.title ?? id)))
            )
        )
    })
})

export const NotesIndex = NotesIndexNoDeps.pipe(
  Component.provide(ListNotes.layer.pipe(Layer.provide(Notes.layerHttp)))
)
