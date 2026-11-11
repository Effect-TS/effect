import { Schema } from "effect"
import { Route } from "effect/ui"

// A route union is a `Schema.TaggedUnion` with a parser and a printer that
// agree. Params and query are decoded through their Schemas, and `/*` is the
// catch-all. Always build URLs with `print`, never by hand.
//
// The routes have their own file. Pages build links from them and `App`
// imports the pages, so routes kept in `App.ts` would be an import cycle.
export const AppRoute = Route.union({
  Index: Route.make("/"),
  Note: Route.make("/notes/:id", { params: { id: Schema.String } }),
  NotFound: Route.make("/*")
})
