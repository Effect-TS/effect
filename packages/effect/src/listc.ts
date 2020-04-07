/* istanbul ignore file */

export class LinkedListNode<T> {
  constructor(public value: T | null, public next: LinkedListNode<T> | null = null) {}
}

export class LinkedList<T> {
  constructor(
    public head: LinkedListNode<T> | null = null,
    public tail: LinkedListNode<T> | null = null
  ) {
    this.head = null;
    this.tail = null;
  }
  empty() {
    return this.head === null;
  }
  prepend(value: T) {
    const newNode = new LinkedListNode<T>(value, this.head);
    this.head = newNode;
    if (!this.tail) {
      this.tail = newNode;
    }
    return this;
  }
  append(value: T) {
    const newNode = new LinkedListNode(value);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;

      return this;
    }
    this.tail!.next = newNode;
    this.tail = newNode;
    return this;
  }
  deleteTail() {
    const deletedTail = this.tail;
    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;

      return deletedTail;
    }
    let currentNode = this.head;
    while (currentNode!.next) {
      if (!currentNode!.next.next) {
        currentNode!.next = null;
      } else {
        currentNode = currentNode!.next;
      }
    }
    this.tail = currentNode;
    return deletedTail;
  }
  deleteHead() {
    if (!this.head) {
      return null;
    }
    const deletedHead = this.head;
    if (this.head.next) {
      this.head = this.head.next;
    } else {
      this.head = null;
      this.tail = null;
    }
    return deletedHead;
  }
}
