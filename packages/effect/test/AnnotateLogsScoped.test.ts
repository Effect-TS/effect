import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Logger, References, Scope } from "effect"

interface Snapshot {
  readonly stage: string
  readonly annotations: Record<string, unknown>
}

const neighbor = { synthetic: "neighbor" }
const original = { synthetic: "original" }
const scopedObject = { synthetic: "scoped" }
const initial = { neighbor, unchanged: "keep" }

const forms: Array<{
  readonly name: string
  readonly annotate: (value: unknown) => Effect.Effect<void, never, Scope.Scope>
}> = [
  { name: "key/value", annotate: (value) => Effect.annotateLogsScoped("measurement", value) },
  { name: "record", annotate: (value) => Effect.annotateLogsScoped({ measurement: value }) }
]

const capture = <A, E, R>(
  body: Effect.Effect<A, E, R>,
  snapshots: Array<Snapshot>,
  annotations: Record<string, unknown>
) =>
  body.pipe(
    Effect.annotateLogs(annotations),
    Effect.provideService(
      Logger.CurrentLoggers,
      new Set([Logger.make<unknown, void>(({ fiber, message }) => {
        snapshots.push({
          stage: String(Array.isArray(message) ? message[0] : message),
          annotations: { ...fiber.getRef(References.CurrentLogAnnotations) }
        })
      })])
    )
  )

const manual = (
  annotate: Effect.Effect<void, never, Scope.Scope>,
  annotations: Record<string, unknown>
) =>
  Effect.gen(function*() {
    const snapshots: Array<Snapshot> = []
    const scope = yield* Scope.make()
    yield* capture(
      Effect.gen(function*() {
        yield* Effect.logInfo("before")
        yield* annotate
        yield* Effect.logInfo("inside")
        yield* Scope.close(scope, Exit.void)
        // Observe the local finalizer before Scope.provide restores its context.
        yield* Effect.logInfo("after close")
      }).pipe(Scope.provide(scope), Effect.ensuring(Scope.close(scope, Exit.void))),
      snapshots,
      annotations
    )
    return snapshots
  })

const replaced = (
  annotate: Effect.Effect<void, never, Scope.Scope>,
  replacement: unknown
) =>
  Effect.gen(function*() {
    const snapshots: Array<Snapshot> = []
    const scope = yield* Scope.make()
    yield* capture(
      Effect.gen(function*() {
        yield* Effect.logInfo("before")
        yield* annotate
        yield* Effect.logInfo("inside")
        yield* Effect.gen(function*() {
          yield* Effect.logInfo("replacement")
          yield* Scope.close(scope, Exit.void)
          yield* Effect.logInfo("after close")
        }).pipe(Effect.annotateLogs("measurement", replacement))
      }).pipe(Scope.provide(scope), Effect.ensuring(Scope.close(scope, Exit.void))),
      snapshots,
      { ...initial, measurement: original }
    )
    return snapshots
  })

describe("annotateLogsScoped caller-managed scope", () => {
  for (const { annotate, name } of forms) {
    describe(name, () => {
      const values: Array<{ readonly name: string; readonly value: unknown }> = [
        { name: "NaN", value: NaN },
        { name: "number", value: 7 },
        { name: "string", value: "synthetic" },
        { name: "undefined", value: undefined },
        { name: "object", value: scopedObject },
        { name: "positive zero", value: +0 },
        { name: "negative zero", value: -0 }
      ]
      for (const { name: valueName, value } of values) {
        for (const present of [false, true]) {
          it.effect(`${valueName} restores ${present ? "existing value" : "absent key"}`, () =>
            Effect.gen(function*() {
              const before = present ? { ...initial, measurement: original } : initial
              const snapshots = yield* manual(annotate(value), before)
              assert.deepStrictEqual(snapshots, [
                { stage: "before", annotations: before },
                { stage: "inside", annotations: { ...before, measurement: value } },
                { stage: "after close", annotations: before }
              ])
            }))
        }
      }

      it.effect("restores a previous NaN after an ordinary number", () =>
        Effect.gen(function*() {
          const before = { ...initial, measurement: NaN }
          const snapshots = yield* manual(annotate(7), before)
          assert.deepStrictEqual(snapshots, [
            { stage: "before", annotations: before },
            { stage: "inside", annotations: { ...before, measurement: 7 } },
            { stage: "after close", annotations: before }
          ])
        }))

      it.effect("preserves previous and scoped object identities", () =>
        Effect.gen(function*() {
          const snapshots = yield* manual(annotate(scopedObject), { ...initial, measurement: original })
          assert.strictEqual(snapshots.length, 3)
          assert.strictEqual(snapshots[0].annotations.measurement, original)
          assert.strictEqual(snapshots[1].annotations.measurement, scopedObject)
          assert.strictEqual(snapshots[2].annotations.measurement, original)
          for (const snapshot of snapshots) {
            assert.strictEqual(snapshot.annotations.neighbor, neighbor)
          }
        }))

      const replacements: Array<{ readonly name: string; readonly value: unknown; readonly next: unknown }> = [
        { name: "different number", value: 7, next: 9 },
        { name: "different string", value: "first", next: "second" },
        { name: "NaN replaced by number", value: NaN, next: 9 },
        { name: "number replaced by NaN", value: 7, next: NaN },
        { name: "distinct equal-shaped object", value: scopedObject, next: { synthetic: "scoped" } }
      ]
      for (const { name: replacementName, next, value } of replacements) {
        it.effect(`retains ${replacementName}`, () =>
          Effect.gen(function*() {
            const snapshots = yield* replaced(annotate(value), next)
            assert.deepStrictEqual(snapshots, [
              { stage: "before", annotations: { ...initial, measurement: original } },
              { stage: "inside", annotations: { ...initial, measurement: value } },
              { stage: "replacement", annotations: { ...initial, measurement: next } },
              { stage: "after close", annotations: { ...initial, measurement: next } }
            ])
            // Deep equality alone would not distinguish equal-shaped objects.
            assert.strictEqual(Object.is(snapshots[3].annotations.measurement, next), true)
          }))
      }

      for (
        const { label, next, value } of [
          { label: "+0 to -0", value: +0, next: -0 },
          { label: "-0 to +0", value: -0, next: +0 }
        ]
      ) {
        it.effect(`keeps existing signed-zero equivalence: ${label}`, () =>
          Effect.gen(function*() {
            const snapshots = yield* replaced(annotate(value), next)
            assert.deepStrictEqual(snapshots, [
              { stage: "before", annotations: { ...initial, measurement: original } },
              { stage: "inside", annotations: { ...initial, measurement: value } },
              { stage: "replacement", annotations: { ...initial, measurement: next } },
              { stage: "after close", annotations: { ...initial, measurement: original } }
            ])
            assert.strictEqual(Object.is(snapshots[1].annotations.measurement, value), true)
            assert.strictEqual(Object.is(snapshots[2].annotations.measurement, next), true)
          }))
      }

      for (const { label, value } of [{ label: "number", value: 9 }, { label: "NaN", value: NaN }]) {
        it.effect(`restores nested ${label} scopes in close order`, () =>
          Effect.gen(function*() {
            const snapshots: Array<Snapshot> = []
            const outer = yield* Scope.make()
            const inner = yield* Scope.make()
            yield* capture(
              Effect.gen(function*() {
                yield* Effect.logInfo("before")
                yield* annotate(7)
                yield* Effect.logInfo("outer")
                yield* Effect.gen(function*() {
                  yield* annotate(value)
                  yield* Effect.logInfo("inner")
                  yield* Scope.close(inner, Exit.void)
                  yield* Effect.logInfo("after inner close")
                }).pipe(Scope.provide(inner))
                yield* Scope.close(outer, Exit.void)
                yield* Effect.logInfo("after outer close")
              }).pipe(
                Scope.provide(outer),
                Effect.ensuring(Scope.close(inner, Exit.void)),
                Effect.ensuring(Scope.close(outer, Exit.void))
              ),
              snapshots,
              initial
            )
            assert.deepStrictEqual(snapshots, [
              { stage: "before", annotations: initial },
              { stage: "outer", annotations: { ...initial, measurement: 7 } },
              { stage: "inner", annotations: { ...initial, measurement: value } },
              { stage: "after inner close", annotations: { ...initial, measurement: 7 } },
              { stage: "after outer close", annotations: initial }
            ])
          }))
      }

      it.effect("outer Effect.scoped is a non-discriminating NaN control", () =>
        Effect.gen(function*() {
          const snapshots: Array<Snapshot> = []
          yield* capture(
            Effect.gen(function*() {
              yield* Effect.logInfo("before")
              yield* Effect.scoped(Effect.gen(function*() {
                yield* annotate(NaN)
                yield* Effect.logInfo("inside")
              }))
              yield* Effect.logInfo("after scoped")
            }),
            snapshots,
            initial
          )
          assert.deepStrictEqual(snapshots, [
            { stage: "before", annotations: initial },
            { stage: "inside", annotations: { ...initial, measurement: NaN } },
            { stage: "after scoped", annotations: initial }
          ])
        }))
    })
  }

  it.effect("record restores mixed values independently", () =>
    Effect.gen(function*() {
      const values = { measurement: NaN, count: 7, missing: undefined, object: scopedObject }
      const snapshots = yield* manual(Effect.annotateLogsScoped(values), initial)
      assert.deepStrictEqual(snapshots, [
        { stage: "before", annotations: initial },
        { stage: "inside", annotations: { ...initial, ...values } },
        { stage: "after close", annotations: initial }
      ])
    }))
})
