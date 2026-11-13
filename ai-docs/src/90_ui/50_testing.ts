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
import { HtmlQuery, HtmlStory, ssr } from "effect/ui/html/testing"
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
import { NotePageNoDeps } from "./fixtures/pages/notes/NotePage.ts"
import { NotesIndexNoDeps } from "./fixtures/pages/NotesIndex.ts"
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
        .fire(HtmlQuery.role("form", { name: "Edit note" }), "submit")
        // Commands stay pending as data until a step resolves them.
        .expectExact(SaveNote)
        .check((story) => assert.deepStrictEqual(story.pending[0].command.args, { note: edited }))
        // `resolve` takes the Command's own result. `fail` takes its typed error.
        .resolve(SaveNote, edited)
        .model((model) => assert.strictEqual(model.saved, edited.body))
        .emitted((events) => assert.deepStrictEqual(events, [NoteEditorEvents.make({ _tag: "Saved", note: edited })])))
    // `Story.make` fails if a Command is still pending at the end.
  })

  it("saves on Ctrl+S instead of opening the browser's save dialog", () => {
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        // `defaultPrevented` tells whether the last `fire` or `click` step
        // cancelled the browser's default. Checks read it without resetting it.
        .fire(body, "keydown", { key: "s", ctrl: true })
        .check((story) => assert.isTrue(story.defaultPrevented))
        .expectExact(SaveNote)
        .resolve(SaveNote, edited)
        // Any other step resets it.
        .check((story) => assert.isFalse(story.defaultPrevented)))
  })

  it("discards from the actions menu after asking, and Escape keeps the changes", () => {
    const discard = HtmlQuery.role("dialog", { name: "Discard your changes?" })
    const actions = HtmlQuery.role("menu", { name: "Note actions" })
    // A closed popover is hidden from role queries, so opening it finds it with `hidden`.
    const closedActions = HtmlQuery.role("menu", { name: "Note actions", hidden: true })
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        // The browser opens the menu from its button; a story sends the
        // toggle the browser host would.
        .fire(closedActions, "toggle", { open: true, newState: "open", oldState: "closed" })
        .check((story) => assert.strictEqual(HtmlQuery.popoverState(story.get(actions)), "open"))
        .click("Discard changes")
        // Choosing an item closes the menu.
        .check((story) => assert.isUndefined(story.query(actions)))
        // A dialog's state is `props.open` in a story: closed, open or modal.
        .check((story) => assert.strictEqual(HtmlQuery.dialogState(story.get(discard)), "modal"))
        // Escape is a close request, sent to `onCancel`. Here `update` closes
        // the dialog and keeps the draft. A closed dialog is hidden from role
        // queries, as it is from the accessibility tree.
        .fire(discard, "cancel")
        .check((story) => assert.isUndefined(story.query(discard)))
        .model((model) => assert.strictEqual(model.draft, edited.body))
        .fire(closedActions, "toggle", { open: true, newState: "open", oldState: "closed" })
        .click("Discard changes")
        // The dialog's form is the app's: its choice is in `entries`.
        .fire(Query.inside(discard, Query.tag("form")), "submit", {
          fields: { choice: "discard" },
          entries: [["choice", "discard"]]
        })
        .model((model) => assert.strictEqual(model.draft, note.body)))
  })

  it("shows why a save failed", () => {
    Story.make(NoteEditor, { note }, (s) =>
      s.fire(body, "input", { value: edited.body })
        .fire(HtmlQuery.role("form", { name: "Edit note" }), "submit")
        .fail(SaveNote, new NoteSaveError({ reason: "You are offline" }))
        .check((story) => assert.strictEqual(Query.textOf(story.get(HtmlQuery.role("alert"))), "You are offline")))
  })
})

describe("NotePage", () => {
  it("tells the editor to save now", () => {
    Story.make(NotePageNoDeps, { id: note.id }, (s) =>
      s.loaded("note", note)
        .click("Save now")
        // A story renders no children, so what `update` sent them is data.
        .sent((sent) =>
          assert.deepStrictEqual(sent.map((send) => [send.ref.key, send.message]), [["Editor[n1]", { _tag: "Save" }]])
        ))
  })
})

describe("NotesIndex", () => {
  it("pins a note dropped on the pinned list", () => {
    const pinned = HtmlQuery.role("complementary", { name: "Pinned" })
    Story.make(NotesIndexNoDeps, {}, (s) =>
      // Load steps take the loader's name. `loaded` writes the result to
      // the `notes` slot, as the runtime would, and re-renders the view.
      s.loaded("notes", [note])
        // A drop with a hand-written payload. `HtmlStory.drop` picks the
        // target the browser host would, and throws when none accepts the
        // payload's types, as the browser refuses the drop.
        .pipe(HtmlStory.drop(pinned, { data: { "application/x-note": note.id } }))
        .model((model) => assert.deepStrictEqual(model.pinned, [note.id]))
        .check((story) => assert.isTrue(story.defaultPrevented)))
    assert.throws(() =>
      Story.start(NotesIndexNoDeps, {}).loaded("notes", [note])
        .pipe(HtmlStory.drop(pinned, { files: [new File(["hello"], "notes.txt")] }))
    )
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
      // The paths of the instances that adopted the server's state.
      assert.include(result.adopted, "/App/NotePage[/notes/n1]/NoteEditor[Editor[n1]]")
    }))
})
