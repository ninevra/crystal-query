import { And, Or, Not, Paren, Literal, Term } from './nodes.js';

export function foldCst(cst, { preVisit = (x) => x, postVisit = (x) => x }) {
  cst = preVisit(cst);
  if (cst?.children !== undefined) {
    cst.children = cst.children.map((node) =>
      foldCst(node, { preVisit, postVisit })
    );
  }

  return postVisit(cst);
}

export function removeLiterals(node) {
  return foldCst(node, {
    preVisit(node) {
      if (
        typeof node === 'object' &&
        (node?.name === undefined || node?.name === 'Identifier')
      ) {
        return node?.value;
      }

      return node;
    }
  });
}

export function stringsToLiterals(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node?.name === 'String') {
        const {
          start,
          end,
          content: { value, raw }
        } = node;
        return new Literal({ start, end, value, raw });
      }

      return node;
    }
  });
}

export function minimizeChildren(node) {
  return foldCst(node, {
    postVisit(node) {
      switch (node?.name) {
        case 'And':
          return new And({ left: node.left, right: node.right });
        case 'Or':
          return new Or({ left: node.left, right: node.right });
        case 'Not':
          return new Not({ expression: node.expression });
        case 'Parenthetical':
          return new Paren({ expression: node.expression });
        case 'Term':
          return new Term({
            field: node.field,
            operator: node.operator,
            value: node.value
          });
        default:
          return node;
      }
    }
  });
}

export function removeParens(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node?.name === 'Parenthetical') {
        return node.expression;
      }

      return node;
    }
  });
}

export function collapseIncomplete(node) {
  return foldCst(node, {
    postVisit(node) {
      switch (node?.name) {
        case 'And':
        case 'Or':
          if (node.left === undefined) {
            return node.right;
          }

          if (node.right === undefined) {
            return node.left;
          }

          return node;
        case 'Not':
        case 'Parenthetical':
          if (node.expression === undefined) {
            return node.expression;
          }

          return node;
        default:
          return node;
      }
    }
  });
}

export function removeOffsets(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node === undefined) {
        return undefined;
      }

      if (typeof node !== 'object') {
        return node;
      }

      const { start, end, ...rest } = node;

      return new node.constructor(rest);
    }
  });
}

export function astFromCst(cst) {
  return removeOffsets(
    collapseIncomplete(
      removeParens(minimizeChildren(removeLiterals(stringsToLiterals(cst))))
    )
  );
}
