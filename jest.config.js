module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverage: true,
  collectCoverageFrom: [
    "server/**/*.js",
    "!server/**/*.test.js"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
