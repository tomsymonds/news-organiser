# Testing

This project uses Jest for unit testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

- `BaseNote.test.ts` - Comprehensive tests for the BaseNote class

## Test Coverage

The test suite for BaseNote covers:
- Constructor initialization
- Title setting from various sources
- Metadata merging and setting
- Markdown frontmatter formatting
- File status checking (saved/unsaved)
- Creation and modification dates
- Status validation
- Title sanitization (markdown removal)

All 39 test cases pass successfully.

## Mocks

The `__mocks__` directory contains mocks for external dependencies:
- `obsidian.ts` - Mock for Obsidian API (TFile class)
