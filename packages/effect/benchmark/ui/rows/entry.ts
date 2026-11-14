import { Effect, Exit, Schema, Scope } from "effect"
import { Component } from "effect/ui"
import { BrowserHost, Html } from "effect/ui/html"
import { init, install, update } from "./harness.ts"

// The keyed table of js-framework-benchmark (krausest), on effect/ui. Two variants render the same
// DOM (see harness.ts):
//
//   plain      every row is plain elements in the table's own view: one component in total.
//   component  a child component per row (key + props), which skips rendering when its props are equal.

const Row = Schema.Struct({ id: Schema.Number, label: Schema.String })
const Model = Schema.Struct({ rows: Schema.Array(Row), selected: Schema.Number, nextId: Schema.Number })
const Message = Schema.TaggedUnion({
  Run: { count: Schema.Number },
  Add: { count: Schema.Number },
  Update: {},
  Clear: {},
  Swap: {},
  Select: { id: Schema.Number },
  Remove: { id: Schema.Number }
})

const app = { name: "Table", model: Model, message: Message, elements: Html } as const
const Plain = Component.define(app).make({
  init,
  update,
  view: (model, h) =>
    h.table.class("table").children(
      h.tbody.children(model.rows.map((row) =>
        h.tr.key(String(row.id)).class(row.id === model.selected && "danger").children(
          h.td.class("col-md-1").children(String(row.id)),
          h.td.class("col-md-4").children(
            h.a.onClick(Message.make({ _tag: "Select", id: row.id })).children(row.label)
          ),
          h.td.class("col-md-1").children(
            h.a.onClick(Message.make({ _tag: "Remove", id: row.id })).children(
              h.span.class("glyphicon", "glyphicon-remove").attr("aria-hidden", "true")
            )
          ),
          h.td.class("col-md-6")
        )
      ))
    )
})

const RowMessage = Schema.TaggedUnion({ Select: {}, Remove: {} })
const RowView = Component.define({
  name: "Row",
  props: Schema.Struct({ row: Row, selected: Schema.Boolean }),
  model: Schema.Null,
  message: RowMessage,
  events: Message,
  elements: Html
}).make({
  init: () => null,
  update: (_, message, $) =>
    $.emit(
      message._tag === "Select"
        ? Message.make({ _tag: "Select", id: $.props.row.id })
        : Message.make({ _tag: "Remove", id: $.props.row.id })
    ),
  view: (_, h) =>
    h.tr.class(h.props.selected && "danger").children(
      h.td.class("col-md-1").children(String(h.props.row.id)),
      h.td.class("col-md-4").children(h.a.onClick(RowMessage.make({ _tag: "Select" })).children(h.props.row.label)),
      h.td.class("col-md-1").children(
        h.a.onClick(RowMessage.make({ _tag: "Remove" })).children(
          h.span.class("glyphicon", "glyphicon-remove").attr("aria-hidden", "true")
        )
      ),
      h.td.class("col-md-6")
    )
})
const Components = Component.define(app).make({
  init,
  update,
  view: (model, h) =>
    h.table.class("table").children(
      h.tbody.children(model.rows.map((row) =>
        h.child(RowView, {
          key: String(row.id),
          props: { row, selected: row.id === model.selected },
          onEmit: (message) => message
        })
      ))
    )
})

const mount = (component: typeof Plain) => async (container: HTMLElement) => {
  const scope = Effect.runSync(Scope.make())
  const root = await Effect.runPromise(Scope.provide(BrowserHost.mountEffect(component, {}, container), scope))
  return {
    send: (message: typeof Message.Type) => root.send(message),
    close: () => Effect.runPromise(Scope.close(scope, Exit.void))
  }
}

install({ plain: mount(Plain), component: mount(Components) })
