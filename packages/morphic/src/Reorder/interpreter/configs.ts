import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { Reorder, ReorderURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [ReorderURI]: {
      reorders: IntersectionLA<L, A, ReorderURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface NewtypeConfig<L, A, N> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [ReorderURI]: {
      reorder: InterfaceLA<Props, ReorderURI>
    }
  }
  interface PartialConfig<Props> {
    [ReorderURI]: {
      reorder: InterfaceLA<Props, ReorderURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [ReorderURI]: {
      reorder: InterfaceLA<Props, ReorderURI>
      reorderPartial: InterfaceLA<PropsPartial, ReorderURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface ArrayConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface NullableConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface MutableConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface OptionalConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ReorderURI]: {
      left: Reorder<EA>
      right: Reorder<AA>
    }
  }
  interface OptionConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
  interface PredicateConfig<E, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [ReorderURI]: {
      reorder: Reorder<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [ReorderURI]: {
      reorders: TaggedUnionLA<Types, ReorderURI>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [ReorderURI]: {
      reorders: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? Reorder<A>
          : never
      }
    }
  }
}
