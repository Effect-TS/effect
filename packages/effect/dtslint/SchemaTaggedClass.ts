import { Schema } from "effect"

// ---------------------------------------------
// Annotations as tuple
// ---------------------------------------------

// @ts-expect-error
export class Annotations extends Schema.TaggedClass<Annotations>()("Annotations", {
  id: Schema.Number
}, [
  undefined,
  undefined,
  {
    pretty: () =>
    (
      _x // $ExpectType { readonly _tag: "Annotations"; } & { readonly id: number; }
    ) => ""
  }
]) {}
