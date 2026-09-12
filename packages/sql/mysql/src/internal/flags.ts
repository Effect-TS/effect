/**
 * Arithmetic for MySQL's bit flags.
 *
 * MySQL carries several of these — capabilities, column flags, server status —
 * and they are not interchangeable, so each is branded separately by the module
 * that owns it. The arithmetic lives here rather than at call sites: the
 * capability field is 32 bits wide, where `|` and `&` coerce to a signed
 * integer and quietly return the wrong answer for the two highest flags.
 *
 * @internal
 */
export const has = (self: number, flag: number): boolean => Math.floor(self / flag) % 2 === 1

/** @internal */
export const add = (self: number, flag: number): number => has(self, flag) ? self : self + flag

/** @internal */
export const of = (flags: Iterable<number>): number => {
  let total = 0
  for (const flag of flags) total = add(total, flag)
  return total
}

/** @internal */
export const retain = (self: number, flags: Iterable<number>): number => {
  let total = 0
  for (const flag of flags) if (has(self, flag)) total = add(total, flag)
  return total
}
