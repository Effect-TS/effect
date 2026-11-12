import { Context, Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Note, NoteNotFound, NoteResults, NoteSaveError, type NoteSort } from "../domain/Note.ts"

// What a search asks for. `page` starts at 1.
export interface NoteSearch {
  readonly q: string
  readonly page: number
  readonly sort: NoteSort
}

// The number of notes on one page of search results.
export const pageSize = 20

// All of the UI's I/O goes through this service. Commands and loader reads
// capture it, so a component's `update` and `view` never name it.
export class Notes extends Context.Service<Notes, {
  readonly list: Effect.Effect<ReadonlyArray<Note>>
  get(id: string): Effect.Effect<Note, NoteNotFound>
  save(note: Note): Effect.Effect<Note, NoteSaveError>
  search(search: NoteSearch): Effect.Effect<NoteResults>
}>()("app/Notes") {
  // The app's implementation, which calls its own JSON API. It requires only
  // an `HttpClient`. That is a platform Layer, so the entry module provides
  // it: `FetchHttpClient` in the browser, a client that reaches the API on
  // the server, and a fake in a test of the whole app.
  static readonly layerHttp = Layer.effect(
    Notes,
    Effect.gen(function*() {
      const client = (yield* HttpClient.HttpClient).pipe(
        // `mapRequestInput` runs before the provided client's own request
        // transforms, so one that adds a base URL sees `/api/notes`.
        HttpClient.mapRequestInput(HttpClientRequest.prependUrl("/api")),
        HttpClient.filterStatusOk
      )

      const list = client.get("/notes").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(Note))),
        // The list has no typed error, so a failure is a defect and fails
        // the slot that reads it.
        Effect.orDie
      )

      const get = (id: string) =>
        client.get(`/notes/${id}`).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Note)),
          Effect.mapError(() => new NoteNotFound({ id }))
        )

      const save = (note: Note) =>
        HttpClientRequest.put(`/notes/${note.id}`).pipe(
          HttpClientRequest.bodyJsonUnsafe(note),
          client.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Note)),
          Effect.mapError((cause) => new NoteSaveError({ reason: cause.message }))
        )

      const search = ({ page, q, sort }: NoteSearch) =>
        client.get("/notes/search", { urlParams: { q, page, sort } }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(NoteResults)),
          Effect.orDie
        )

      return Notes.of({ list, get, save, search })
    })
  )

  // An in-memory implementation, for tests of one command or component and
  // for the server's own store. A note with an empty title can't be saved,
  // which gives tests a failure to exercise.
  static readonly layerMemory = (seed: ReadonlyArray<Note>) =>
    Layer.sync(Notes, () => {
      const notes = new Map(seed.map((note) => [note.id, note]))
      return Notes.of({
        list: Effect.sync(() => Array.from(notes.values())),
        // `Effect.suspend` keeps the fake as lazy as the HTTP client. The
        // Map is only read and written when the Effect runs.
        get: (id) =>
          Effect.suspend(() => {
            const note = notes.get(id)
            return note === undefined ? Effect.fail(new NoteNotFound({ id })) : Effect.succeed(note)
          }),
        save: (note) =>
          Effect.suspend(() => {
            if (note.title === "") return Effect.fail(new NoteSaveError({ reason: "A note needs a title" }))
            notes.set(note.id, note)
            return Effect.succeed(note)
          }),
        search: ({ page, q, sort }) =>
          Effect.sync(() => {
            const needle = q.toLowerCase()
            const found = Array.from(notes.values())
              .filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(needle))
              .sort((a, b) => sort === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title))
            return {
              notes: found.slice((page - 1) * pageSize, page * pageSize),
              pages: Math.max(1, Math.ceil(found.length / pageSize))
            }
          })
      })
    })
}
