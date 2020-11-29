/**
 * tracing: off
 */
import * as fs from "fs"
import * as path from "path"

import * as A from "../Array"
import * as L from "../List"
import * as S from "../Sync"
import { prettyFiberId } from "./id"
import type { Trace } from "./tracing"
import { prettyLocation } from "./tracing"

export const nodeTracer = (trace: Trace) => prettyTraceNode(trace, (_, __) => __)

export function prettyTraceNode(
  trace: Trace,
  adapt: (mod: string, path: string) => string
): string {
  return S.run(prettyTraceNodeSafe(trace, adapt))
}

export function prettyTraceNodeSafe(
  trace: Trace,
  adapt: (mod: string, path: string) => string
): S.UIO<string> {
  return S.gen(function* ($) {
    const execTrace = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          "",
          ...L.toArray(L.map_(trace.executionTrace, (a) => `  ${prettyLocation(a)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          "",
          ...L.toArray(
            L.map_(
              trace.stackTrace,
              (e) => `  a future continuation at ${prettyLocation(e)}`
            )
          )
        ]
      : [
          `Fiber: ${prettyFiberId(
            trace.fiberId
          )} was supposed to continue to: <empty trace>`
        ]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === "None"
        ? [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [
            `Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:\n`,
            yield* $(prettyTraceNodeSafe(parent.value, adapt))
          ]

    const firstFailure = L.first(trace.executionTrace)

    try {
      if (
        firstFailure._tag === "Some" &&
        firstFailure.value._tag === "SourceLocation"
      ) {
        const isModule = firstFailure.value.location.match(
          /\((.*)\): (.*):(\d+):(\d+):(.*)/
        )

        if (isModule) {
          const [, mod, file, line_, col] = isModule
          const line = parseInt(line_)
          const modulePath = require.resolve(`${mod}/package.json`)
          const realPath = adapt(mod, path.join(modulePath, "..", file))
          const lines = fs.readFileSync(realPath).toString("utf-8").split("\n")

          if (lines.length > line + 6 && line > 3) {
            return [
              "",
              `${realPath}:${line}:${col}`,
              "",
              lines[line - 2],
              lines[line - 1],
              `${A.range(0, parseInt(col) - 1)
                .map(() => " ")
                .join("")}^^^`,
              lines[line],
              lines[line + 1],
              "",
              ...stackPrint,
              "",
              ...execPrint,
              "",
              ...ancestry
            ].join("\n")
          }

          return ["", ...stackPrint, "", ...execPrint, "", ...ancestry].join("\n")
        }
      }
    } catch {
      //
    }

    return ["", ...stackPrint, "", ...execPrint, "", ...ancestry].join("\n")
  })
}
