import { Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"

const State = Schema.Literals(["closed", "open", "modal"])

export const ConfirmMessage = Schema.TaggedUnion({
  Ask: {},
  Escaped: {},
  Chosen: { choice: Schema.String },
  Closed: {},
  Mode: { state: State },
  Remove: {}
})

/** A confirm dialog: Escape is accepted only with `acceptEscape`, and its form's choice closes it. */
export const Confirm = Component.make({
  name: "Confirm",
  props: Schema.Struct({ state: State, acceptEscape: Schema.Boolean }),
  model: Schema.Struct({
    state: State,
    acceptEscape: Schema.Boolean,
    shown: Schema.Boolean,
    log: Schema.Array(Schema.String)
  }),
  message: ConfirmMessage,
  elements: Html,
  init: ($) => ({ state: $.props.state, acceptEscape: $.props.acceptEscape, shown: true, log: [] }),
  update: (model, message) =>
    ConfirmMessage.match(message, {
      Ask: () => ({ ...model, state: "modal" as const }),
      Escaped: () =>
        model.acceptEscape
          ? { ...model, state: "closed" as const, log: [...model.log, "escape"] }
          : { ...model, log: [...model.log, "escape rejected"] },
      Chosen: ({ choice }) => ({ ...model, state: "closed" as const, log: [...model.log, choice] }),
      Closed: () => ({ ...model, log: [...model.log, "closed"] }),
      Mode: ({ state }) => ({ ...model, state }),
      Remove: () => ({ ...model, shown: false })
    }),
  view: (model, h) => {
    const dialog = h.dialog.attr("aria-label", "Delete note?")
      .onCancel(ConfirmMessage.make({ _tag: "Escaped" }))
      .onClose(ConfirmMessage.make({ _tag: "Closed" }))
    return h.div(
      h.button.onClick(ConfirmMessage.make({ _tag: "Ask" })).children("Ask"),
      h.button.onClick(ConfirmMessage.make({ _tag: "Remove" })).children("Remove"),
      model.shown &&
        (model.state === "modal" ? dialog.modal(true) : dialog.open(model.state === "open")).children(
          h.h2("Delete note?"),
          h.form.attr("method", "dialog").onSubmit(({ entries }) =>
            ConfirmMessage.make({ _tag: "Chosen", choice: entries.find(([name]) => name === "choice")?.[1] ?? "" })
          ).children(
            h.button.attr("name", "choice").attr("value", "keep").children("Keep"),
            h.button.attr("name", "choice").attr("value", "delete").children("Delete")
          )
        )
    )
  }
})

/** Two modals, one nested in the other, both open from the start. */
export const Nested = Component.make({
  name: "Nested",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html,
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.dialog
      .attr("aria-label", "Outer").modal(true).children(
        h.p("Outer"),
        h.dialog.attr("aria-label", "Inner").modal(true).children(h.p("Inner"))
      )
})
