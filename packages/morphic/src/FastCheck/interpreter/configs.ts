import type { Arbitrary } from "fast-check"

import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { FastCheckURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [FastCheckURI]: {
      arbs: IntersectionLA<L, A, FastCheckURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface NewtypeConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [FastCheckURI]: {
      arbs: InterfaceLA<Props, FastCheckURI>
    }
  }
  interface PartialConfig<Props> {
    [FastCheckURI]: {
      arbs: InterfaceLA<Props, FastCheckURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [FastCheckURI]: {
      arbs: InterfaceLA<Props, FastCheckURI>
      arbsPartial: InterfaceLA<PropsPartial, FastCheckURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface ArrayConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface NullableConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface MutableConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface OptionalConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [FastCheckURI]: {
      left: Arbitrary<EA>
      right: Arbitrary<AA>
    }
  }
  interface OptionConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

declare module "../../Algebra/Recursive" {
  interface RecursiveConfig<L, A> {
    [FastCheckURI]: {
      getArb: () => Arbitrary<A>
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface PredicateConfig<E, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [FastCheckURI]: {
      arbs: TaggedUnionLA<Types, FastCheckURI>
    }
  }
}

declare module "../../Algebra/Unknown" {
  interface UnknownConfig {
    [FastCheckURI]: {
      arb: Arbitrary<unknown>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [FastCheckURI]: {
      arbs: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? Arbitrary<A>
          : never
      }
    }
  }
}

export {}
