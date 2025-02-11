import * as S from "effect/Schema"

class TRA extends S.TaggedRequest<TRA>()("TRA", {
  failure: S.String,
  success: S.Number,
  payload: {
    id: S.Number
  }
}) {}

// $ExpectType { readonly _tag: tag<"TRA">; readonly id: typeof Number$; }
TRA.fields

// $ExpectType "TRA"
TRA._tag

// $ExpectType typeof Number$
TRA.success

// $ExpectType typeof String$
TRA.failure

// ---------------------------------------------
// Annotations as tuple
// ---------------------------------------------

// @ts-expect-error
export class Annotations extends S.TaggedRequest<Annotations>()("Annotations", {
  failure: S.String,
  success: S.Number,
  payload: {
    id: S.Number
  }
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
