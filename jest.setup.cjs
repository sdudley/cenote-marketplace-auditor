// Configure Node.js to use source maps
process.env.NODE_OPTIONS = '--enable-source-maps ';

// MarketplaceHttpClient logs retry warnings in production; silence them in tests.
const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args) => {
    const first = args[0];
    if (typeof first === 'string' && first.startsWith('[marketplace-http]')) {
        return;
    }
    originalConsoleWarn(...args);
};
