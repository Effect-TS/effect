import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import { SpikeError } from "./Errors.ts"

/**
 * Append-only findings log plus the secret registry used to scrub every string
 * that leaves the harness (console output and the findings file).
 *
 * Secrets are registered by value once (token, OTP) and never stored; the
 * registry lives in memory for the lifetime of one command invocation.
 */
export class Findings extends Context.Service<Findings, {
  readonly file: string
  readonly addSecret: (secret: Redacted.Redacted<string>) => Effect.Effect<void>
  readonly redact: (text: string) => string
  readonly redactUnknown: (value: unknown) => unknown
  readonly record: (kind: string, data: unknown) => Effect.Effect<void, SpikeError>
  readonly readAll: Effect.Effect<ReadonlyArray<Record<string, unknown>>, SpikeError>
}>()("@effect/release-spike/Findings") {
  static readonly layer = (file: string): Layer.Layer<Findings, never, FileSystem.FileSystem | Path.Path> =>
    Layer.effect(
      Findings,
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const secrets = new Set<string>()

        const redact = (text: string): string => {
          let out = text
          for (const secret of secrets) {
            out = out.split(secret).join("[redacted]")
          }
          return out
        }

        const redactUnknown = (value: unknown): unknown => {
          if (typeof value === "string") return redact(value)
          if (Array.isArray(value)) return value.map(redactUnknown)
          if (value !== null && typeof value === "object") {
            return Object.fromEntries(
              Object.entries(value).map(([key, entry]) => [key, redactUnknown(entry)])
            )
          }
          return value
        }

        const record = Effect.fn("Findings.record")(function*(kind: string, data: unknown) {
          const at = DateTime.formatIso(yield* DateTime.now)
          const line = JSON.stringify({ at, kind, data: redactUnknown(data) })
          yield* fs.makeDirectory(path.dirname(file), { recursive: true }).pipe(
            Effect.andThen(fs.writeFileString(file, `${line}\n`, { flag: "a" })),
            Effect.mapError((cause) => new SpikeError({ message: `Could not append to ${file}`, cause }))
          )
        })

        const readAll = fs.exists(file).pipe(
          Effect.flatMap((exists) => exists ? fs.readFileString(file) : Effect.succeed("")),
          Effect.mapError((cause) => new SpikeError({ message: `Could not read ${file}`, cause })),
          Effect.map((content) =>
            content
              .split("\n")
              .filter((line) => line.trim() !== "")
              .map((line) => JSON.parse(line) as Record<string, unknown>)
          )
        )

        return Findings.of({
          file,
          addSecret: (secret) =>
            Effect.sync(() => {
              const value = Redacted.value(secret)
              if (value.length > 0) secrets.add(value)
            }),
          redact,
          redactUnknown,
          record,
          readAll
        })
      })
    )
}
