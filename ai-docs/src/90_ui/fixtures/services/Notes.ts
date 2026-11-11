import { Context, Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Note, NoteNotFound, NoteSaveError } from "../domain/Note.ts"

// The one place the UI's I/O goes through. Commands and loader reads capture
// this service, so components never name it and tests swap the Layer.
export class Notes extends Context.Service<Notes, {
  readonly list: Effect.Effect<ReadonlyArray<Note>>
  get(id: string): Effect.Effect<Note, NoteNotFound>
  save(note: Note): Effect.Effect<Note, NoteSaveError>
}>()("app/Notes") {
  // The browser implementation: calls the app's own JSON API.
  static readonly layerHttp = Layer.effect(
    Notes,
    Effect.gen(function*() {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl("/api")),
        HttpClient.filterStatusOk
      )

      const list = client.get("/notes").pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(Note))),
        // The list has no typed error: a failure is a defect, which fails the
        // slot that reads it.
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
  // holds the data itself. A note with an empty title can't be saved, so the
  // failure path can be exercised.
  static readonly layerMemory = (seed: ReadonlyArray<Note>) =>
    Layer.sync(Notes, () => {
      const notes = new Map(seed.map((note) => [note.id, note]))
      return Notes.of({
        list: Effect.sync(() => Array.from(notes.values())),
        // `Effect.suspend` keeps the fake as lazy as the HTTP client: the
        // Map is read and written when the Effect runs, not when it is made.
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
