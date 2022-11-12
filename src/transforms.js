import { And, Or, Not, Group, Literal, Term } from './nodes.js';

function fold2(node, foldfn) {
  return foldfn(node, (node, fn = foldfn) =>
    node?.children === undefined
      ? node
      : new node.constructor({
          ...node,
          children: node.children.map((node) => fold2(node, fn))
        })
  );
}

export function fold(node, { preVisit = (x) => x, postVisit = (x) => x }) {
  return fold2(node, (node, visit) => {
    return postVisit(visit(preVisit(node)));
  });
}

export function leavesToValue(node) {
  return fold2(node, (node, visit) => {
    if (
      typeof node === 'object' &&
      (node?.name === undefined || node?.name === 'Word')
    ) {
      return node?.value;
    }

    return visit(node);
  });
}

export function textToLiteral(node) {
  return fold2(node, (node, visit) => {
    if (node?.name === 'Text') {
      const {
        start,
        end,
        content: { value, raw }
      } = node;
      return new Literal({ start, end, value, raw });
    }

    return visit(node);
  });
}

export function minimizeChildren(node) {
  return fold2(node, (node, visit) => {
    node = visit(node);
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
  });
}

export function removeGroups(node) {
  return fold2(node, (node, visit) => {
    if (node?.name === 'Group') {
      return visit(node.expression);
    }

    return visit(node);
  });
}

export function collapseIncomplete(node) {
  return fold2(node, (node, visit) => {
    node = visit(node);
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
  });
}

export function removeOffsets(node) {
  return fold2(node, (node, visit) => {
    if (node === undefined) {
      return undefined;
    }

    if (typeof node !== 'object') {
      return node;
    }

    const { start, end, ...rest } = node;

    return visit(new node.constructor(rest));
  });
}

export function fieldGroupsToTermGroups(node) {
  return fold2(node, (node, visit) => {
    if (node?.name === 'Term') {
      const { field, operator, value } = node;

      switch (field?.name) {
        case 'And':
        case 'Or':
        case 'Not':
        case 'Group':
          return fold2(field, (node, visit) => {
            switch (node?.name) {
              case 'Word':
              case 'Text':
                return new Term({ field: node, operator, value });
              default:
                return visit(node);
            }
          });
        default:
          return visit(node);
      }
    }

    return visit(node);
  });
}

export function valueGroupsToTermGroups(node) {
  return fold2(node, (node, visit) => {
    if (node?.name === 'Term') {
      const { field, operator, value } = node;

      switch (value?.name) {
        case 'And':
        case 'Or':
        case 'Not':
        case 'Group':
          return fold2(value, (node, visit) => {
            switch (node?.name) {
              case 'Word':
              case 'Text':
                return new Term({ field, operator, value: node });
              default:
                return visit(node);
            }
          });
        default:
          return visit(node);
      }
    }

    return visit(node);
  });
}

export function astFromCst(cst) {
  return removeOffsets(
    collapseIncomplete(
      removeGroups(
        leavesToValue(
          textToLiteral(
            fieldGroupsToTermGroups(
              valueGroupsToTermGroups(minimizeChildren(cst))
            )
          )
        )
      )
    )
  );
}

export function queryFromCst(cst) {
  return fold2(cst, (node, visit) => {
    switch (node?.name) {
      case undefined:
      case 'Word':
        return node?.raw ?? node?.value ?? '';
      default:
        return visit(node).children.join('');
    }
  });
}
