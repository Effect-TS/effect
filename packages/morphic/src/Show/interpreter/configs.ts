import type * as S from "@effect-ts/core/Show"

import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { ShowURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [ShowURI]: {
      shows: IntersectionLA<L, A, ShowURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface IsoConfig<L, A, N> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [ShowURI]: {
      show: InterfaceLA<Props, ShowURI>
    }
  }
  interface PartialConfig<Props> {
    [ShowURI]: {
      show: InterfaceLA<Props, ShowURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [ShowURI]: {
      show: InterfaceLA<Props & PropsPartial, ShowURI>
      showPartial: InterfaceLA<PropsPartial, ShowURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface ArrayConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface NullableConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface MutableConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface OptionalConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ShowURI]: {
      left: S.Show<EA>
      right: S.Show<AA>
    }
  }
  interface OptionConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [ShowURI]: {
      show: S.Show<A>
      showRefined: S.Show<B>
    }
  }
  interface PredicateConfig<E, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [ShowURI]: {
      shows: TaggedUnionLA<Types, ShowURI>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [ShowURI]: {
      shows: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? S.Show<A>
          : never
      }
    }
  }
}
