module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  env: {
    node: true, // This line tells ESLint that the code will run in a Node.js environment
  },
  extends: [
    "eslint:recommended", // Use the recommended rules from eslint
    "plugin:@typescript-eslint/recommended", // Use the recommended rules from @typescript-eslint/eslint-plugin
  ],
  parserOptions: {
    ecmaVersion: 2020, // Allows parsing of modern ECMAScript features
    sourceType: "module", // Allows using import/export statements
  },
  rules: {
    // Place your custom rules here
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
};
