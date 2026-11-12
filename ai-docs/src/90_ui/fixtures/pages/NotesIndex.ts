import { Layer, Match, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Head } from "effect/ui"
import { ListNotes } from "../notes/loaders/ListNotes.ts"
import { Notes } from "../notes/services/Notes.ts"
import { AppRoute } from "../routes.ts"

const noteUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Note", params: { id } }))

const NotesSnapshot = Loader.Snapshot(ListNotes, "notes")
export const NotesIndexMessage = Schema.TaggedUnion({
  NotesChanged: { snapshot: NotesSnapshot },
  Pinned: { id: Schema.String },
  Dragging: { over: Schema.Boolean }
})

// A drag carries strings by type. An app's own type keeps other drags,
// such as text or files, from landing on its targets.
const NoteType = "application/x-note"

export const NotesIndexNoDeps = Component.make({
  name: "NotesIndex",
  model: Schema.Struct({ notes: NotesSnapshot, pinned: Schema.Array(Schema.String), over: Schema.Boolean }),
  message: NotesIndexMessage,
  loaders: { notes: () => ({}) },
  init: ($) => ({ ...$.empty, pinned: [], over: false }),
  update: (model, message) =>
    Match.valueTags(message, {
      NotesChanged: ({ snapshot }) => ({ ...model, notes: snapshot }),
      Pinned: ({ id }) => ({ ...model, pinned: model.pinned.includes(id) ? model.pinned : [...model.pinned, id] }),
      Dragging: ({ over }) => ({ ...model, over })
    }),
  subscriptions: (_model, _props, $) => [
    $.watch({ notes: (snapshot) => NotesIndexMessage.make({ _tag: "NotesChanged", snapshot }) })
  ],
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
            h.li(
              h.a(note.title).attr("href", noteUrl(note.id)),
              // Drag and drop needs a pointer, so every drag has a button
              // that sends the same message, for the keyboard and touch.
              h.button("Pin").attr("aria-label", `Pin ${note.title}`)
                .onClick(NotesIndexMessage.make({ _tag: "Pinned", id: note.id }))
            ).key(note.id)
              // A drag source: the host puts this data on the drag.
              .draggable({ [NoteType]: note.id }, { effectAllowed: "link" })
          )),
          // A drop target takes the drags whose types it accepts. Enter and
          // leave go to the target the drop would land on, once each, and
          // not to its children, so the highlight doesn't flicker.
          h.aside(
            h.h2("Pinned"),
            h.ul(model.pinned.map((id) => h.li(notes.find((note) => note.id === id)?.title ?? id).key(id)))
          ).attr("aria-label", "Pinned").class("pins", model.over && "drop-here")
            .onDrop(
              ({ data }) => NotesIndexMessage.make({ _tag: "Pinned", id: data[NoteType] ?? "" }),
              { accepts: [NoteType], dropEffect: "link" }
            )
            .onDragEnter(NotesIndexMessage.make({ _tag: "Dragging", over: true }))
            .onDragLeave(NotesIndexMessage.make({ _tag: "Dragging", over: false }))
        )
    })
})

export const NotesIndex = NotesIndexNoDeps.pipe(
  Component.provide(ListNotes.layer.pipe(Layer.provide(Notes.layerHttp)))
)
