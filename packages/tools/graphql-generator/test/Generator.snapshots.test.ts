/**
 * Byte-for-byte snapshots of the GitHub set and the hand-written
 * subscriptions set. The snapshot files under `test/generated/` are
 * typechecked by `pnpm check` and imported by the `Generator.runtime*` tests.
 * Run with `-u` to update them after an intended output change.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { generateGitHub, generateSubscriptions } from "./utils/generator.ts"

const sets = [
  {
    name: "github",
    generate: generateGitHub,
    from: "documents",
    files: ["fragments.graphql.ts", "issues.graphql.ts", "shared.graphql.ts", "timeline.graphql.ts"]
  },
  {
    name: "subscriptions",
    generate: generateSubscriptions,
    from: "subscriptions",
    files: ["rooms.graphql.ts", "shared.graphql.ts"]
  }
]

describe("Generator snapshots", () => {
  for (const set of sets) {
    it.effect(set.name, (ctx) =>
      Effect.gen(function*() {
        const generated = yield* set.generate
        assert.deepStrictEqual(generated.result.diagnostics, [])
        assert.deepStrictEqual(generated.paths, set.files.map((name) => `${set.from}/${name}`))
        for (const name of set.files) {
          yield* Effect.promise(() =>
            ctx.expect(generated.file(`${set.from}/${name}`)).toMatchFileSnapshot(`./generated/${set.name}/${name}`)
          )
        }
      }).pipe(Effect.provide(NodeServices.layer)))
  }
})
