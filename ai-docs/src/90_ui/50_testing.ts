/**
 * @title Testing effect/ui components
 *
 * Test one component as a pure `Story`, a Command against a fake Layer, a
 * whole tree on `TestHost`, and server rendering plus hydration with `ssr`.
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
import { type Note, NoteSaveError } from "./fixtures/domain/Note.ts"
import { Notes } from "./fixtures/services/Notes.ts"

const note: Note = { id: "n1", title: "Shopping", body: "Milk" }
const edited: Note = { ...note, body: "Oat milk" }

const body = HtmlQuery.role("textbox", { name: "Body" })

// ---------------------------------------------------------------------------
// Story: one instance, pure. No runtime, no Layers, no host.
// ---------------------------------------------------------------------------

describe("NoteEditor", () => {
  it("saves the draft and tells its parent", () => {
    // Each step runs when called and throws on failure. Events carry the
    // plain payloads the view's handlers expect.
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        // Subscriptions are asserted as keys: nothing runs in a story.
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

describe("SaveNote", () => {
  it.effect("writes through Notes, and fails with a typed error", () =>
    Effect.gen(function*() {
      // `.effect` is the Command's work, before any `Command.match`.
      assert.deepStrictEqual(yield* SaveNote.make({ note: edited }).effect, edited)
      assert.deepStrictEqual(yield* Effect.flatMap(Notes, (notes) => notes.get(note.id)), edited)

      const error = yield* Effect.flip(SaveNote.make({ note: { ...note, title: "" } }).effect)
      assert.strictEqual(error._tag, "NoteSaveError")
    }).pipe(Effect.provide(SaveNote.layer.pipe(Layer.provideMerge(Notes.layerMemory([note]))))))
})

// ---------------------------------------------------------------------------
// Runtime: anything that crosses a child slot, a Layer or the Router.
// ---------------------------------------------------------------------------

// `Router.memory` is the Router for tests. The app's own requirements are
// provided as in production, with the fake at the bottom.
const provideApp = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide([Router.memory({ routes: AppRoute, url: "/notes/n1" }), Notes.layerMemory([note])]),
    Effect.scoped,
    Effect.provide(TestHost.layer())
  )

describe("App", () => {
  it.effect("loads a note, autosaves an edit and shows the notice", () =>
    Effect.gen(function*() {
      const root = yield* TestHost.mount(App, { route: yield* Router.currentRoute(AppRoute) })
      // `settle` drains Commands, fetches, Layer builds and the render flush.
      yield* TestHost.settle
      assert.strictEqual(root.head().title, "Shopping · Notes")

      Query.fire(root.get(body), "input", { value: edited.body })
      yield* TestHost.settle
      // Time is the TestClock's: this fires the autosave Subscription.
      yield* TestClock.adjust("2 seconds")
      yield* TestHost.settle
      assert.strictEqual(Query.textOf(root.get(HtmlQuery.role("status"))), "Saved")
    }).pipe(provideApp))

  it.effect("hydrates what the server rendered", () =>
    Effect.gen(function*() {
      // Renders on the server, hydrates in a fresh document (hence the DOM
      // environment above) and fails with `SsrError` if the two disagree.
      const result = yield* ssr(App, { route: yield* Router.currentRoute(AppRoute) })
      assert.include(result.html, "Milk")
      // The paths of the instances that adopted the server's Model.
      assert.include(result.adopted, "/App/NotePage[/notes/n1]/NoteEditor[n1]")
    }).pipe(provideApp))
})
