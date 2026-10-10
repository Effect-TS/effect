/**
 * Byte-for-byte snapshots of the GitHub set. The snapshot files under
 * `test/generated/github/` are typechecked by `pnpm check` and imported by
 * `Generator.runtime.test.ts`. Run with `-u` to update them after an
 * intended output change.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { assertNoErrors, generateGitHub } from "./utils/generator.ts"

describe("Generator GitHub snapshots", () => {
  for (const name of ["fragments.graphql.ts", "issues.graphql.ts", "shared.graphql.ts"]) {
    it.effect(name, (ctx) =>
      Effect.gen(function*() {
        const generated = yield* generateGitHub
        assertNoErrors(generated)
        assert.include(generated.paths, `documents/${name}`)
        yield* Effect.promise(() =>
          ctx.expect(generated.file(`documents/${name}`)).toMatchFileSnapshot(`./generated/github/${name}`)
        )
      }).pipe(Effect.provide(NodeServices.layer)))
  }
})
