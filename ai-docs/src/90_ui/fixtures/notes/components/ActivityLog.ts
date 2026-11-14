import { Schema } from "effect"
import { Component } from "effect/ui"
import { NoteActivity } from "./NoteActivity.ts"

// One implementation of the feature. Its props must fit the contract.
export const ActivityLog = Component.define({
  name: "ActivityLog",
  props: NoteActivity.props,
  model: Schema.Struct({}),
  message: Schema.Never
}).make({
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.aside(`No activity yet on note ${h.props.noteId}.`)
})
