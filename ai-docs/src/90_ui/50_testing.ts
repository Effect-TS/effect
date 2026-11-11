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
import { TestClock } from "effect/testing"
import { Router } from "effect/ui"
import { HtmlQuery, ssr } from "effect/ui/html/testing"
import { Query, Story, TestHost } from "effect/ui/testing"
import { NoteEditor, NoteEditorEvents, SaveNote } from "./10_basics.ts"
import { App, AppRoute } from "./30_routing.ts"
import { type Note, NoteSaveError } from "./fixtures/notes/domain/Note.ts"
import { Notes } from "./fixtures/notes/services/Notes.ts"

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
// Runtime: anything that crosses a child slot, a Layer or the Router.
// ---------------------------------------------------------------------------

// `Router.memory` is the Router for tests. The app's own requirements are
// provided as in production, except that `Notes` is the in-memory fake.
// Build fresh services for each test so edits and navigation cannot leak.
const AppTest = Layer.mergeAll(
  Router.memory({ routes: AppRoute, url: "/notes/n1" }),
  Notes.layerMemory([note]),
  TestHost.layer()
)

it.layer(AppTest, { buildPerTest: true })("App", (it) => {
  it.effect("loads a note, autosaves an edit and shows the notice", () =>
    Effect.gen(function*() {
      // `Router.props` reads the root's `{ route }` from the Router.
      const root = yield* TestHost.mount(App, Router.props(AppRoute))
      // `settle` drains Commands, fetches, Layer builds and the render flush.
      yield* TestHost.settle
      assert.strictEqual(root.head().title, "Shopping · Notes")

      Query.fire(root.get(body), "input", { value: edited.body })
      yield* TestHost.settle
      // The TestClock owns time. Adjusting it fires the autosave Subscription.
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
