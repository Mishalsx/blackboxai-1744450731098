module.exports = {
  // Line length
  printWidth: 100,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Quotes
  singleQuote: true,
  jsxSingleQuote: true,

  // Semicolons
  semi: true,

  // Trailing commas
  trailingComma: 'all',

  // Brackets and spacing
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // Object properties
  quoteProps: 'as-needed',

  // Line endings
  endOfLine: 'lf',

  // JSX
  jsxBracketSameLine: false,

  // Markdown
  proseWrap: 'preserve',

  // HTML
  htmlWhitespaceSensitivity: 'css',

  // Vue
  vueIndentScriptAndStyle: false,

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Import sorting
  importOrder: [
    '^@/(.*)$',
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // Override configurations for specific file patterns
  overrides: [
    {
      files: '*.md',
      options: {
        tabWidth: 2,
        proseWrap: 'always'
      }
    },
    {
      files: '*.json',
      options: {
        tabWidth: 2
      }
    },
    {
      files: '*.{yml,yaml}',
      options: {
        tabWidth: 2
      }
    }
  ]
};
