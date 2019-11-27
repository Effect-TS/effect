import * as _ from "./index";
import { Option, none, some } from "fp-ts/lib/Option";

export interface ListRoot<A> {
  first: List<A> | null;
  last: List<A> | null;
}

export interface List<A> {
  a: A;
  prev: List<A>;
  next: List<A>;
}

/**
 * Add an Elem at the end of the List
 * Return the new List head
 */
export const push = <A>(list: ListRoot<A>, a: A) => {
  if (isEmpty(list)) {
    const l: List<A> = { a, prev: null, next: null };
    l.prev = l;
    l.next = l;
    list.first = l;
    list.last = l;
  } else {
    const lastElem = list.last;
    const firstElem = list.first;
    const newLastElem = { a, next: firstElem, prev: lastElem };
    lastElem.next = newLastElem;
    firstElem.prev = newLastElem;
    list.last = newLastElem;
  }
};

export const empty = <A>(): ListRoot<A> => ({ first: null, last: null });

export const makeList = <A>(a: A): ListRoot<A> => {
  const l = empty<A>();
  push(l, a);
  return l;
};

export const singleton = <A>(list: ListRoot<A>): boolean =>
  !isEmpty(list) && list.first === list.last;

export const isEmpty = <A>(list: ListRoot<A>): boolean => list.first === null;

export const pop = <A>(list: ListRoot<A>): Option<A> => {
  if (list.first) {
    const first = list.first;
    if (singleton(list)) {
      list.first = null;
      list.last = null;
    } else {
      first.next.prev = first.prev;
      first.prev.next = first.next;
      list.first = first.next;
    }
    return some(first.a);
  } else {
    return none;
  }
};
