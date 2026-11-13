import { Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"

export const Item = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  disabled: Schema.optional(Schema.Boolean)
})
export type Item = typeof Item.Type

export const MenuMessage = Schema.TaggedUnion({
  Toggle: {},
  Toggled: { open: Schema.Boolean },
  Query: { value: Schema.String },
  Key: { key: Schema.String },
  Pick: { id: Schema.String },
  Focused: { found: Schema.Boolean }
})

export const MenuEvents = Schema.TaggedUnion({ Picked: { id: Schema.String } })

const Trigger = Html.ref("Menu.trigger", "button")
const Input = Html.ref("Menu.input", "input")

const filter = (items: ReadonlyArray<Item>, query: string): ReadonlyArray<Item> =>
  query === "" ? items : items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))

/** The next enabled item after "from" in "direction", wrapping, or the first enabled one. */
const step = (items: ReadonlyArray<Item>, from: string | null, direction: 1 | -1): string | null => {
  const enabled = items.filter((item) => item.disabled !== true)
  if (enabled.length === 0) return null
  const index = enabled.findIndex((item) => item.id === from)
  if (index < 0) return direction === 1 ? enabled[0]!.id : enabled[enabled.length - 1]!.id
  return enabled[(index + direction + enabled.length) % enabled.length]!.id
}

/**
 * The active item, if the rows shown still have it and it can be picked. The Model keeps an id
 * into the props' items, which the parent can replace at any time, so every reader goes through this.
 */
const activeIn = (visible: ReadonlyArray<Item>, active: string | null): string | null =>
  visible.some((item) => item.id === active && item.disabled !== true) ? active : null

const MenuDef = Component.define({
  name: "Menu",
  props: Schema.Struct({ items: Schema.Array(Item) }),
  model: Schema.Struct({
    open: Schema.Boolean,
    query: Schema.String,
    active: Schema.NullOr(Schema.String),
    typed: Schema.String,
    focused: Schema.Array(Schema.String)
  }),
  message: MenuMessage,
  events: MenuEvents,
  elements: Html
})

/**
 * A filterable menu with no markup of its own. Its popup is an auto popover, which the Model follows.
 * Arrow keys, Enter and Escape are handled on the input, and typeahead on the trigger.
 */
export const Menu = MenuDef.make({
  init: ($) => $.set({ open: false, query: "", active: null, typed: "", focused: [] }),
  update: (model, message, $) =>
    MenuMessage.match(message, {
      Toggle: () => ({ ...model, open: !model.open }),
      // The browser's report of an auto popover: the Model follows, and focus moves with it.
      Toggled: ({ open }) =>
        $.set({ ...model, open, query: open ? model.query : "", active: open ? model.active : null }).run(
          open
            ? Html.focus(Input, ({ found }) => MenuMessage.make({ _tag: "Focused", found }))
            : Html.focus(Trigger, ({ found }) => MenuMessage.make({ _tag: "Focused", found }))
        ),
      Query: ({ value }) => ({ ...model, query: value, active: step(filter($.props.items, value), null, 1) }),
      Key: ({ key }) => {
        const visible = filter($.props.items, model.query)
        const active = activeIn(visible, model.active)
        switch (key) {
          case "ArrowDown":
            return { ...model, open: true, active: step(visible, active, 1) }
          case "ArrowUp":
            return { ...model, open: true, active: step(visible, active, -1) }
          case "Escape":
            return { ...model, open: false }
          case "Enter":
            return active === null
              ? model
              : $.set({ ...model, open: false }).emit(MenuEvents.make({ _tag: "Picked", id: active }))
          default: {
            // Typeahead: a printable key on the trigger moves to the first label that starts with what was typed.
            const typed = model.typed + key.toLowerCase()
            const hit = $.props.items.find((item) =>
              item.disabled !== true && item.label.toLowerCase().startsWith(typed)
            )
            return { ...model, typed, active: hit === undefined ? active : hit.id }
          }
        }
      },
      Pick: ({ id }) => $.set({ ...model, open: false }).emit(MenuEvents.make({ _tag: "Picked", id })),
      Focused: ({ found }) => ({
        ...model,
        focused: [...model.focused, (model.open ? "input" : "trigger") + ":" + String(found)]
      })
    }),
  parts: (model, p) => {
    const visible = filter(p.props.items, model.query)
    const active = activeIn(visible, model.active)
    return {
      open: model.open,
      query: model.query,
      active,
      visible,
      trigger: p.part("button", (b) =>
        b.ref(Trigger)
          .attr("aria-haspopup", "menu")
          .attr("aria-expanded", String(model.open))
          .attr("aria-controls", p.id("popup"))
          .onClick(MenuMessage.make({ _tag: "Toggle" }))
          .onKeyDown(
            ({ key }) => key.length === 1 || key === "ArrowDown" ? MenuMessage.make({ _tag: "Key", key }) : undefined,
            {
              preventDefault: true
            }
          )),
      popup: p.part("div", (b) =>
        b.id(p.id("popup"))
          .attr("role", "menu")
          .popover("auto", model.open)
          .onToggle(({ open }) => MenuMessage.make({ _tag: "Toggled", open }))),
      input: p.part("input", (b) =>
        b.ref(Input)
          .attr("role", "combobox")
          .attr("aria-controls", p.id("popup"))
          .attr("aria-activedescendant", active === null ? undefined : p.id("item", active))
          .value(model.query)
          .onInput(({ value }) => MenuMessage.make({ _tag: "Query", value }))
          .onKeyDown(
            ({ key }) =>
              key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === "Escape"
                ? MenuMessage.make({ _tag: "Key", key })
                : undefined,
            { preventDefault: true }
          )),
      item: p.part("li", (b, item: Item) =>
        b.id(p.id("item", item.id))
          .attr("role", "menuitem")
          .attr("aria-disabled", item.disabled === true ? "true" : undefined)
          .attr("data-active", active === item.id ? "" : undefined)
          .onClick(item.disabled === true ? () => undefined : MenuMessage.make({ _tag: "Pick", id: item.id })))
    }
  }
})

export const DialogMessage = Schema.TaggedUnion({ Open: {}, Close: {} })

export const DialogEvents = Schema.TaggedUnion({ Closed: {} })

/** A modal dialog with no markup of its own. Escape and its close part both close it. */
export const Dialog = Component.define({
  name: "Dialog",
  props: Schema.Struct({ label: Schema.String }),
  model: Schema.Struct({ open: Schema.Boolean }),
  message: DialogMessage,
  events: DialogEvents,
  elements: Html
}).make({
  init: () => ({ open: false }),
  update: (_, message, $) =>
    DialogMessage.match(message, {
      Open: () => $.set({ open: true }),
      Close: () => $.set({ open: false }).emit(DialogEvents.make({ _tag: "Closed" }))
    }),
  parts: (model, p) => ({
    open: model.open,
    trigger: p.part("button", (b) => b.onClick(DialogMessage.make({ _tag: "Open" }))),
    popup: p.part("dialog", (b) =>
      b.attr("aria-labelledby", p.id("title"))
        .modal(model.open)
        .onCancel(DialogMessage.make({ _tag: "Close" }))),
    title: p.part("h2", (b) => b.id(p.id("title"))),
    // Any element can close the dialog, so the part is declared over the host-neutral builder.
    close: p.part((b) => b.on("click", DialogMessage.make({ _tag: "Close" }), { preventDefault: true }))
  })
})
