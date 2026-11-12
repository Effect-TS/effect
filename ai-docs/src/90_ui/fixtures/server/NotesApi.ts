import { Effect, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { Note } from "../notes/domain/Note.ts"
import { Notes } from "../notes/services/Notes.ts"

const notesJson = HttpServerResponse.schemaJson(Schema.Array(Note))
const noteJson = HttpServerResponse.schemaJson(Note)
const noteId = HttpRouter.schemaPathParams(Schema.Struct({ id: Schema.String }))

// The JSON API that `Notes.layerHttp` calls, as plain routes to keep it
// short. Define a real API with `HttpApi`.
//
// The server holds the notes itself. On this side `Notes` is the store, and
// the browser's `Notes.layerHttp` is a client of these routes.
//
// A handler can fail. The router answers a `SchemaError` with 400 and any
// other failure with 500, so a request that doesn't decode needs no handling
// here. Only the domain errors are mapped to a response.
export const NotesApi = HttpRouter.addAll([
  HttpRouter.route(
    "GET",
    "/api/notes",
    Effect.gen(function*() {
      const notes = yield* Notes
      return yield* notesJson(yield* notes.list)
    })
  ),
  HttpRouter.route(
    "GET",
    "/api/notes/:id",
    Effect.gen(function*() {
      const notes = yield* Notes
      const { id } = yield* noteId
      return yield* noteJson(yield* notes.get(id))
    }).pipe(
      Effect.catchTag("NoteNotFound", () => Effect.succeed(HttpServerResponse.empty({ status: 404 })))
    )
  ),
  HttpRouter.route(
    "PUT",
    "/api/notes/:id",
    Effect.gen(function*() {
      const notes = yield* Notes
      const { id } = yield* noteId
      const note = yield* HttpServerRequest.schemaBodyJson(Note)
      // The URL names the note that is written, whatever id the body carries.
      return yield* noteJson(yield* notes.save({ ...note, id }))
    }).pipe(
      Effect.catchTag(
        "NoteSaveError",
        (error) => Effect.succeed(HttpServerResponse.text(error.reason, { status: 422 }))
      )
    )
  )
]).pipe(
  HttpRouter.provideRequest(Notes.layerMemory([{ id: "welcome", title: "Welcome", body: "Write something." }]))
)
