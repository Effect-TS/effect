/**
 * @since 1.0.0
 */
import * as annotation from "@fp-ts/codec/Annotation"
import * as arbitrary from "@fp-ts/codec/Arbitrary"
import * as ast from "@fp-ts/codec/AST"
import * as codec from "@fp-ts/codec/Codec"
import * as decodeError from "@fp-ts/codec/DecodeError"
import * as decoder from "@fp-ts/codec/Decoder"
import * as encoder from "@fp-ts/codec/Encoder"
import * as guard from "@fp-ts/codec/Guard"
import * as jsonCodec from "@fp-ts/codec/JsonCodec"
import * as schema from "@fp-ts/codec/Schema"
import * as show from "@fp-ts/codec/Show"

// typeclass
import * as contravariantSchema from "@fp-ts/codec/typeclass/ContravariantSchema"
import * as covariantSchema from "@fp-ts/codec/typeclass/CovariantSchema"
import * as invariantSchema from "@fp-ts/codec/typeclass/InvariantSchema"
import * as ofSchema from "@fp-ts/codec/typeclass/OfSchema"

// data types
import * as any from "@fp-ts/codec/data/any"
import * as boolean from "@fp-ts/codec/data/boolean"
import * as json from "@fp-ts/codec/data/Json"
import * as never from "@fp-ts/codec/data/never"
import * as string from "@fp-ts/codec/data/string"
import * as unknown from "@fp-ts/codec/data/unknown"

// annotations
import * as maxLength from "@fp-ts/codec/annotation/MaxLength"
import * as minLength from "@fp-ts/codec/annotation/MinLength"

export {
  /**
   * @since 1.0.0
   */
  annotation,
  /**
   * @since 1.0.0
   */
  any,
  /**
   * @since 1.0.0
   */
  arbitrary,
  /**
   * @since 1.0.0
   */
  ast,
  /**
   * @since 1.0.0
   */
  boolean,
  /**
   * @since 1.0.0
   */
  codec,
  /**
   * @since 1.0.0
   */
  contravariantSchema,
  /**
   * @since 1.0.0
   */
  covariantSchema,
  /**
   * @since 1.0.0
   */
  decodeError,
  /**
   * @since 1.0.0
   */
  decoder,
  /**
   * @since 1.0.0
   */
  encoder,
  /**
   * @since 1.0.0
   */
  guard,
  /**
   * @since 1.0.0
   */
  invariantSchema,
  /**
   * @since 1.0.0
   */
  json,
  /**
   * @since 1.0.0
   */
  jsonCodec,
  /**
   * @since 1.0.0
   */
  maxLength,
  /**
   * @since 1.0.0
   */
  minLength,
  /**
   * @since 1.0.0
   */
  never,
  /**
   * @since 1.0.0
   */
  ofSchema,
  /**
   * @since 1.0.0
   */
  schema,
  /**
   * @since 1.0.0
   */
  show,
  /**
   * @since 1.0.0
   */
  string,
  /**
   * @since 1.0.0
   */
  unknown
}
