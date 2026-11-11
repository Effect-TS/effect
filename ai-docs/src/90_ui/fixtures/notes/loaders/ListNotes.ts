import { Effect, Schema } from "effect"
import { Loader } from "effect/reactivity"
import { Note, NotesTag } from "../domain/Note.ts"
import { Notes } from "../services/Notes.ts"

// A read with no arguments writes `args: {}`, and one that can't fail writes
// `error: Schema.Never`. The Effect runs once, when the Layer is built, and
// returns the fetcher.
export class ListNotes extends Loader.Service<ListNotes>()(
  "notes/ListNotes",
  {
    args: {},
    success: Schema.Array(Note),
    error: Schema.Never,
    staleTime: "30 seconds",
    tags: [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return () => notes.list
  })
) {}
