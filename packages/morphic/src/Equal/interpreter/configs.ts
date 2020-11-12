import type * as E from "@effect-ts/core/Classic/Equal"

import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { EqURI } from "../base"

declare module "../../Algebra/Intersection" {
  export interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [EqURI]: {
      equals: IntersectionLA<L, A, EqURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
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

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [EqURI]: {
      eq: InterfaceLA<Props, EqURI>
    }
  }
  interface PartialConfig<Props> {
    [EqURI]: {
      eq: InterfaceLA<Props, EqURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [EqURI]: {
      eq: InterfaceLA<Props, EqURI>
      eqPartial: InterfaceLA<PropsPartial, EqURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
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

declare module "../../Algebra/Refined" {
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

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [EqURI]: {
      eq: E.Equal<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [EqURI]: {
      equals: TaggedUnionLA<Types, EqURI>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [EqURI]: {
      equals: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? E.Equal<A>
          : never
      }
    }
  }
}
