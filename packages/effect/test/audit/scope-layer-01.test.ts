import { assert, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

// packages/effect/src/Layer.ts:659 (buildWithMemoMap) calls `self.build` eagerly, so the
// child scope forked by `fromBuild` (Layer.ts:355) is shared by every execution of the
// returned Effect. Contract: resources acquired by a layer are released when the supplied
// scope closes (Layer.buildWithScope / "layers are not released early"), and Effect.retry
// re-executes the same Effect, so a successful retry must yield a live resource.
it.effect("retrying a buildWithMemoMap effect returns a live resource", () =>
  Effect.gen(function*() {
    const T = Context.Service<{ live: boolean }>("T")
    let attempts = 0
    const layer = Layer.effect(
      T,
      Effect.suspend(() =>
        ++attempts === 1
          ? Effect.fail("transient")
          : Effect.acquireRelease(Effect.succeed({ live: true }), (r) => Effect.sync(() => r.live = false))
      )
    )
    const owner = yield* Scope.make()
    const context = yield* Effect.retry(Layer.buildWithMemoMap(layer, Layer.makeMemoMapUnsafe(), owner), { times: 1 })
    assert.isTrue(Context.get(context, T).live)
    yield* Scope.close(owner, Exit.void)
  }))
