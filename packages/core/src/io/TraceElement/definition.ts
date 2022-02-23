import * as St from "../../prelude/Structural"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const TraceElementSym = Symbol.for("@effect-ts/core/io/TraceElement")
export type TraceElementSym = typeof TraceElementSym

/**
 * @tsplus type ets/TraceElement
 */
export type TraceElement = NoLocation | SourceLocation

/**
 * @tsplus type ets/TraceElementOps
 */
export interface TraceElementOps {}
export const TraceElement: TraceElementOps = {}

export class NoLocation implements St.HasHash, St.HasEquals {
  readonly [TraceElementSym]: TraceElementSym = TraceElementSym
  readonly _tag = "NoLocation"

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](u: unknown): boolean {
    return isTraceElement(u) && u._tag === "NoLocation"
  }
}

export class SourceLocation implements St.HasHash, St.HasEquals {
  readonly [TraceElementSym]: TraceElementSym = TraceElementSym
  readonly _tag = "SourceLocation"

  constructor(
    readonly fileName: string,
    readonly lineNumber: number,
    readonly columnNumber: number
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashString(this.fileName),
        St.combineHash(St.hashNumber(this.lineNumber), St.hashNumber(this.columnNumber))
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isTraceElement(that) && this[St.hashSym] === that[St.hashSym]
  }
}

/**
 * @tsplus static ets/TraceElementOps isTraceElement
 */
export function isTraceElement(u: unknown): u is TraceElement {
  return typeof u === "object" && u != null && TraceElementSym in u
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/TraceElementOps empty
 */
export const empty: TraceElement = new NoLocation()

/**
 * @tsplus static ets/TraceElementOps __call
 */
export function sourceLocation(
  fileName: string,
  lineNumber: number,
  columnNumber: number
): TraceElement {
  return new SourceLocation(fileName, lineNumber, columnNumber)
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

const LOCATION_REGEX = /^(.*?):(\d*?):(\d*?)$/

/**
 * @tsplus static ets/TraceElementOps parse
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
 * @tsplus fluent ets/TraceElement stringify
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
