// eslint-disable-next-line no-undef
exports.getEnv = () =>
  // eslint-disable-next-line no-undef
  typeof process !== "undefined" &&
    // eslint-disable-next-line no-undef
    "env" in process &&
    // eslint-disable-next-line no-undef
    typeof process.env === "object" ?
    // eslint-disable-next-line no-undef
    process.env :
    {}
