import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['dist/**', 'src/routeTree.gen.ts'] },
  ...tseslint.configs.recommended,
)
