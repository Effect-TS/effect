/**
 * The enum values of descriptors that the generator reads, by their names in
 * `descriptor.proto`, and the numbers of editions.
 */
import type { Edition, FeatureSet, FieldDescriptorProto, FileDescriptorProto } from "effect/protobuf/ProtobufDescriptor"

export type FieldType =
  | "double"
  | "float"
  | "int64"
  | "uint64"
  | "int32"
  | "fixed64"
  | "fixed32"
  | "bool"
  | "string"
  | "group"
  | "message"
  | "bytes"
  | "uint32"
  | "enum"
  | "sfixed32"
  | "sfixed64"
  | "sint32"
  | "sint64"

// `TYPE_INT32` → `int32`, `LABEL_REPEATED` → `repeated`, …
const suffix = (value: unknown, prefix: string): string | undefined =>
  typeof value === "string" && value.startsWith(prefix) ? value.slice(prefix.length).toLowerCase() : undefined

export const fieldType = (field: FieldDescriptorProto): FieldType | undefined =>
  suffix(field.type, "TYPE_") as FieldType | undefined

export const label = (field: FieldDescriptorProto): "optional" | "repeated" | "required" =>
  (suffix(field.label, "LABEL_") as "optional" | "repeated" | "required" | undefined) ?? "optional"

export const jsType = (field: FieldDescriptorProto): "normal" | "string" | "number" =>
  field.options?.jstype === "JS_STRING" ? "string" : field.options?.jstype === "JS_NUMBER" ? "number" : "normal"

/** The numbers of the editions, which are ordered, and their display names. */
const editions: Record<Edition, readonly [number: number, display: string]> = {
  EDITION_UNKNOWN: [0, "unknown"],
  EDITION_LEGACY: [900, "legacy"],
  EDITION_PROTO2: [998, "proto2"],
  EDITION_PROTO3: [999, "proto3"],
  EDITION_2023: [1000, "2023"],
  EDITION_2024: [1001, "2024"],
  EDITION_2026: [1002, "2026"],
  EDITION_UNSTABLE: [9999, "unstable"],
  EDITION_1_TEST_ONLY: [1, "1_TEST_ONLY"],
  EDITION_2_TEST_ONLY: [2, "2_TEST_ONLY"],
  EDITION_99997_TEST_ONLY: [99997, "99997_TEST_ONLY"],
  EDITION_99998_TEST_ONLY: [99998, "99998_TEST_ONLY"],
  EDITION_99999_TEST_ONLY: [99999, "99999_TEST_ONLY"],
  EDITION_MAX: [2147483647, "max"]
}

export const EDITION_PROTO2 = editions.EDITION_PROTO2[0]
export const EDITION_PROTO3 = editions.EDITION_PROTO3[0]
export const EDITION_2023 = editions.EDITION_2023[0]
export const EDITION_2024 = editions.EDITION_2024[0]

/** The edition of a file as a number; proto2 and proto3 files are their own editions. */
export const fileEdition = (file: FileDescriptorProto): number => {
  switch (file.syntax) {
    case undefined:
    case "":
    case "proto2":
      return EDITION_PROTO2
    case "proto3":
      return EDITION_PROTO3
    case "editions":
      return file.edition === undefined ? 0 : editions[file.edition][0]
    default:
      return 0
  }
}

/** A display name for an edition: `proto2`, `proto3`, `2023`, … */
export const editionName = (edition: number): string =>
  Object.values(editions).find(([n]) => n === edition)?.[1] ?? String(edition)

export type FieldPresence = "explicit" | "implicit" | "legacyRequired"
export type EnumType = "open" | "closed"
export type RepeatedFieldEncoding = "packed" | "expanded"
export type Utf8Validation = "verify" | "none"
export type MessageEncoding = "lengthPrefixed" | "delimited"

/** The features a `FeatureSet` sets; unset and unknown values are `undefined`. */
export const featureSet = (set: FeatureSet | undefined) => ({
  fieldPresence: pick(
    set?.fieldPresence,
    {
      EXPLICIT: "explicit",
      IMPLICIT: "implicit",
      LEGACY_REQUIRED: "legacyRequired"
    } as const
  ),
  enumType: pick(set?.enumType, { OPEN: "open", CLOSED: "closed" } as const),
  repeatedFieldEncoding: pick(set?.repeatedFieldEncoding, { PACKED: "packed", EXPANDED: "expanded" } as const),
  utf8Validation: pick(set?.utf8Validation, { VERIFY: "verify", NONE: "none" } as const),
  messageEncoding: pick(set?.messageEncoding, { LENGTH_PREFIXED: "lengthPrefixed", DELIMITED: "delimited" } as const)
})

// A value of a feature by its name in `descriptor.proto`; unset and unknown
// values are `undefined`.
const pick = <const A extends string>(value: unknown, known: Readonly<Record<string, A>>): A | undefined =>
  typeof value === "string" && Object.hasOwn(known, value) ? known[value] : undefined
