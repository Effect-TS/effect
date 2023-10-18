import * as List from "effect/List"
import * as Predicate from "effect/Predicate"

declare const nss: List.List<number | string>
declare const nonEmptynss: List.Cons<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (List.every(nss, Predicate.isString)) {
  nss // $ExpectType List<string>
}

if (List.every(Predicate.isString)(nss)) {
  nss // $ExpectType List<string>
}

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (List.some(nss, Predicate.isString)) {
  nss // $ExpectType Cons<string | number>
}

if (List.some(Predicate.isString)(nss)) {
  nss // $ExpectType Cons<string | number>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [List<number>, List<string>]
List.partition(nss, Predicate.isString)

// $ExpectType [List<number>, List<string>]
nss.pipe(List.partition(Predicate.isString))

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.append(nss, true)

// $ExpectType Cons<string | number | boolean>
List.append(true)(nss)

// -------------------------------------------------------------------------------------
// mapNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string>
List.mapNonEmpty(nonEmptynss, (s) => `${s}`)

// -------------------------------------------------------------------------------------
// appendAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nss, nonEmptynss)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nss)(nonEmptynss)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nonEmptynss, nss)

// $ExpectType Cons<string | number>
List.appendAllNonEmpty(nonEmptynss)(nss)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number | boolean>
List.prepend(nss, true)

// $ExpectType Cons<string | number | boolean>
List.prepend(true)(nss)

// -------------------------------------------------------------------------------------
// prependAllNonEmpty
// -------------------------------------------------------------------------------------

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nss, nonEmptynss)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nss)(nonEmptynss)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nonEmptynss, nss)

// $ExpectType Cons<string | number>
List.prependAllNonEmpty(nonEmptynss)(nss)
