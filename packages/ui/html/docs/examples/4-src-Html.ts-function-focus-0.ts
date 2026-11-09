import { Html } from "@effect/ui-html"
import { Schema } from "effect"

const Message = Schema.TaggedUnion({ Add: {}, Focused: {} })
const NewTodo = Html.ref("NewTodo", "input")

const command = Html.focus(NewTodo, () => Message.make({ _tag: "Focused" }))