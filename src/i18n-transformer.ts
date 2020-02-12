import * as ts from 'typescript'

const funcTransformPhrase = ['useTranslation', 'withTranslation']

const jsxTransformPhrase = ['Translation', 'Trans']

function getTranform(node: ts.SourceFile) {
  const needTransform = {
    funcNames: [] as string[],
    moduleName: '',
    jsxNames: [] as string[],
  }
  const imports = node.statements.filter(
    (t): t is ts.ImportDeclaration =>
      ts.isImportDeclaration(t) && (<ts.StringLiteral>t.moduleSpecifier).text === 'react-i18next',
  )
  if (!imports.length) return false
  const importDeclaration = imports[imports.length - 1]

  if (importDeclaration.importClause && importDeclaration.importClause.namedBindings) {
    const node = importDeclaration.importClause.namedBindings
    if (ts.isNamedImports(node)) {
      node.elements.forEach((n) => {
        const usedFunc = n.propertyName ? n.propertyName.text : n.name.text
        if (funcTransformPhrase.includes(usedFunc)) {
          needTransform.funcNames.push(n.name.text)
        }
        if (jsxTransformPhrase.includes(usedFunc)) {
          needTransform.jsxNames.push(n.name.text)
        }
      })
    }
    if (ts.isNamespaceImport(node)) {
      const moduleName = (<ts.NamespaceImport>importDeclaration.importClause.namedBindings).name.text
      needTransform.moduleName = moduleName
    }
    return needTransform
  }
  return false
}

interface TransformData {
  funcNames: string[]
  moduleName: string
  jsxNames: string[]
  pluginName: string
  defaultNs: string
}

function isTranJsxOpenElement(node: ts.Node, transformData: TransformData): node is ts.JsxOpeningElement {
  if (ts.isJsxOpeningElement(node)) {
    if (ts.isIdentifier(node.tagName)) {
      return transformData.jsxNames.includes(node.tagName.text)
    }
    if (ts.isPropertyAccessExpression(node.tagName)) {
      return (
        (node.tagName.expression as ts.Identifier).text === transformData.moduleName &&
        jsxTransformPhrase.includes(node.tagName.name.text)
      )
    }
  }
  return false
}

function isTFunctionLikeCall(node: ts.CallExpression) {
  return ts.isIdentifier(node.expression) && node.expression.text === 't'
}

function addNsAttributeToJsx(node: ts.JsxOpeningElement, transformData: TransformData) {
  const newNode = ts.getMutableClone(node)
  const attributes = Array.from(newNode.attributes.properties)
  if (attributes.find((a) => !!a.name && a.name.getText() === 'ns')) return node
  const nsAttributes = ts.createJsxAttribute(
    ts.createIdentifier('ns'),
    ts.createJsxExpression(
      undefined,
      ts.createArrayLiteral(
        [ts.createStringLiteral(transformData.defaultNs), ts.createStringLiteral(transformData.pluginName)],
        false,
      ),
    ),
  )
  attributes.push(nsAttributes)
  newNode.attributes.properties = ts.createNodeArray(attributes)
  return newNode
}

function i18nTFunctionTransform(node: ts.CallExpression, pluginName: string) {
  const infoLiteral = node.arguments[0]
  if (ts.isStringLiteral(infoLiteral) && /^@[\w+\.?]*\w+/.test(infoLiteral.text)) {
    const newNode = ts.getMutableClone(node)
    const args = Array.from(newNode.arguments)
    const newText = infoLiteral.text.replace(/^@/i, `${pluginName}:`)
    args.splice(0, 1, ts.createStringLiteral(newText))
    newNode.arguments = ts.createNodeArray(args)
    return newNode
  }
  return node
}

function transTranslationCall(node: ts.CallExpression, typeChecker: ts.TypeChecker, transformData: TransformData) {
  const expression = node.expression
  const symbol = typeChecker.getSymbolAtLocation(expression)
  if (!symbol) return node
  const declaration = symbol.declarations[0]
  if (ts.isIdentifier(expression) && transformData.funcNames.includes(expression.text)) {
    if (ts.isImportSpecifier(declaration)) {
      return ts.createCall(ts.createIdentifier(expression.text), undefined, [
        ts.createArrayLiteral(
          [ts.createStringLiteral(transformData.defaultNs), ts.createStringLiteral(transformData.pluginName)],
          false,
        ),
      ])
    }
  }
  if (ts.isPropertyAccessExpression(expression) && funcTransformPhrase.includes(expression.name.text)) {
    return ts.createCall(
      ts.createPropertyAccess(
        ts.createIdentifier((expression.expression as ts.Identifier).text),
        ts.createIdentifier(expression.name.text),
      ),
      undefined,
      [
        ts.createArrayLiteral(
          [ts.createStringLiteral(transformData.defaultNs), ts.createStringLiteral(transformData.pluginName)],
          false,
        ),
      ],
    )
  }
  return node
}

function visitNode(node: ts.Node, typeChecker: ts.TypeChecker, transformData: TransformData) {
  if (isTranJsxOpenElement(node, transformData)) {
    return addNsAttributeToJsx(node, transformData)
  }
  if (ts.isCallExpression(node)) {
    if (isTFunctionLikeCall(node)) {
      return i18nTFunctionTransform(node, transformData.pluginName)
    } else {
      return transTranslationCall(node, typeChecker, transformData)
    }
  }
  return node
}

function visitNodeAndChildren(
  node: ts.Node,
  typeChecker: ts.TypeChecker,
  context: ts.TransformationContext,
  additionalData: TransformData,
): ts.Node | undefined {
  return ts.visitEachChild(
    visitNode(node, typeChecker, additionalData),
    (childNode) => visitNodeAndChildren(childNode, typeChecker, context, additionalData),
    context,
  )
}

function transform(program: ts.Program, pluginDir: string, defaultNs = 'translation') {
  return (context: ts.TransformationContext) => {
    const reg = new RegExp(`(?<=/${pluginDir}/).*?(?=/)`)
    const typeChecker = program.getTypeChecker()
    const visitor: ts.Visitor = (node: ts.Node) => {
      const sourcePath = node.getSourceFile().fileName
      const regResult = reg.exec(sourcePath)
      if (!regResult || !/\.tsx?\s*$/.test(sourcePath)) {
        return node
      }
      const pluginName = regResult[0]
      if (ts.isSourceFile(node)) {
        const needTransform = getTranform(node)
        if (!needTransform) return node
        const transformData = {
          ...needTransform,
          pluginName,
          defaultNs,
        }
        return visitNodeAndChildren(node, typeChecker, context, transformData)
      }
      return node
    }
    return (node: ts.SourceFile) => ts.visitNode(node, visitor)
  }
}

export default transform
