import { Effect, Schema } from "effect"
import { Loader } from "effect/reactivity"
import { NoteResults, NoteSort, NotesTag } from "../domain/Note.ts"
import { Notes } from "../services/Notes.ts"

// A read keyed by the whole search, so each page and order is cached on its
// own and going back to an earlier page shows it at once.
export class SearchNotes extends Loader.Service<SearchNotes>()(
  "notes/SearchNotes",
  {
    args: { q: Schema.String, page: Schema.Number, sort: NoteSort },
    success: NoteResults,
    error: Schema.Never,
    staleTime: "30 seconds",
    tags: [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return (search) => notes.search(search)
  })
) {}
