/**
 * @since 4.0.0
 */

import { Console } from "node:console"
import { Writable } from "node:stream"
import { expect, test as vitest } from "vitest"

const methods = [
  "assert",
  "clear",
  "count",
  "countReset",
  "debug",
  "dir",
  "dirxml",
  "error",
  "group",
  "groupCollapsed",
  "groupEnd",
  "info",
  "log",
  "table",
  "time",
  "timeEnd",
  "timeLog",
  "trace",
  "warn"
] as const

const isWildcard = (line: string): boolean => /^<[^<>]+>$/.test(line)

const assert = async (
  run: () => unknown | PromiseLike<unknown>,
  expected: string
): Promise<void> => {
  const output: Array<string> = []
  const stream = new Writable({
    write(chunk, _, callback) {
      output.push(String(chunk))
      callback()
    }
  })

  const captured = new Console({ stdout: stream, stderr: stream, colorMode: false })
  // oxlint-disable-next-line no-console
  const target = console
  const descriptors = new Map(methods.map((method) => [method, Object.getOwnPropertyDescriptor(target, method)]))

  try {
    for (const method of methods) {
      Object.defineProperty(target, method, {
        configurable: true,
        enumerable: descriptors.get(method)?.enumerable ?? false,
        value: captured[method].bind(captured),
        writable: true
      })
    }

    await run()
  } finally {
    for (const method of methods) {
      const descriptor = descriptors.get(method)
      if (descriptor === undefined) {
        Reflect.deleteProperty(target, method)
      } else {
        Object.defineProperty(target, method, descriptor)
      }
    }
  }

  const actual = output.join("").replace(/\r?\n$/, "")
  const expectedLines = expected.split("\n")
  if (!expectedLines.some(isWildcard)) {
    expect(actual).toStrictEqual(expected)
    return
  }

  const actualLines = actual.split("\n")
  expect(actualLines.map((line, index) => isWildcard(expectedLines[index] ?? "") ? expectedLines[index] : line))
    .toStrictEqual(expectedLines)
}

/**
 * Registers a documentation snippet as a test, optionally asserting its complete console output.
 *
 * **Details**
 *
 * When `expected` is `undefined`, the snippet runs without intercepting the console.
 *
 * @category testing
 * @since 4.0.0
 */
export const test = (
  name: string,
  run: () => unknown | PromiseLike<unknown>,
  expected?: string
): void => {
  vitest(name, expected === undefined ? run : () => assert(run, expected))
}
