import type * as E from "@effect-ts/core/Classic/Equal"

import type { InterfaceA, IntersectionA, TaggedUnionA } from "../..//Internal/Config"
import type { EqURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [EqURI]: {
      equals: IntersectionA<A, EqURI>
    }
  }
}

declare module "../../Algebra/newtype" {
  interface NewtypeConfig<L, A, N> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/object" {
  interface InterfaceConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, EqURI>
    }
  }
  interface PartialConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, EqURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [EqURI]: {
      eq: InterfaceA<Props, EqURI>
      eqPartial: InterfaceA<PropsPartial, EqURI>
    }
  }
}

declare module "../../Algebra/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface ArrayConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface NullableConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface MutableConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface OptionalConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [EqURI]: {
      left: E.Equal<EA>
      right: E.Equal<AA>
    }
  }
  interface OptionConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [EqURI]: {
      eq: E.Equal<A>
      eqRefined: E.Equal<B>
    }
  }
  interface PredicateConfig<E, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [EqURI]: {
      equals: TaggedUnionA<Types, EqURI>
    }
  }
}
