import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Request, RequestResolver } from "effect"

interface Lookup extends Request.Request<number, string | { readonly message: string }> {
  readonly _tag: "Lookup"
  readonly id: number
}
const Lookup = Request.tagged<Lookup>("Lookup")

interface Healthy extends Request.Request<string> {
  readonly _tag: "Healthy"
  readonly id: number
}
const Healthy = Request.tagged<Healthy>("Healthy")

// Compare channel and original payload identity, not trace annotations on Cause.
const failureView = (exit: Exit.Exit<unknown, unknown>, payload: unknown) =>
  Exit.isFailure(exit)
    ? [
      exit._tag,
      exit.cause.reasons.map((reason) => [
        reason._tag,
        reason._tag === "Fail" ? reason.error === payload : reason._tag === "Die" && reason.defect === payload
      ])
    ]
    : [exit._tag, exit.value]

describe("fromEffectTagged failure Cause", () => {
  for (const constructor of ["tagged", "fromEffect"] as const) {
    for (const ids of [[1], [1, 2, 1]]) {
      for (const kind of ["string", "object", "defect"] as const) {
        it.effect(`${constructor} preserves ${kind} identity for ${ids.length} entries`, () =>
          Effect.gen(function*() {
            const payload = kind === "string" ? "missing" : { message: kind }
            const batches: Array<Array<number>> = []
            const fail = () => kind === "defect" ? Effect.die(payload) : Effect.fail(payload)
            const resolver = constructor === "tagged"
              ? RequestResolver.fromEffectTagged<Lookup>()({
                Lookup: (entries) => {
                  batches.push(entries.map((entry) => entry.request.id))
                  return fail()
                }
              })
              : RequestResolver.fromEffect<Lookup>((entry) => {
                batches.push([entry.request.id])
                return fail()
              })
            const exits = yield* Effect.forEach(
              ids,
              (id) => Effect.exit(Effect.request(Lookup({ id }), resolver)),
              { concurrency: "unbounded" }
            )

            assert.deepStrictEqual(batches, constructor === "tagged" ? [ids] : ids.map((id) => [id]))
            assert.strictEqual(exits.length, ids.length)
            assert.deepStrictEqual(
              exits.map((exit) => failureView(exit, payload)),
              ids.map(() => ["Failure", [[kind === "defect" ? "Die" : "Fail", true]]])
            )
          }))
      }
    }

    it.effect(`${constructor} keeps failures and successes isolated in one mixed-tag batch`, () =>
      Effect.gen(function*() {
        const payload = { message: "missing" }
        const batches: Array<Array<string>> = []
        const resolver = constructor === "tagged"
          ? RequestResolver.fromEffectTagged<Lookup | Healthy>()({
            Lookup: (entries) => {
              batches.push(entries.map((entry) => `Lookup:${entry.request.id}`))
              return Effect.fail(payload)
            },
            Healthy: (entries) => {
              batches.push(entries.map((entry) => `Healthy:${entry.request.id}`))
              return Effect.succeed(entries.map((entry) => `ok-${entry.request.id}`))
            }
          })
          : RequestResolver.fromEffect<Lookup | Healthy>((entry) => {
            batches.push([`${entry.request._tag}:${entry.request.id}`])
            return entry.request._tag === "Lookup"
              ? Effect.fail(payload)
              : Effect.succeed(`ok-${entry.request.id}`)
          })
        const requests = [Lookup({ id: 1 }), Healthy({ id: 20 }), Lookup({ id: 2 }), Healthy({ id: 30 })]
        // Capture each Exit before collecting: no failure can cancel a sibling.
        const exits = yield* Effect.forEach(
          requests,
          (request) => Effect.exit(Effect.request(request, resolver)),
          { concurrency: "unbounded" }
        )

        assert.deepStrictEqual(
          batches,
          constructor === "tagged"
            ? [["Lookup:1", "Lookup:2"], ["Healthy:20", "Healthy:30"]]
            : [["Lookup:1"], ["Healthy:20"], ["Lookup:2"], ["Healthy:30"]]
        )
        assert.strictEqual(exits.length, requests.length)
        assert.deepStrictEqual(exits.map((exit) => failureView(exit, payload)), [
          ["Failure", [["Fail", true]]],
          ["Success", "ok-20"],
          ["Failure", [["Fail", true]]],
          ["Success", "ok-30"]
        ])
      }))
  }
})
