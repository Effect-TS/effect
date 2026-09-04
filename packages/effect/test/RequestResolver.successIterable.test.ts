import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Request, RequestResolver } from "effect"

interface Double extends Request.Request<number> {
  readonly _tag: "Double"
  readonly value: number
}
const Double = Request.tagged<Double>("Double")

interface Label extends Request.Request<string> {
  readonly _tag: "Label"
  readonly value: number
}
const Label = Request.tagged<Label>("Label")

const represent = <A>(values: Array<A>, representation: "array" | "values" | "generator"): Iterable<A> => {
  switch (representation) {
    case "array":
      return values
    case "values":
      return values.values()
    case "generator":
      return (function*() {
        yield* values
      })()
  }
}

describe("fromEffectTagged success Iterable", () => {
  for (const constructor of ["tagged", "fromFunctionBatched"] as const) {
    for (const representation of ["array", "values", "generator"] as const) {
      for (const values of [[1], [1, 2, 3], [2, 2, 1]]) {
        it.effect(`${constructor} ${representation} preserves ${values.join(",")} in one batch`, () =>
          Effect.gen(function*() {
            const batches: Array<Array<number>> = []
            const resolve = (entries: Array<Request.Entry<Double>>) => {
              batches.push(entries.map((entry) => entry.request.value))
              return represent(entries.map((entry) => entry.request.value * 2), representation)
            }
            const resolver = constructor === "tagged"
              ? RequestResolver.fromEffectTagged<Double>()({ Double: (entries) => Effect.succeed(resolve(entries)) })
              : RequestResolver.fromFunctionBatched<Double>(resolve)
            const exits = yield* Effect.forEach(
              values,
              (value) => Effect.exit(Effect.request(Double({ value }), resolver)),
              { concurrency: "unbounded" }
            )

            assert.deepStrictEqual(batches, [values])
            assert.strictEqual(exits.length, values.length)
            assert.deepStrictEqual(exits, values.map((value) => Exit.succeed(value * 2)))
          }))
      }

      it.effect(`${constructor} ${representation} preserves mixed-tag types and order`, () =>
        Effect.gen(function*() {
          const batches: Array<Array<string>> = []
          const resolver = constructor === "tagged"
            ? RequestResolver.fromEffectTagged<Double | Label>()({
              Double: (entries) => {
                batches.push(entries.map((entry) => `Double:${entry.request.value}`))
                return Effect.succeed(represent(entries.map((entry) => entry.request.value * 2), representation))
              },
              Label: (entries) => {
                batches.push(entries.map((entry) => `Label:${entry.request.value}`))
                return Effect.succeed(represent(entries.map((entry) => `label-${entry.request.value}`), representation))
              }
            })
            : RequestResolver.fromFunctionBatched<Double | Label>((entries) => {
              batches.push(entries.map((entry) => `${entry.request._tag}:${entry.request.value}`))
              return represent(
                entries.map((entry) =>
                  entry.request._tag === "Double" ? entry.request.value * 2 : `label-${entry.request.value}`
                ),
                representation
              )
            })
          const requests = [Double({ value: 2 }), Label({ value: 3 }), Double({ value: 2 }), Label({ value: 1 })]
          const exits = yield* Effect.forEach(
            requests,
            (request) => Effect.exit(Effect.request(request, resolver)),
            { concurrency: "unbounded" }
          )

          assert.deepStrictEqual(
            batches,
            constructor === "tagged"
              ? [["Double:2", "Double:2"], ["Label:3", "Label:1"]]
              : [["Double:2", "Label:3", "Double:2", "Label:1"]]
          )
          assert.strictEqual(exits.length, requests.length)
          assert.deepStrictEqual(exits, [
            Exit.succeed(4),
            Exit.succeed("label-3"),
            Exit.succeed(4),
            Exit.succeed("label-1")
          ])
        }))
    }
  }
})
