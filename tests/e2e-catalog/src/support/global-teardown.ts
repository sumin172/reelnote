declare global {
  // noinspection ES6ConvertVarToLetConst
  var __TEARDOWN_MESSAGE__: string | undefined;
}

module.exports = async function globalTeardown() {
  if (globalThis.__TEARDOWN_MESSAGE__) {
    console.log(globalThis.__TEARDOWN_MESSAGE__);
  }
};
