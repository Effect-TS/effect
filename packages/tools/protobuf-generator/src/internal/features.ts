/**
 * Resolution of the editions features that change generated code.
 *
 * protoc and buf send `features` as written in the source, so a plugin
 * resolves them itself: the edition's defaults, overridden by the file, each
 * enclosing message, the oneof or enum, and the field. proto2 and proto3 files
 * are the editions `EDITION_PROTO2` and `EDITION_PROTO3`, with their legacy
 * syntax (`required`, groups, `[packed]`, proto3 `optional`) mapped to the
 * features it stands for.
 */
import type { FeatureSet, FieldDescriptorProto } from "effect/protobuf/ProtobufDescriptor"
import type { CodeGeneratorResponse } from "effect/protobuf/ProtobufPlugin"
import {
  EDITION_2024,
  EDITION_PROTO2,
  EDITION_PROTO3,
  type EnumType,
  featureSet,
  type FieldPresence,
  fieldType,
  label,
  type MessageEncoding,
  type RepeatedFieldEncoding,
  type Utf8Validation
} from "./descriptor.ts"

/** The resolved features that generated code depends on. */
export interface Features {
  readonly fieldPresence: FieldPresence
  readonly enumType: EnumType
  readonly repeatedFieldEncoding: RepeatedFieldEncoding
  readonly utf8Validation: Utf8Validation
  readonly messageEncoding: MessageEncoding
}

/** The oldest and newest editions the generator supports. */
export const MINIMUM_EDITION = EDITION_PROTO2
export const MAXIMUM_EDITION = EDITION_2024

/**
 * What every `CodeGeneratorResponse` declares: `FEATURE_PROTO3_OPTIONAL |
 * FEATURE_SUPPORTS_EDITIONS` of plugin.proto, and the supported editions.
 */
export const SUPPORTED = {
  supportedFeatures: BigInt(1 | 2),
  minimumEdition: MINIMUM_EDITION,
  maximumEdition: MAXIMUM_EDITION
} as const

/** A response that reports an error instead of files, which protoc and buf print. */
export const errorResponse = (error: string): CodeGeneratorResponse => ({ ...SUPPORTED, error, file: [] })

/** The defaults of an edition, from the `edition_defaults` in descriptor.proto. */
export const editionDefaults = (edition: number): Features =>
  edition === EDITION_PROTO2
    ? {
      fieldPresence: "explicit",
      enumType: "closed",
      repeatedFieldEncoding: "expanded",
      utf8Validation: "none",
      messageEncoding: "lengthPrefixed"
    }
    : edition === EDITION_PROTO3
    ? {
      fieldPresence: "implicit",
      enumType: "open",
      repeatedFieldEncoding: "packed",
      utf8Validation: "verify",
      messageEncoding: "lengthPrefixed"
    }
    : {
      fieldPresence: "explicit",
      enumType: "open",
      repeatedFieldEncoding: "packed",
      utf8Validation: "verify",
      messageEncoding: "lengthPrefixed"
    }

/** Overrides the features that a `FeatureSet` sets. */
export const mergeFeatures = (features: Features, set: FeatureSet | undefined): Features => {
  if (set === undefined) return features
  const overrides = featureSet(set)
  return {
    fieldPresence: overrides.fieldPresence ?? features.fieldPresence,
    enumType: overrides.enumType ?? features.enumType,
    repeatedFieldEncoding: overrides.repeatedFieldEncoding ?? features.repeatedFieldEncoding,
    utf8Validation: overrides.utf8Validation ?? features.utf8Validation,
    messageEncoding: overrides.messageEncoding ?? features.messageEncoding
  }
}

/** The features of a field, given the resolved features of its parent and the file's edition. */
export const fieldFeatures = (edition: number, parent: Features, field: FieldDescriptorProto): Features => {
  const features = mergeFeatures(parent, field.options?.features)
  if (edition !== EDITION_PROTO2 && edition !== EDITION_PROTO3) {
    return fieldType(field) === "group" ? { ...features, messageEncoding: "delimited" } : features
  }
  return {
    ...features,
    fieldPresence: label(field) === "required"
      ? "legacyRequired"
      : field.proto3Optional === true
      ? "explicit"
      : features.fieldPresence,
    repeatedFieldEncoding: field.options?.packed === true
      ? "packed"
      : field.options?.packed === false
      ? "expanded"
      : features.repeatedFieldEncoding,
    messageEncoding: fieldType(field) === "group" ? "delimited" : features.messageEncoding
  }
}
