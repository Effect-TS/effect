import * as _ from "./index";
import { Option, fromNullable } from "fp-ts/lib/Option";

/**
 * Implements a basic FIFO list
 */

export interface NonEmptyList<A> {
  first: Node<A>;
  last: Node<A>;
}
export interface List<A> {
  first: null | Node<A>;
  last: null | Node<A>;
}

interface Node<A> {
  a: A;
  prev: Node<A>;
  next: Node<A>;
}

function singleNode<A>(a: A): Node<A> {
  const l: Node<A> = { a, prev: null, next: null } as any;
  l.prev = l;
  l.next = l;
  return l;
}

/**
 * Push an Elem at the end of the List
 */
export function push<A>(list: List<A>, a: A) {
  if (isNotEmpty(list)) {
    const last = list.last;
    const first = list.first;
    const newLast: Node<A> = { a, next: first, prev: last };
    last.next = newLast;
    first.prev = newLast;
    list.last = newLast;
  } else {
    const l = singleNode(a);
    list.first = l;
    list.last = l;
  }
}

/**
 * Creates an empty List
 */
export function empty<A>(): List<A> {
  return { first: null, last: null };
}

/**
 * Indicates if a List is a singleton
 */
function isSingleton<A>(list: List<A>): boolean {
  return list.first === list.last && isNotEmpty(list);
}
/**
 * Indicates if a List is not empty
 */
export function isNotEmpty<A>(list: List<A>): list is NonEmptyList<A> {
  return list.first !== null;
}
/**
 * Pops the last element of a List (A | null)
 */
export function popUnsafe<A>(list: List<A>): A | null {
  const first = list.first;
  if (first) {
    if (isSingleton(list)) {
      list.first = null;
      list.last = null;
    } else {
      first.next.prev = first.prev;
      first.prev.next = first.next;
      list.first = first.next;
    }
    return first.a;
  } else {
    return null;
  }
}

/**
 * Pops the last element of a List Option<A>
 */
export function pop<A>(list: List<A>): Option<A> {
  return fromNullable(popUnsafe(list));
}
/**
 * Gets the first element of the List as Option<A> (does not change the List)
 */

export function headUnsafe<A>(list: List<A>): A | null {
  return list.first !== null ? list.first.a : null;
}
/**
 * Gets the first element of the List as Option<A> (does not change the List)
 */
export function head<A>(list: List<A>): Option<A> {
  return fromNullable(headUnsafe(list));
}
/**
 * Gets the last element of the List as A | null (does not change the List)
 */
export function lastUnsafe<A>(list: List<A>): A | null {
  return list.last !== null ? list.last.a : null;
}
/**
 * Gets the last element of the List as Option<A> (does not change the List)
 */
export function last<A>(list: List<A>): Option<A> {
  return fromNullable(lastUnsafe(list));
}
