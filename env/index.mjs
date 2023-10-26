export const getEnv = () =>
  typeof process !== "undefined" &&
  "env" in process &&
  typeof process.env === "object"
    ? process.env
    : typeof import.meta !== "undefined" &&
      "ENV" in import.meta &&
      typeof import.meta.ENV === "object"
    ? import.meta.ENV
    : {};
