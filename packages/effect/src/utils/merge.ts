export function isObject(item: unknown) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep<A, B extends object>(target: A, source: B): A & B {
  const c = target as any;

  if (isObject(target) && isObject(source)) {
    for (const key of Reflect.ownKeys(source)) {
      if (isObject(source[key])) {
        if (!c[key]) {
          Object.assign(target, { [key]: {} });
        }
        mergeDeep(c[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return target as any;
}
