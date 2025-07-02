const globals = require('globals');
const pluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'commonjs',
      globals: {
        browser: true,
        node: true,
        jest: true,
      },
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  pluginPrettierRecommended,
];
