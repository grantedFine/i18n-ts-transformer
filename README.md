# i18n-ts-transformer

### Sometimes we need use different namespace of i18next for different directories in a project. This transformer of ts-loader inject ns for i18n function call and increase jsx attribute on Trans/Translation.

### Note: this tranformer use 'translation' as the default tranlation ns. 

# How to use
```js
// webpack.config ts-loader
const transfrom = require('i18n-transformer')

  {
    loader: 'ts-loader',
    options: {
      transpileOnly: true,
      getCustomTransformers: (program) => ({
        before: [transfrom(program, diretoryName, defaultNs)], // directoryName is your ns diretories entry, the path of any file use ns should be `/diretoryName/ns/**`
      }),
      happyPackMode: true,
      configFile: path.resolve(__dirname, 'tsconfig.json'),
    },
  }
```
### example
before transfrom
```js
// /diretoryName/a/**/*.tsx
import { useTranslation } from 'react-i18next'

const Component = () => {
  const [t] = useTranslation()
  return (
    <>
      {t('@xxx')}
    <>
  )
}
```

compile result should be like this:

```js
// /diretoryName/a/**/*.tsx
import { useTranslation } from 'react-i18next'

const Component = () => {
  const [t] = useTranslation(['translation', 'a'])
  return (
    <>
      {t('a:xxx')}
    <>
  )
}

```