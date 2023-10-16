import * as Predicate from "effect/Predicate"
import * as SortedSet from "effect/SortedSet"

declare const nss: SortedSet.SortedSet<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (SortedSet.every(nss, Predicate.isString)) {
  nss // $ExpectType SortedSet<string>
}

if (SortedSet.every(Predicate.isString)(nss)) {
  nss // $ExpectType SortedSet<string>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [SortedSet<number>, SortedSet<string>]
SortedSet.partition(nss, Predicate.isString)

// $ExpectType [SortedSet<number>, SortedSet<string>]
nss.pipe(SortedSet.partition(Predicate.isString))
