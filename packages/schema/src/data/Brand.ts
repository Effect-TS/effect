/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/core/Function"
import * as B from "@fp-ts/data/Brand"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const brand = <C extends B.Brand<string>>(
  constructor: B.Brand.Constructor<C>,
  annotationOptions?: S.AnnotationOptions<B.Brand.Unbranded<C>>
) =>
  <A extends B.Brand.Unbranded<C>>(self: S.Schema<A>): S.Schema<A & C> =>
    B.isNominal(constructor) ?
      self as S.Schema<A & C> :
      pipe(
        self,
        I.filter<A, A & C>(
          (x): x is A & C => constructor.refine(x),
          annotationOptions
        )
      )
