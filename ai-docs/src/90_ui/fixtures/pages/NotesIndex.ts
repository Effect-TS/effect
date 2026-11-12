import { Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Head } from "effect/ui"
import { ListNotes } from "../notes/loaders/ListNotes.ts"
import { Notes } from "../notes/services/Notes.ts"
import { AppRoute } from "../routes.ts"

const noteUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Note", params: { id } }))

const NotesSnapshot = Loader.Snapshot(ListNotes, "notes")
const NotesIndexMessage = Schema.TaggedUnion({ NotesChanged: { snapshot: NotesSnapshot } })

export const NotesIndexNoDeps = Component.make({
  name: "NotesIndex",
  model: Schema.Struct({ notes: NotesSnapshot }),
  message: NotesIndexMessage,
  loaders: { notes: () => ({}) },
  init: ($) => $.empty,
  update: (_model, message) => ({ notes: message.snapshot }),
  subscriptions: (_model, _props, $) => [
    $.watch({ notes: (snapshot) => NotesIndexMessage.make({ _tag: "NotesChanged", snapshot }) })
  ],
  // Every mounted instance contributes head entries. They merge in document
  // order, and the later entry wins.
  head: () => [Head.title("All notes"), Head.meta({ name: "description", content: "Every note you wrote" })],
  view: (_model, h) =>
    AsyncResult.match(h.loaded.notes, {
      onInitial: () => h.p("Loading notes…"),
      onFailure: () => h.p("The notes couldn't be loaded."),
      // Links are plain anchors with a printed route. The browser Router
      // intercepts clicks on hrefs the routes parse. `.key` identifies a row.
      onSuccess: ({ value: notes }) =>
        h.ul(notes.map((note) => h.li(h.a(note.title).attr("href", noteUrl(note.id))).key(note.id)))
    })
})

export const NotesIndex = NotesIndexNoDeps.pipe(
  Component.provide(ListNotes.layer.pipe(Layer.provide(Notes.layerHttp)))
)
