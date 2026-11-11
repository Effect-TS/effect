import { Context, Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Note, NoteNotFound, NoteSaveError } from "../domain/Note.ts"

// All of the UI's I/O goes through this service. Commands and loader reads
// capture it, so components never name it and tests swap the Layer.
export class Notes extends Context.Service<Notes, {
  readonly list: Effect.Effect<ReadonlyArray<Note>>
  get(id: string): Effect.Effect<Note, NoteNotFound>
  save(note: Note): Effect.Effect<Note, NoteSaveError>
}>()("app/Notes") {
  // The browser implementation, which calls the app's own JSON API.
  static readonly layerHttp = Layer.effect(
    Notes,
    Effect.gen(function*() {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl("/api")),
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

      return Notes.of({ list, get, save })
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))

  // An in-memory implementation, for tests and for rendering on a server that
  // holds the data itself. A note with an empty title can't be saved, which
  // gives tests a failure to exercise.
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
          })
      })
    })
}
