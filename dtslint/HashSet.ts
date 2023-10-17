import * as HashSet from "effect/HashSet"
import * as Predicate from "effect/Predicate"

declare const nss: HashSet.HashSet<number | string>

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (HashSet.every(nss, Predicate.isString)) {
  nss // $ExpectType HashSet<string>
}

if (HashSet.every(Predicate.isString)(nss)) {
  nss // $ExpectType HashSet<string>
}

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [HashSet<number>, HashSet<string>]
HashSet.partition(nss, Predicate.isString)

// $ExpectType [HashSet<number>, HashSet<string>]
nss.pipe(HashSet.partition(Predicate.isString))
