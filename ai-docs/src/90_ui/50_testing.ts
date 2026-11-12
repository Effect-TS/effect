/**
 * @title Testing effect/ui components
 *
 * Test a component as a pure `Story`, a Command against a fake Layer, and a
 * whole tree on `TestHost`. The last test renders on the server and hydrates
 * with `ssr`.
 */
// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"
import { Component, Router } from "effect/ui"
import { HtmlQuery, ssr } from "effect/ui/html/testing"
// Tests render views, so they register the HTML elements too. An app with
// many test files does it once, in a Vitest setup file.
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
import { Query, Story, TestHost } from "effect/ui/testing"
// One file here, to read top to bottom. In an app each `describe` sits next
// to what it tests: `notes/components/NoteEditor.test.ts` and `App.test.ts`.
import { App } from "./fixtures/App.ts"
import { NoteEditor, NoteEditorEvents, NoteEditorNoDeps, SaveNote } from "./fixtures/notes/components/NoteEditor.ts"
import { type Note, NoteSaveError } from "./fixtures/notes/domain/Note.ts"
import { Notes } from "./fixtures/notes/services/Notes.ts"
import { AppRoute } from "./fixtures/routes.ts"

const note: Note = { id: "n1", title: "Shopping", body: "Milk" }
const edited: Note = { ...note, body: "Oat milk" }

const body = HtmlQuery.role("textbox", { name: "Body" })

// ---------------------------------------------------------------------------
// Story: one instance as pure functions. No runtime, Layers or host.
// ---------------------------------------------------------------------------

describe("NoteEditor", () => {
  it("saves the draft and tells its parent", () => {
    // Each step runs when called and throws on failure. Events carry the
    // plain payloads the view's handlers expect.
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        // Nothing runs in a story, so Subscriptions are asserted by key.
        .subscriptions((keys) => assert.deepStrictEqual(keys, ["autosave:1"]))
        .fire(Query.tag("form"), "submit")
        // Commands stay pending as data until a step resolves them.
        .expectExact(SaveNote)
        .check((story) => assert.deepStrictEqual(story.pending[0].command.args, { note: edited }))
        // `resolve` takes the Command's own result. `fail` takes its typed error.
        .resolve(SaveNote, edited)
        .model((model) => assert.strictEqual(model.saved, edited.body))
        .emitted((events) => assert.deepStrictEqual(events, [NoteEditorEvents.make({ _tag: "Saved", note: edited })])))
    // `Story.make` fails if a Command is still pending at the end.
  })

  it("shows why a save failed", () => {
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        .fire(Query.tag("form"), "submit")
        .fail(SaveNote, new NoteSaveError({ reason: "You are offline" }))
        .check((story) => assert.strictEqual(Query.textOf(story.get(HtmlQuery.role("alert"))), "You are offline")))
  })
})

// ---------------------------------------------------------------------------
// Command: its implementation against a fake of the service it captures.
// ---------------------------------------------------------------------------

it.layer(SaveNote.layer.pipe(Layer.provideMerge(Notes.layerMemory([note]))), { buildPerTest: true })(
  "SaveNote",
  (it) => {
    it.effect("writes through Notes, and fails with a typed error", () =>
      Effect.gen(function*() {
        const notes = yield* Notes
        // `.effect` is the Command's work, before any `Command.match`.
        assert.deepStrictEqual(yield* SaveNote.make({ note: edited }).effect, edited)
        assert.deepStrictEqual(yield* notes.get(note.id), edited)

        const error = yield* Effect.flip(SaveNote.make({ note: { ...note, title: "" } }).effect)
        assert.strictEqual(error._tag, "NoteSaveError")
      }))
  }
)

// ---------------------------------------------------------------------------
// Runtime: one component on `TestHost`, with the Layers the test picks.
// ---------------------------------------------------------------------------

// `NoteEditor` already provides the app's Layers, and an inner provide wins
// over an outer one. So a test starts from `NoteEditorNoDeps` and provides
// its own: the real command over the in-memory `Notes`.
// Build fresh services for each test so edits cannot leak.
const NoteEditorTest = NoteEditorNoDeps.pipe(Component.provide(SaveNote.layer))

it.layer(Layer.mergeAll(Notes.layerMemory([note]), TestHost.layer()), { buildPerTest: true })(
  "NoteEditor on TestHost",
  (it) => {
    it.effect("autosaves an edit", () =>
      Effect.gen(function*() {
        const notes = yield* Notes
        const root = yield* TestHost.mount(NoteEditorTest, { note })
        Query.fire(root.get(body), "input", { value: edited.body })
        // `settle` drains Commands, fetches, Layer builds and the render flush.
        yield* TestHost.settle
        // The TestClock owns time. Adjusting it fires the autosave Subscription.
        yield* TestClock.adjust("2 seconds")
        yield* TestHost.settle
        assert.deepStrictEqual(yield* notes.get(note.id), edited)
        assert.deepStrictEqual(root.emitted, [NoteEditorEvents.make({ _tag: "Saved", note: edited })])
      }))
  }
)

// ---------------------------------------------------------------------------
// Runtime: the whole app, across child slots, Layers and the Router.
// ---------------------------------------------------------------------------

// The app is tested as it ships, so its components keep their own domain
// Layers. The test provides what an entry module provides. `Router.memory`
// is the Router for tests, and the HTTP client is a fake of the notes API.
const ApiFake = Layer.sync(HttpClient.HttpClient, () => {
  const notes = new Map([[note.id, note]])
  return HttpClient.make((request, url) =>
    Effect.sync(() => {
      const id = url.pathname.slice("/api/notes/".length)
      if (request.method === "PUT" && request.body._tag === "Uint8Array") {
        notes.set(id, JSON.parse(new TextDecoder().decode(request.body.body)))
      }
      const found = id === "" ? Array.from(notes.values()) : notes.get(id)
      return HttpClientResponse.fromWeb(
        request,
        found === undefined ? new Response(null, { status: 404 }) : Response.json(found)
      )
    })
  )
})

const AppTest = Layer.mergeAll(
  Router.memory({ routes: AppRoute, url: "/notes/n1" }),
  ApiFake,
  TestHost.layer()
)

it.layer(AppTest, { buildPerTest: true })("App", (it) => {
  it.effect("loads a note, saves an edit and shows the notice", () =>
    Effect.gen(function*() {
      // `Router.props` reads the root's `{ route }` from the Router.
      const root = yield* TestHost.mount(App, Router.props(AppRoute))
      yield* TestHost.settle
      assert.strictEqual(root.head().title, "Shopping · Notes")

      Query.fire(root.get(body), "input", { value: edited.body })
      yield* TestHost.settle
      yield* TestClock.adjust("2 seconds")
      yield* TestHost.settle
      assert.strictEqual(Query.textOf(root.get(HtmlQuery.role("status"))), "Saved")
    }))

  it.effect("hydrates what the server rendered", () =>
    Effect.gen(function*() {
      // `ssr` renders on the server and hydrates in a fresh document, which
      // is why this file needs the DOM environment above. It fails with
      // `SsrError` if the two disagree.
      const result = yield* ssr(App, Router.props(AppRoute))
      assert.include(result.html, "Milk")
      // The paths of the instances that adopted the server's Model.
      assert.include(result.adopted, "/App/NotePage[/notes/n1]/NoteEditor[n1]")
    }))
})
