import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { DecoderURI } from "../base"
import type { Validate } from "../common"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [DecoderURI]: {
      decoders: IntersectionLA<L, A, DecoderURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
  interface NewtypeConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [DecoderURI]: {
      decoder: InterfaceLA<Props, DecoderURI>
    }
  }
  interface PartialConfig<Props> {
    [DecoderURI]: {
      decoder: InterfaceLA<Props, DecoderURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [DecoderURI]: {
      decoder: InterfaceLA<Props, DecoderURI>
      decoderPartial: InterfaceLA<PropsPartial, DecoderURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface ArrayConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface NullableConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface MutableConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface OptionalConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [DecoderURI]: {
      left: Validate<EA>
      right: Validate<AA>
    }
  }
  interface OptionConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/Refined" {
  interface RefinedConfig<E, A, B> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface PredicateConfig<E, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [DecoderURI]: {
      decoders: TaggedUnionLA<Types, DecoderURI>
    }
  }
}
