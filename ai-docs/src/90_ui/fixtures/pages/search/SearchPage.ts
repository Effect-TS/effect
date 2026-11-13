import { Layer, Option, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Command, Component, Head, Router } from "effect/ui"
import { type NoteResults, NoteSort } from "../../notes/domain/Note.ts"
import { SearchNotes } from "../../notes/loaders/SearchNotes.ts"
import { Notes } from "../../notes/services/Notes.ts"
import { AppRoute } from "../../routes.ts"

// A one-case subset of the union types the page's props. Its values are
// route values of `AppRoute`, so the page can pass its route to
// `patchQuery`.
const SearchRoute = AppRoute.subset(["Search"])

const noteUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Note", params: { id } }))

export const SearchPageMessage = Schema.TaggedUnion({
  Typed: { text: Schema.String },
  Sorted: { sort: NoteSort },
  PageChosen: { page: Schema.Number },
  Patched: {}
})

const patched = Command.map(() => SearchPageMessage.make({ _tag: "Patched" }))

export const SearchPageNoDeps = Component.define({
  name: "SearchPage",
  // The page takes its whole route as props. The URL is the only copy of
  // the text, the order and the page number. The Model holds no draft of
  // them, so there is nothing to keep in sync with the URL. The results live
  // in the loader's slot, so the Model is empty.
  props: Schema.Struct({ route: SearchRoute }),
  model: Schema.Struct({}),
  message: SearchPageMessage,
  loaders: {
    results: {
      load: SearchNotes,
      // Typing changes the args on every keystroke. `debounce` fetches once
      // they have held still for 300 ms. Args whose results are cached and
      // fresh, such as a page seen moments ago, show at once, and so does the
      // first fetch at mount.
      debounce: "300 millis",
      args: (_model, props) => {
        const { page, q, sort } = props.route.query
        return { q: q ?? "", page, sort }
      }
    }
  }
}).make({
  init: () => ({}),
  update: (model, message, $) =>
    SearchPageMessage.match(message, {
      // `patchQuery` writes some of the query and keeps the rest. It
      // replaces the history entry by default, so typing doesn't fill the
      // back button. `undefined` removes a param or resets it to its
      // default, so a new search starts on page 1.
      Typed: ({ text }) =>
        $.run(Router.patchQuery(AppRoute, $.props.route, { q: text || undefined, page: undefined }).pipe(patched)),
      Sorted: ({ sort }) => $.run(Router.patchQuery(AppRoute, $.props.route, { sort, page: undefined }).pipe(patched)),
      // A page change is worth a history entry, so it pushes, and it
      // scrolls to the top like a new page would. Unlike a link to
      // `?page=2`, it isn't announced and focus stays on the button.
      PageChosen: ({ page }) =>
        $.run(
          Router.patchQuery(AppRoute, $.props.route, { page }, { history: "push", scroll: true }).pipe(patched)
        ),
      // The new route comes back as props, through the root.
      Patched: () => model
    }),
  head: () => [Head.title("Search notes")],
  view: (_model, h) => {
    const { page, q, sort } = h.props.route.query

    const resultsView = (results: NoteResults) =>
      h.div(
        h.ul(
          results.notes.map((note) =>
            h.li.key(note.id).children(h.a.attr("href", noteUrl(note.id)).children(note.title))
          )
        ),
        h.nav.attr("aria-label", "Pages").children(
          h.button.attr("type", "button").disabled(page <= 1)
            .onClick(SearchPageMessage.make({ _tag: "PageChosen", page: page - 1 })).children("Previous"),
          h.span(`Page ${page} of ${results.pages}`),
          h.button.attr("type", "button").disabled(page >= results.pages)
            .onClick(SearchPageMessage.make({ _tag: "PageChosen", page: page + 1 })).children("Next")
        )
      )

    return h.section(
      h.h1("Search notes"),
      // The field's value is read from the query. The route changes in the
      // same render as the keystroke, so the field keeps what the user typed
      // and where the caret is. The browser Router writes the address bar at
      // most every 200 ms, to stay under the browsers' limits on history
      // calls.
      h.input.attr("type", "search").attr("aria-label", "Search").value(q ?? "")
        .onInput(({ value }) => SearchPageMessage.make({ _tag: "Typed", text: value })),
      h.select.attr("aria-label", "Order").value(sort)
        .onChange(({ value }) => SearchPageMessage.make({ _tag: "Sorted", sort: value === "desc" ? "desc" : "asc" }))
        .children(
          h.option.attr("value", "asc").children("A to Z"),
          h.option.attr("value", "desc").children("Z to A")
        ),
      AsyncResult.match(h.loaded.results, {
        // While a fetch waits or runs, `h.previous` holds the last results,
        // so the list stays on screen instead of flashing a loading state.
        onInitial: () =>
          Option.match(h.previous.results, {
            onNone: () => h.p("Searching…"),
            onSome: resultsView
          }),
        onFailure: () => h.p("The search failed."),
        onSuccess: ({ value }) => resultsView(value)
      })
    )
  }
})

// The page requires `PatchQuery` as well as its loader. `PatchQuery` is a
// navigation Command, which the Router Layer in the entry module provides
// with the others, so only the loader is provided here.
export const SearchPage = SearchPageNoDeps.pipe(
  Component.provide(SearchNotes.layer.pipe(Layer.provide(Notes.layerHttp)))
)
