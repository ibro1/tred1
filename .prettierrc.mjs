/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').options} */
export default {
	// changeable
	semi: false,
	singleQuote: false,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,
	// common
	arrowParens: 'avoid',
	bracketSameLine: false,
	bracketSpacing: true,
	embeddedLanguageFormatting: 'auto',
	endOfLine: 'lf',
	htmlWhitespaceSensitivity: 'css',
	insertPragma: false,
	jsxSingleQuote: false,
	printWidth: 80,
	proseWrap: 'always',
	quoteProps: 'as-needed',
	requirePragma: false,
	singleAttributePerLine: false,
	plugins: [
		'@ianvs/prettier-plugin-sort-imports',
		'prettier-plugin-tailwindcss',
	],
	overrides: [
		{
			files: ['**/*.md', '**/*.json'],
			options: { useTabs: false },
		},
	],
	importOrder: [
		'^(react/(.*)$)|^(react$)',
		'^(react-dom/(.*)$)|^(react-dom$)',
		'^(@remix-run/(.*)$)|^(@remix-run$)',
		'<THIRD_PARTY_MODULES>',
		'',
		'^types$',
		'^~/components',
		'^~/configs',
		'^~/data',
		'^~/helpers',
		'^~/hooks',
		'^~/libs',
		'^~/models',
		'^~/registry',
		'^~/routes',
		'^~/schemas',
		'^~/services',
		'^~/styles',
		'^~/types',
		'^~/utils',
		'',
		'^[./]',
	],
}
