/**
 * @since 2.5.0
 */
export interface Spanned<I, R> {
  readonly init: ReadonlyArray<I>
  readonly rest: ReadonlyArray<R>
}
