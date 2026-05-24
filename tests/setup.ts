// Mock crypto.subtle for PKCE tests in jsdom
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import("node:crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
  });
}
