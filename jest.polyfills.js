// Load shims before any modules are imported
// This needs to be in setupFiles (not setupFilesAfterEnv) to run before module loading
require('openai/shims/node');
require('@anthropic-ai/sdk/shims/node');

// Set NODE_ENV for conditional imports
process.env.NODE_ENV = 'test';
