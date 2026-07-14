module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'modules/**/*.js',
    'shared/**/*.js',
    '!modules/**/index.js',
  ],
  // Note: threshold commented out for now — uncomment when coverage is close to 90
  // coverageThreshold: {
  //   global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  // },
};