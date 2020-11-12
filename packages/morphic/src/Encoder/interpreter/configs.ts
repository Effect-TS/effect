import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { HKT } from "../../HKT"
import type { Encoder, EncoderURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [EncoderURI]: {
      encoders: IntersectionLA<L, A, EncoderURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
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

declare module "../../Algebra/Object" {
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

declare module "../../Algebra/Primitives" {
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

declare module "../../Algebra/Refined" {
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

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [EncoderURI]: {
      encoder: Encoder<A, L>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [EncoderURI]: {
      encoders: TaggedUnionLA<Types, EncoderURI>
    }
  }
}

declare module "../../Algebra/Union" {
  interface UnionConfig<Types> {
    [EncoderURI]: {
      encoders: {
        [k in keyof Types]: Types[k] extends HKT<any, infer E, infer A>
          ? Encoder<A, E>
          : never
      }
    }
  }
}
