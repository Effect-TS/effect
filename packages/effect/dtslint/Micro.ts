import { hole, Micro } from "effect"

// -------------------------------------------------------------------------------------
// catchCauseIf
// -------------------------------------------------------------------------------------

// $ExpectType Micro<number | Date, number | boolean, "a" | "b">
hole<Micro.Micro<number, string | number, "a">>().pipe(Micro.catchCauseIf(
  (cause): cause is Micro.MicroCause<string> => true,
  (
    _cause // $ExpectType MicroCause<string>
  ) => hole<Micro.Micro<Date, boolean, "b">>()
))

// $ExpectType Micro<number | Date, number | boolean, "a" | "b">
Micro.catchCauseIf(
  hole<Micro.Micro<number, string | number, "a">>(),
  (cause): cause is Micro.MicroCause<string> => true,
  (
    _cause // $ExpectType MicroCause<string>
  ) => hole<Micro.Micro<Date, boolean, "b">>()
)
