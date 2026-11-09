import { Html } from "@effect/ui-html"
import { Schema } from "effect"
import { Component } from "effect/ui"

const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Add: {} })

const NewTodo = Html.ref("NewTodo", "input")

const Form = Component.make({
  name: "Form",
  model: Schema.String,
  message: Message,
  elements: Html,
  init: () => "",
  update: (draft, message) => (message._tag === "Typed" ? message.value : ""),
  view: (draft, h) =>
    h.form(
      h.input().ref(NewTodo).attr("aria-label", "New todo").value(draft)
        .onInput(({ value }) => Message.make({ _tag: "Typed", value })),
      h.button("Add").attr("type", "submit")
    ).onSubmit(Message.make({ _tag: "Add" }))
})