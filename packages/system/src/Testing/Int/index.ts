// ets_tracing: off

export interface IntBrand {
  readonly IntBrand: unique symbol
}

export type Int = number & IntBrand

export function Int(n: number): Int {
  if (!Number.isInteger(n)) {
    throw new Error("not an integer")
  }
  return n as Int
}
