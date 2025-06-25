import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_AZURE_API_BASE_URL =
  "https://prices.azure.com/api/retail/prices";
process.env.NEXT_PUBLIC_AZURE_API_VERSION = "2023-01-01-preview";
process.env.NEXT_PUBLIC_APP_NAME = "Azure Cost Calculator";
process.env.NEXT_PUBLIC_DEFAULT_REGION = "canadacentral";

// Polyfill for TextDecoder in Node.js environment
if (typeof global.TextDecoder === "undefined") {
  const { TextDecoder, TextEncoder } = require("util");
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}
