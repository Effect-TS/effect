import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { Strict, StrictURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [StrictURI]: {
      stricts: IntersectionLA<L, A, StrictURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface NewtypeConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [StrictURI]: {
      strict: InterfaceLA<Props, StrictURI>
    }
  }
  interface PartialConfig<Props> {
    [StrictURI]: {
      strict: InterfaceLA<Props, StrictURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [StrictURI]: {
      strict: InterfaceLA<Props, StrictURI>
      strictPartial: InterfaceLA<PropsPartial, StrictURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface ArrayConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface NullableConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface MutableConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface OptionalConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [StrictURI]: {
      left: Strict<EA>
      right: Strict<AA>
    }
  }
  interface OptionConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface PredicateConfig<E, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [StrictURI]: {
      stricts: TaggedUnionLA<Types, StrictURI>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [StrictURI]: {
      stricts: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? Strict<A>
          : never
      }
    }
  }
}
