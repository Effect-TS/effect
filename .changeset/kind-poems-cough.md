---
"effect": minor
---

Simplified the creation of pipeable classes.

```ts
class MyClass extends Pipeable.Class {
  constructor(public a: number) {
    super()
  }
  methodA() {
    return this.a
  }
}
console.log(new MyClass(2).pipe((x) => x.methodA())) // 2
```

```ts
class A {
  constructor(public a: number) {}
  methodA() {
    return this.a
  }
}
class B extends Pipeable.pipeable(A) {
  constructor(private b: string) {
    super(b.length)
  }
  methodB() {
    return [this.b, this.methodA()]
  }
}
console.log(new B("pipe").pipe((x) => x.methodB())) // ['pipe', 4]
```
