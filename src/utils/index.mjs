export function logTimeWrapper(fn) {
  return async (...args) => {
    console.time(`Function Call [${fn.name}]`);
    const result = await fn(...args);
    console.timeEnd(`Function Call [${fn.name}]`);
    return result;
  };
}
