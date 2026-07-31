import "@testing-library/jest-dom";

// jsdom does not implement window.matchMedia. Provide a minimal stub so
// components that use useIsMobile (via SidebarProvider) don't throw.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }) as unknown as MediaQueryList,
});

// next-auth/react is mocked via moduleNameMapper in jest.config.ts
// pointing to src/__mocks__/next-auth-react.ts

