import { Effect, Schema } from "effect"
import { Route } from "effect/ui"
import { NoteSort } from "./notes/domain/Note.ts"

// A route union is a `Schema.TaggedUnion` with a parser and a printer that
// agree. Params and query are decoded through their Schemas, and `/*` is the
// catch-all. Always build URLs with `print`, never by hand. `printPath`
// prints the path alone, without the query.
//
// The routes have their own file. Pages build links from them and `App`
// imports the pages, so routes kept in `App.ts` would be an import cycle.
//
// The folders under `pages/` follow these paths. A page is in the folder
// named by the static segments of its path.
export const AppRoute = Route.union({
  Index: Route.make("/"),
  // An optional or defaulted query field decodes leniently: a value that
  // fails, such as `?page=abc`, is treated as absent and the Router removes
  // it from the URL. A field with `Schema.withDecodingDefaultKey` has a plain
  // type, so `page` is a `number` that is 1 when the URL leaves it out.
  // `make` fills in the defaults, and `print` leaves out a param that holds
  // its default, so a URL never carries `?page=1`.
  Search: Route.make("/search", {
    query: {
      q: Schema.optional(Schema.String),
      page: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).pipe(
        Schema.withDecodingDefaultKey(Effect.succeed(1))
      ),
      sort: NoteSort.pipe(Schema.withDecodingDefaultKey(Effect.succeed("asc" as const)))
    }
  }),
  Note: Route.make("/notes/:id", { params: { id: Schema.String } }),
  NotFound: Route.make("/*")
})
