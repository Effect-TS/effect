// Where the CLI's output goes. Locally that is this process's stdout and stderr; for a run
// forwarded to `etest serve`, each request gets its own Output streamed back to its client.
import type * as EffectConsole from "effect/Console"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import { inspect } from "node:util"

export class Output extends Context.Service<Output, {
  readonly out: (text: string) => void
  readonly err: (text: string) => void
}>()("etest/cli/Output") {
  /**
   * This process's stdout and stderr. A closed stdout (e.g. `etest | head`) stops the
   * output, but not the run.
   */
  static readonly process = Layer.sync(Output)(() => {
    let stdoutClosed = false
    process.stdout.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPIPE") stdoutClosed = true
      else throw error
    })
    return {
      out: (text) => {
        if (!stdoutClosed) process.stdout.write(text)
      },
      err: (text) => {
        process.stderr.write(text)
      }
    }
  })
}

const format = (args: ReadonlyArray<unknown>) => args.map((a) => typeof a === "string" ? a : inspect(a)).join(" ")

/** A `Console` that writes through `output`, so effect/cli's own messages follow it too. */
export const consoleFor = (output: Output["Service"]): EffectConsole.Console => {
  const out = (...args: ReadonlyArray<unknown>) => output.out(format(args) + "\n")
  const err = (...args: ReadonlyArray<unknown>) => output.err(format(args) + "\n")
  const ignore = () => {}
  return {
    assert: (condition, ...args) => {
      if (!condition) err("Assertion failed:", ...args)
    },
    clear: ignore,
    count: ignore,
    countReset: ignore,
    debug: out,
    dir: (item) => out(item),
    dirxml: out,
    error: err,
    group: out,
    groupCollapsed: out,
    groupEnd: ignore,
    info: out,
    log: out,
    table: (data) => out(data),
    time: ignore,
    timeEnd: ignore,
    timeLog: ignore,
    trace: err,
    warn: err
  }
}
