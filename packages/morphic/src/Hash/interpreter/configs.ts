import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { Hash, HashURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [HashURI]: {
      hashs: IntersectionLA<L, A, HashURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface IsoConfig<L, A, N> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface PrismConfig<L, A, N> {
    [HashURI]: {
      hash: Hash
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [HashURI]: {
      hash: InterfaceLA<Props, HashURI>
    }
  }
  interface PartialConfig<Props> {
    [HashURI]: {
      hash: InterfaceLA<Props, HashURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [HashURI]: {
      hash: InterfaceLA<Props & PropsPartial, HashURI>
      hashPartial: InterfaceLA<PropsPartial, HashURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface ArrayConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface NullableConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface MutableConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface OptionalConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [HashURI]: {
      left: Hash
      right: Hash
    }
  }
  interface OptionConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [HashURI]: {
      hash: Hash
      hashRefined: Hash
    }
  }
  interface PredicateConfig<E, A> {
    [HashURI]: {
      hash: Hash
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [HashURI]: {
      hash: Hash
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [HashURI]: {
      hashs: TaggedUnionLA<Types, HashURI>
    }
  }
}
