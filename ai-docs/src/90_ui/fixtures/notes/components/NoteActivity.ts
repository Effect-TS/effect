import { Schema } from "effect"
import { Feature } from "effect/ui"

// A feature is a component referred to by service. The service holds the
// contract (props and events Schemas) and a Layer picks the implementation,
// so a test can fake it and the app can load it lazily.
export class NoteActivity extends Feature.Service<NoteActivity>()("NoteActivity", {
  props: Schema.Struct({ noteId: Schema.String })
}) {}
