## Typed GraphQL clients with `effect/graphql`

The experimental `effect/graphql` modules give you a typed GraphQL client built
on `HttpClient`, `Socket` and `Schema`. The usual flow:

1. Write operations in `.graphql` files and run `graphqlgen` from
   `@effect/graphql-generator`. It reads `graphql.config.ts`, checks every
   document against the schema, and writes a `.graphql.ts` module next to each
   `.graphql` file, plus one shared module for scalars, enums and input
   objects. Each module exports one operation value per definition and one
   group per file.
2. Merge the groups with `GraphQLGroup.merge` and build a client with
   `GraphQLClient.make`: one method per operation, returning an `Effect` for
   queries and mutations and a `Stream` for subscriptions.
3. Provide a transport: `GraphQLProtocol.layerHttp` (`POST`, plus graphql-sse
   subscriptions) or `GraphQLProtocol.layerWebSocket` (graphql-ws). Cross-cutting
   concerns such as auth are `GraphQLMiddleware` services attached to a group
   or an operation.

Paging uses `GraphQLClient.items` / `GraphQLClient.pages` and a nullable
`$after: String` variable. Any `errors` in a response fail the call with a
`GraphQLClientError`; pass `{ partial: true }` to get the decoded `data`
together with the errors instead.

### Batching

`effect/graphql` does not merge operations into one aliased document at
runtime. That would need a GraphQL parser at runtime, but the parser lives in
the generator and documents stay static. On GitHub, the options are, in order:

1. **Concurrent single queries** with `Effect.forEach` and a `concurrency`
   option. Each item keeps its own typed call and error, but costs rate limit:
   about N points for N queries, against about 1 point for one aliased
   document.
2. **`nodes(ids:)`** when an earlier query returned node IDs: up to 100 IDs per
   request, selecting fields with `... on PullRequest`. Call it with
   `{ partial: true }` so one unresolvable ID doesn't fail the batch, and match
   errors to items with `path[1]`.
3. **A hand-written document over the raw `GraphQLProtocol`**, with its own
   result Schema, as the escape hatch. Pass inputs as variables.

For an aliased document or a `nodes(ids:)` query, `partial: true` returns the
items that resolved alongside the errors for the rest. For paging that
tolerates errors, use `Stream.paginate` over the partial method instead of
`GraphQLClient.pages`, which fails on the first page with errors.

### Examples
