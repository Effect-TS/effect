import { Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"

// `kit/` holds components that belong to no feature: a design system's
// behaviour, shared by every feature. A headless one owns the state, the
// keyboard and the ARIA, and has no markup. Each feature draws its own.

// The rows are data in props, as Schemas. A row carries what the Listbox
// needs to filter, step and announce it: an id, a label and whether it can be
// picked. Anything richer, such as a subtitle or an icon, stays with the
// consumer, which looks it up by id in its closure.
export const ListboxOption = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  disabled: Schema.optional(Schema.Boolean)
})
export type ListboxOption = typeof ListboxOption.Type

export const ListboxMessage = Schema.TaggedUnion({
  Toggled: { open: Schema.Boolean },
  Query: { value: Schema.String },
  Key: { key: Schema.String },
  Pick: { id: Schema.String },
  Moved: {}
})

// What the consumer gets through `onEmit`. Typeahead on the closed trigger
// picks too, as a native `<select>` does.
export const ListboxEvents = Schema.TaggedUnion({ Picked: { id: Schema.String } })

// Refs into the consumer's elements. A part attaches them, so they belong to
// the Listbox and its `update` can focus and scroll them. `Row.at(id)`
// names one row.
const Trigger = Html.ref("Listbox.trigger", "button")
const Input = Html.ref("Listbox.input", "input")
const Row = Html.ref("Listbox.option", "li")

const filter = (options: ReadonlyArray<ListboxOption>, query: string) =>
  query === "" ? options : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

// The next enabled row after `from`, wrapping, or the first or last one.
const step = (options: ReadonlyArray<ListboxOption>, from: string | null, direction: 1 | -1): string | null => {
  const enabled = options.filter((o) => o.disabled !== true)
  if (enabled.length === 0) return null
  const index = enabled.findIndex((o) => o.id === from)
  if (index < 0) return direction === 1 ? enabled[0]!.id : enabled[enabled.length - 1]!.id
  return enabled[(index + direction + enabled.length) % enabled.length]!.id
}

// The Model keeps an id into the props' rows, and the consumer can replace
// them at any time, so every reader goes through this: the active row, if
// it's still shown and can be picked.
const activeIn = (shown: ReadonlyArray<ListboxOption>, active: string | null) =>
  shown.some((o) => o.id === active && o.disabled !== true) ? active : null

const moved = () => ListboxMessage.make({ _tag: "Moved" })

/**
 * A select-only trigger with a popup holding a filter input and the rows: the
 * ARIA combobox pattern. Typeahead runs on the trigger, and arrows, Enter and
 * Escape on the input, the elements that have focus. A key handler on the
 * popup around them would also catch keys meant for the consumer's controls.
 */
export const Listbox = Component.define({
  name: "Listbox",
  props: Schema.Struct({
    options: Schema.Array(ListboxOption),
    // The consumer owns the value. The Listbox reads it to start from it.
    selected: Schema.NullOr(Schema.String)
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
    query: Schema.String,
    active: Schema.NullOr(Schema.String),
    typed: Schema.String
  }),
  message: ListboxMessage,
  events: ListboxEvents,
  elements: Html
}).make({
  init: () => ({ open: false, query: "", active: null, typed: "" }),
  update: (model, message, $) =>
    ListboxMessage.match(message, {
      // The popup is an auto popover. The browser opens it from the trigger
      // and closes it on Escape or a click outside, and the Model follows.
      // Focus moves into the popup and back to the trigger with it.
      Toggled: ({ open }) =>
        $.set({ ...model, open, query: "", active: open ? $.props.selected : null })
          .run(Html.focus(open ? Input : Trigger, moved)),
      Query: ({ value }) => ({ ...model, query: value, active: step(filter($.props.options, value), null, 1) }),
      Key: ({ key }) => {
        const shown = filter($.props.options, model.query)
        const active = activeIn(shown, model.active)
        switch (key) {
          case "ArrowDown":
          case "ArrowUp": {
            const next = step(shown, active, key === "ArrowDown" ? 1 : -1)
            // `aria-activedescendant` leaves focus in the input, so the
            // browser doesn't scroll the active row into view by itself.
            return next === null
              ? { ...model, open: true }
              : $.set({ ...model, open: true, active: next })
                .run(Html.scrollIntoView(Row.at(next), moved, { block: "nearest" }))
          }
          case "Enter":
            return active === null
              ? model
              : $.set({ ...model, open: false }).emit(ListboxEvents.make({ _tag: "Picked", id: active }))
          case "Escape":
            return { ...model, open: false }
          default: {
            // Typeahead: the first label starting with what was typed. A key
            // no label continues with starts over from that key, so `typed`
            // is never longer than a label and needs no timer to reset it.
            const find = (prefix: string) =>
              $.props.options.find((o) => o.disabled !== true && o.label.toLowerCase().startsWith(prefix))
            const extended = model.typed + key.toLowerCase()
            const typed = find(extended) !== undefined ? extended : key.toLowerCase()
            const hit = find(typed)
            return hit === undefined
              ? { ...model, typed: "" }
              : $.set({ ...model, typed }).emit(ListboxEvents.make({ _tag: "Picked", id: hit.id }))
          }
        }
      },
      Pick: ({ id }) => $.set({ ...model, open: false }).emit(ListboxEvents.make({ _tag: "Picked", id })),
      Moved: () => model
    }),
  // `parts` returns plain values for the consumer to read, and parts to
  // apply to its elements. `p.part(tag, decorate)` takes only a builder of
  // that tag, checked in the types and when it's applied. A part adds ARIA,
  // ids, refs and handlers, and the consumer adds everything else.
  //
  // `p.id` is derived from the instance's path, so two Listboxes on a page
  // never share an id, and the server and the browser agree on them.
  //
  // Parts need no runtime. A test of the Listbox builds them from a Model and
  // props with `Story.parts(Listbox, { model, props })`, and `Story.make`
  // runs it with a stand-in view for the consumer.
  parts: (model, p) => {
    const shown = filter(p.props.options, model.query)
    const active = activeIn(shown, model.active)
    return {
      open: model.open,
      shown,
      active,
      trigger: p.part("button", (b) =>
        b.ref(Trigger)
          .attr("type", "button")
          .attr("role", "combobox")
          .attr("aria-haspopup", "listbox")
          .attr("aria-expanded", String(model.open))
          .attr("aria-controls", p.id("popup"))
          // A `popovertarget` invoker: the browser toggles the popup, and a
          // click on the trigger while it's open closes it.
          .attr("popovertarget", p.id("popup"))
          .onKeyDown(
            ({ alt, ctrl, key, meta }) =>
              key === "ArrowDown" || (key.length === 1 && key !== " " && !alt && !ctrl && !meta)
                ? ListboxMessage.make({ _tag: "Key", key })
                : undefined,
            // Cancels the default only when a message was returned, so Tab,
            // Space and Enter keep working.
            { preventDefault: true }
          )),
      popup: p.part("div", (b) =>
        b.id(p.id("popup"))
          .popover("auto", model.open)
          .onToggle(({ open }) => ListboxMessage.make({ _tag: "Toggled", open }))),
      input: p.part("input", (b) =>
        b.ref(Input)
          .attr("role", "combobox")
          .attr("aria-autocomplete", "list")
          .attr("aria-expanded", "true")
          .attr("aria-controls", p.id("list"))
          .attr("aria-activedescendant", active === null ? undefined : p.id("option", active))
          .value(model.query)
          .onInput(({ value }) => ListboxMessage.make({ _tag: "Query", value }))
          .onKeyDown(
            ({ key }) =>
              key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === "Escape"
                ? ListboxMessage.make({ _tag: "Key", key })
                : undefined,
            { preventDefault: true }
          )),
      list: p.part("ul", (b) => b.id(p.id("list")).attr("role", "listbox")),
      // A part takes arguments after the builder: the consumer passes the
      // row it's drawing.
      option: p.part("li", (b, option: ListboxOption) =>
        b.id(p.id("option", option.id))
          .ref(Row.at(option.id))
          .attr("role", "option")
          .attr("aria-selected", String(active === option.id))
          .attr("aria-disabled", option.disabled === true ? "true" : undefined)
          .onClick(option.disabled === true ? () => undefined : ListboxMessage.make({ _tag: "Pick", id: option.id })))
    }
  }
})
