export const TraceElementSym = Symbol.for("@effect/core/io/TraceElement")
export type TraceElementSym = typeof TraceElementSym

/**
 * @tsplus type effect/core/io/TraceElement
 */
export type TraceElement = NoLocation | SourceLocation

/**
 * @tsplus type effect/core/io/TraceElement.Ops
 */
export interface TraceElementOps {
  $: TraceElementAspects
}
export const TraceElement: TraceElementOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/TraceElement.Aspects
 */
export interface TraceElementAspects {}

export class NoLocation implements Equals {
  readonly _tag = "NoLocation"

  readonly [TraceElementSym]: TraceElementSym = TraceElementSym;

  [Hash.sym](): number {
    return Hash.string(this._tag)
  }

  [Equals.sym](u: unknown): boolean {
    return isTraceElement(u) && u._tag === "NoLocation"
  }
}

export class SourceLocation implements Equals {
  readonly _tag = "SourceLocation"

  readonly [TraceElementSym]: TraceElementSym = TraceElementSym

  constructor(
    readonly fileName: string,
    readonly lineNumber: number,
    readonly columnNumber: number
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.string(this.fileName),
        Hash.combine(Hash.number(this.lineNumber), Hash.number(this.columnNumber))
      )
    )
  }

  [Equals.sym](that: unknown): boolean {
    return isTraceElement(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

/**
 * @tsplus static effect/core/io/TraceElement.Ops isTraceElement
 */
export function isTraceElement(u: unknown): u is TraceElement {
  return typeof u === "object" && u != null && TraceElementSym in u
}

/**
 * @tsplus static effect/core/io/TraceElement.Ops empty
 */
export const empty: TraceElement = new NoLocation()

/**
 * @tsplus static effect/core/io/TraceElement.Ops __call
 */
export function sourceLocation(
  fileName: string,
  lineNumber: number,
  columnNumber: number
): TraceElement {
  return new SourceLocation(fileName, lineNumber, columnNumber)
}

const LOCATION_REGEX = /^(.*?):(\d*?):(\d*?)$/

/**
 * @tsplus static effect/core/io/TraceElement.Ops parse
 */
export function parse(trace?: string): TraceElement {
  if (trace) {
    const parts = trace.match(LOCATION_REGEX)
    if (parts) {
      const fileName: string = parts[1]!.trim()
      const lineNumber: number = Number.parseInt(parts[2]!)
      const columnNumber: number = Number.parseInt(parts[3]!)
      return sourceLocation(fileName, lineNumber, columnNumber)
    }
    return empty
  }
  return empty
}

/**
 * @tsplus getter effect/core/io/TraceElement stringify
 */
export function stringify(self: TraceElement): string {
  switch (self._tag) {
    case "NoLocation": {
      return ""
    }
    case "SourceLocation": {
      return `${self.fileName}:${self.lineNumber}:${self.columnNumber}`
    }
  }
}
