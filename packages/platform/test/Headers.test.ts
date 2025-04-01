import * as Headers from "@effect/platform/Headers"
import { describe, it } from "@effect/vitest"
import { assertFalse, assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Effect, FiberId, FiberRef, FiberRefs, HashSet, Inspectable, Logger, Redacted } from "effect"

describe("Headers", () => {
  describe("Redactable", () => {
    it("one key", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const fiberRefs = FiberRefs.unsafeMake(
        new Map([
          [
            Headers.currentRedactedNames,
            [[FiberId.none, ["Authorization"]] as const]
          ] as const
        ])
      )
      const r = Inspectable.withRedactableContext(fiberRefs, () => Inspectable.toStringUnknown(headers))
      const redacted = JSON.parse(r)

      deepStrictEqual(redacted, {
        "content-type": "application/json",
        "authorization": "<redacted>",
        "x-api-key": "some-key"
      })
    })

    it("one key nested", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const fiberRefs = FiberRefs.unsafeMake(
        new Map([
          [
            Headers.currentRedactedNames,
            [[FiberId.none, ["Authorization"]] as const]
          ] as const
        ])
      )
      const r = Inspectable.withRedactableContext(fiberRefs, () => Inspectable.toStringUnknown({ headers }))
      const redacted = JSON.parse(r) as { headers: unknown }

      deepStrictEqual(redacted.headers, {
        "content-type": "application/json",
        "authorization": "<redacted>",
        "x-api-key": "some-key"
      })
    })

    it.effect("logs redacted", () =>
      Effect.gen(function*() {
        const messages: Array<string> = []
        const logger = Logger.stringLogger.pipe(
          Logger.map((msg) => {
            messages.push(msg)
          })
        )
        yield* FiberRef.update(FiberRef.currentLoggers, HashSet.add(logger))
        const headers = Headers.fromInput({
          "Content-Type": "application/json",
          "Authorization": "Bearer some-token",
          "X-Api-Key": "some-key"
        })
        yield* Effect.log(headers).pipe(
          Effect.annotateLogs({ headers })
        )
        assertInclude(messages[0], "application/json")
        assertFalse(messages[0].includes("some-token"))
        assertFalse(messages[0].includes("some-key"))
      }))

    it.effect("logs redacted structured", () =>
      Effect.gen(function*() {
        const messages: Array<any> = []
        const logger = Logger.structuredLogger.pipe(
          Logger.map((msg) => {
            messages.push(msg)
          })
        )
        yield* FiberRef.update(FiberRef.currentLoggers, HashSet.add(logger))
        const headers = Headers.fromInput({
          "Content-Type": "application/json",
          "Authorization": "Bearer some-token",
          "X-Api-Key": "some-key"
        })
        yield* Effect.log(headers).pipe(
          Effect.annotateLogs({ headers })
        )
        strictEqual(Redacted.isRedacted(messages[0].message.authorization), true)
        strictEqual(Redacted.isRedacted(messages[0].annotations.headers.authorization), true)
      }))
  })

  describe("redact", () => {
    it("one key", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const redacted = Headers.redact(headers, "Authorization")

      deepStrictEqual(redacted, {
        "content-type": "application/json",
        "authorization": Redacted.make("some secret"),
        "x-api-key": "some-key"
      })
      strictEqual(Redacted.value(redacted.authorization as Redacted.Redacted), "Bearer some-token")
    })

    it("multiple keys", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const redacted = Headers.redact(headers, ["Authorization", "authorization", "X-Api-Token", "x-api-key"])

      deepStrictEqual(redacted, {
        "content-type": "application/json",
        "authorization": Redacted.make("some secret"),
        "x-api-key": Redacted.make("some secret")
      })
      strictEqual(Redacted.value(redacted.authorization as Redacted.Redacted), "Bearer some-token")
      strictEqual(Redacted.value(redacted["x-api-key"] as Redacted.Redacted), "some-key")
    })

    it("RegExp", () => {
      const headers = Headers.fromInput({
        "Authorization": "Bearer some-token",
        "sec-ret": "some",
        "sec-ret-2": "some"
      })

      const redacted = Headers.redact(headers, [/^sec-/])

      deepStrictEqual(redacted, {
        "authorization": "Bearer some-token",
        "sec-ret": Redacted.make("some"),
        "sec-ret-2": Redacted.make("some")
      })
    })
  })

  describe("remove", () => {
    it("one key", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const removed = Headers.remove(headers, "Authorization")

      deepStrictEqual(
        removed,
        Headers.fromInput({
          "content-type": "application/json",
          "x-api-key": "some-key"
        })
      )
    })

    it("multiple keys", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const removed = Headers.remove(headers, ["Authorization", "authorization", "X-Api-Token", "x-api-key"])

      deepStrictEqual(
        removed,
        Headers.fromInput({
          "content-type": "application/json"
        })
      )
    })

    it("RegExp", () => {
      const headers = Headers.fromInput({
        "Authorization": "Bearer some-token",
        "sec-ret": "some",
        "sec-ret-2": "some"
      })

      const removed = Headers.remove(headers, [/^sec-/])

      deepStrictEqual(
        removed,
        Headers.fromInput({
          "authorization": "Bearer some-token"
        })
      )
    })
  })
})
