/**
 * The generator config for the ai-docs examples. Run `graphqlgen` from this
 * directory, or `graphqlgen --config <path to this file>` from anywhere else.
 */
import { defineConfig } from "@effect/graphql-generator/Config"

export default defineConfig({
  // An SDL file; an introspection `.json` file works the same way. The shared
  // module is written next to it as `github.graphql.ts`.
  schema: "./github/github.graphql",
  // Each matched `foo.graphql` gets a `foo.graphql.ts` next to it. The schema
  // file is never treated as a document, even when a glob matches it.
  documents: ["github/**/*.graphql"],
  // One Schema codec per custom scalar, as `"<module>#<export>"`. Relative
  // modules resolve against this file; bare ones are imported as written.
  scalars: {
    DateTime: "effect/Schema#DateTimeUtcFromString",
    URI: "effect/Schema#URLFromString"
  }
})
