import * as ts from 'typescript'
import * as path from 'path'
import transform from '../src/i18n-transformer'
import test from 'ava'

function runTest() {
  const plugins = ['a', 'b']
  const printer = ts.createPrinter()
  plugins.forEach((name) => {
    const sourcePath = path.resolve(__dirname, `./fixtures/__plugins__/${name}/index.tsx`)
    test(`compile plugin ${name}`, (t) => {
      const program = ts.createProgram({
        rootNames: [sourcePath],
        options: {
          sourceRoot: '',
        },
      })
      const sourceFile = program.getSourceFile(sourcePath)!
      const transformer = transform(program)
      const result = ts.transform(sourceFile, [transformer])
      const output = printer.printFile(result.transformed[0])
      t.snapshot(output)
      result.dispose()
    })
  })
}

runTest()