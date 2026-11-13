import { Layer, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Component } from "effect/ui"
import { Listbox } from "../../kit/Listbox.ts"
import { ListNotes } from "../loaders/ListNotes.ts"
import { Notes } from "../services/Notes.ts"

export const NoteLinkPickerMessage = Schema.TaggedUnion({ Picked: { id: Schema.String } })

// What the picker reports to its parent, such as an editor inserting a link.
export const NoteLinkPickerEvents = Schema.TaggedUnion({ Linked: { id: Schema.String } })

const excerpt = (body: string) => (body.length > 60 ? body.slice(0, 60) + "…" : body)

// A small normal component around the headless `Listbox`, and the one the
// editor would place. A headless child renders again whenever its consumer
// renders, because the closure is part of the consumer's view. Placed in the
// editor, which renders on every keystroke, the closure and every row in it
// would run on every keystroke. A normal child renders only when its props,
// Model or loaded data change, and `{ noteId }` doesn't change while typing.
export const NoteLinkPickerNoDeps = Component.define({
  name: "NoteLinkPicker",
  // The note being edited, which can't link to itself.
  props: Schema.Struct({ noteId: Schema.String }),
  // The value is the consumer's. The Listbox only reads it, as `selected`.
  model: Schema.Struct({ linked: Schema.NullOr(Schema.String) }),
  message: NoteLinkPickerMessage,
  events: NoteLinkPickerEvents,
  loaders: { notes: { load: ListNotes, args: () => ({}) } }
}).make({
  init: () => ({ linked: null }),
  update: (_model, { id }, $) => $.set({ linked: id }).emit(NoteLinkPickerEvents.make({ _tag: "Linked", id })),
  view: (model, h) =>
    AsyncResult.match(h.loaded.notes, {
      onInitial: () => h.p("Loading notes…"),
      onFailure: () => h.p("The notes couldn't be loaded."),
      onSuccess: ({ value }) => {
        const notes = new Map(value.filter((note) => note.id !== h.props.noteId).map((note) => [note.id, note]))
        // A headless child is placed with `h.child`, like any other, and
        // takes a `key` or a `ref`. Its state lives in its own instance, and
        // `onEmit` maps its events to this component's messages.
        return h.child(Listbox, {
          key: "link",
          // Only what the Listbox filters and announces goes in its props.
          props: {
            options: Array.from(notes.values(), (note) => ({ id: note.id, label: note.title })),
            selected: model.linked
          },
          onEmit: ({ id }) => NoteLinkPickerMessage.make({ _tag: "Picked", id }),
          // The closure is this component's code, run with the Listbox's
          // parts. It draws the markup and applies each part to a builder of
          // the part's tag. A child placed in here, and its `onEmit`, report
          // to this component, not to the Listbox. When a part and this code
          // both handle one event on an element, the Listbox's handler runs
          // first and this component's last.
          //
          // `Router.prefetch` doesn't walk into closures, so it never
          // prefetches the reads of a child placed in one.
          view: (m) =>
            h.div.class("link-picker").children(
              m.trigger(h.button).children(
                model.linked === null
                  ? "Link to a note…"
                  : `Linked: ${notes.get(model.linked)?.title ?? "a removed note"}`
              ),
              m.popup(h.div.attr("aria-label", "Link to a note")).children(
                m.input(h.input.attr("aria-label", "Filter notes").attr("placeholder", "Filter notes")),
                m.list(h.ul.attr("aria-label", "Notes")).children(
                  // Each row is drawn here, with the excerpt the Listbox never
                  // sees, looked up by the row's id.
                  m.shown.map((option) =>
                    m.option(h.li.key(option.id).class(m.active === option.id && "active"), option).children(
                      h.strong(option.label),
                      h.span(excerpt(notes.get(option.id)?.body ?? ""))
                    )
                  )
                ),
                m.shown.length === 0 && h.p("No notes match.")
              )
            )
        })
      }
    })
})

export const NoteLinkPicker = NoteLinkPickerNoDeps.pipe(
  Component.provide(ListNotes.layer.pipe(Layer.provide(Notes.layerHttp)))
)
