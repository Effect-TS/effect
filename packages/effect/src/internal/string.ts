// A UTF-16 surrogate without its pair. With the `u` flag, a pair matches as
// one code point, outside the class.
const loneSurrogate = /[\uD800-\uDFFF]/u

/**
 * Whether a string has no unpaired UTF-16 surrogates, so that it can be
 * written as Unicode text.
 *
 * **Details**
 *
 * Uses `String.prototype.isWellFormed` (ES2024) when the runtime has it, which
 * is much faster than a `u` regex on non-ASCII text, and the regex otherwise.
 *
 * @internal
 */
export const isWellFormed: (s: string) => boolean =
  typeof (String.prototype as { isWellFormed?: unknown }).isWellFormed === "function" ?
    (s) => (s as unknown as { isWellFormed(): boolean }).isWellFormed() :
    (s) => !loneSurrogate.test(s)
