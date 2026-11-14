import { Effect, Schema } from "effect"
import { Loader } from "effect/reactivity"
import { Note, NoteNotFound, NotesTag } from "../domain/Note.ts"
import { Notes } from "../services/Notes.ts"

// A read is data loaded by its arguments and cached, so components watching
// the same note share one entry and one fetch. Like a `Command.Service`, it
// captures `Notes` when its Layer is built. `SaveNote` invalidates
// `NotesTag`, so a save refetches it.
export class GetNote extends Loader.Service<GetNote>()(
  "notes/GetNote",
  {
    args: { id: Schema.String },
    success: Note,
    error: NoteNotFound,
    staleTime: "30 seconds",
    tags: [NotesTag]
  },
  Effect.gen(function*() {
    const notes = yield* Notes
    return ({ id }) => notes.get(id)
  })
) {}
