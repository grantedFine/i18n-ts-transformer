# i18n-ts-transformer

### 这是一个为了在同一项目中不同文件夹下使用不同i18n命名空间的i18n ts-loader转换器, 通过webpackts-loader打包向不同文件夹下react-i18n的调用func/Component插入对应文件夹名作为namespace.

### Sometimes we need use different namespace of i18next for different directories in a project. This transformer of ts-loader inject ns for i18n function call and increase jsx attribute on Trans/Translation.

### 注意: 这个 transformer将 'translation'作为i18n的默认命令空间, 只能使用字母't'来绑定i18n的TFunction(即useTranslation的返回的数组第一个元素).

### Notice: this tranformer use 'translation' as the default tranlation ns and you should use letter 't' to bind i18n TFunction(The first element of the array return by useTranslation).

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
