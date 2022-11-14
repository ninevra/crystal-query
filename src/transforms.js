import { And, Or, Not, Group, Literal, Term } from './nodes.js';

export function fold(node, { preVisit = (x) => x, postVisit = (x) => x }) {
  node = preVisit(node);
  if (node?.children !== undefined) {
    node = new node.constructor(node);
    node.children = node.children.map((node) =>
      fold(node, { preVisit, postVisit })
    );
  }

  return postVisit(node);
}

export function leavesToValue(node) {
  return fold(node, {
    preVisit(node) {
      if (
        typeof node === 'object' &&
        (node?.name === undefined || node?.name === 'Word')
      ) {
        return node?.value;
      }

      return node;
    }
  });
}

export function textToLiteral(node) {
  return fold(node, {
    preVisit(node) {
      if (node?.name === 'Text') {
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
  return fold(node, {
    postVisit(node) {
      switch (node?.name) {
        case 'And':
          return new And({ left: node.left, right: node.right });
        case 'Or':
          return new Or({ left: node.left, right: node.right });
        case 'Not':
          return new Not({ expression: node.expression });
        case 'Group':
          return new Group({ expression: node.expression });
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

export function removeGroups(node) {
  return fold(node, {
    postVisit(node) {
      if (node?.name === 'Group') {
        return node.expression;
      }

      return node;
    }
  });
}

export function collapseIncomplete(node) {
  return fold(node, {
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
        case 'Group':
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
  return fold(node, {
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
      removeGroups(minimizeChildren(leavesToValue(textToLiteral(cst))))
    )
  );
}

export function queryFromCst(cst) {
  return fold(cst, {
    postVisit(node) {
      switch (node?.name) {
        case undefined:
        case 'Word':
          return node?.raw ?? node?.value ?? '';
        default:
          return node.children.join('');
      }
    }
  });
}
