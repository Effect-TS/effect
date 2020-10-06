import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Internal/Config"
import type { Encoder, EncoderURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [EncoderURI]: {
      encoders: IntersectionLA<L, A, EncoderURI>
    }
  }
}

declare module "../../Algebra/newtype" {
  interface IsoConfig<L, A, N> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface PrismConfig<L, A, N> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/object" {
  interface InterfaceConfig<Props> {
    [EncoderURI]: {
      encoder: InterfaceLA<Props, EncoderURI>
    }
  }
  interface PartialConfig<Props> {
    [EncoderURI]: {
      encoder: InterfaceLA<Props, EncoderURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [EncoderURI]: {
      encoder: InterfaceLA<Props, EncoderURI>
      encoderPartial: InterfaceLA<PropsPartial, EncoderURI>
    }
  }
}

declare module "../../Algebra/primitives" {
  interface UnknownEConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface NonEmptyArrayConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface ArrayConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface NullableConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface MutableConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface OptionalConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [EncoderURI]: {
      left: Encoder<EA, EE>
      right: Encoder<AA, AE>
    }
  }
  interface OptionConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [EncoderURI]: {
      encoder: Encoder<A, E>
    }
  }
  interface PredicateConfig<E, A> {
    [EncoderURI]: {
      encoder: Encoder<A, E>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [EncoderURI]: {
      encoders: TaggedUnionLA<Types, EncoderURI>
    }
  }
}
