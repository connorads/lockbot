module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 10000,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
        },
      },
    ],
  },
};
