import { Schema } from "effect"
import { Loader } from "effect/reactivity"

export const Note = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  body: Schema.String
})
export type Note = typeof Note.Type

// How search results are ordered, by title.
export const NoteSort = Schema.Literals(["asc", "desc"])
export type NoteSort = typeof NoteSort.Type

// One page of search results, and how many pages there are.
export const NoteResults = Schema.Struct({
  notes: Schema.Array(Note),
  pages: Schema.Number
})
export type NoteResults = typeof NoteResults.Type

export class NoteNotFound extends Schema.TaggedError<NoteNotFound>()("NoteNotFound", {
  id: Schema.String
}) {}

export class NoteSaveError extends Schema.TaggedError<NoteSaveError>()("NoteSaveError", {
  reason: Schema.String
}) {}

// The invalidation tag every read of notes belongs to. A Command that changes
// a note invalidates the tag, and every read carrying it refetches.
export const NotesTag = Loader.Tag("notes")
