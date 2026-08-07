import { PgClient } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Pg from "pg"

it.effect("makeClient handles errors emitted while connecting", () =>
  Effect.gen(function*() {
    const originalConnect = Pg.Client.prototype.connect
    const originalEnd = Pg.Client.prototype.end
    let unhandled: unknown

    yield* Effect.acquireUseRelease(
      Effect.sync(() => {
        ;(Pg.Client.prototype as any).connect = function() {
          return new Promise<void>((resolve) => {
            queueMicrotask(() => {
              try {
                this.emit("error", new Error("connection failed"))
              } catch (error) {
                unhandled = error
              }
              resolve()
            })
          })
        }
        ;(Pg.Client.prototype as any).end = () => Promise.resolve()
      }),
      () =>
        PgClient.makeClient({ host: "localhost" }).pipe(
          Effect.scoped,
          Effect.provide(Reactivity.layer)
        ),
      () =>
        Effect.sync(() => {
          Pg.Client.prototype.connect = originalConnect
          Pg.Client.prototype.end = originalEnd
        })
    )

    assert.isUndefined(unhandled)
  }))
