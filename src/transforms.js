import { And, Or, Not, Group, Term } from './nodes.js';

export function fold(node, foldfn) {
  return foldfn(node, (node) => visit(node, foldfn));
}

export function visit(node, fn) {
  if (node?.children === undefined) {
    return node;
  }

  return new node.constructor({
    ...node,
    children: node.children.map((node) => fold(node, fn))
  });
}

export function leavesToValue(node) {
  if (node?.children === undefined) {
    return node?.value;
  }

  return visit(node, leavesToValue);
}

export function textToContent(node) {
  if (node?.name === 'Text') {
    return node.content;
  }

  return visit(node, textToContent);
}

export function minimizeChildren(node) {
  node = visit(node, minimizeChildren);
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

export function removeGroups(node) {
  node = visit(node, removeGroups);
  if (node?.name === 'Group') {
    return node.expression;
  }

  return node;
}

export function collapseIncomplete(node) {
  node = visit(node, collapseIncomplete);
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

export function removeOffsets(node) {
  if (typeof node !== 'object') {
    return node;
  }

  const { start, end, ...rest } = node;

  return visit(new node.constructor(rest), removeOffsets);
}

export function fieldGroupsToTermGroups(node) {
  if (node?.name === 'Term') {
    const { field, operator, value } = node;

    switch (field?.name) {
      case 'And':
      case 'Or':
      case 'Not':
      case 'Group':
        return fold(field, (node, visit) => {
          switch (node?.name) {
            case 'Word':
            case 'Text':
              return new Term({ field: node, operator, value });
            default:
              return visit(node);
          }
        });
      default:
        return visit(node, fieldGroupsToTermGroups);
    }
  }

  return visit(node, fieldGroupsToTermGroups);
}

export function valueGroupsToTermGroups(node) {
  if (node?.name === 'Term') {
    const { field, operator, value } = node;

    switch (value?.name) {
      case 'And':
      case 'Or':
      case 'Not':
      case 'Group':
        return fold(value, (node, visit) => {
          switch (node?.name) {
            case 'Word':
            case 'Text':
              return new Term({ field, operator, value: node });
            default:
              return visit(node);
          }
        });
      default:
        return visit(node, valueGroupsToTermGroups);
    }
  }

  return visit(node, valueGroupsToTermGroups);
}

export function astFromCst(cst) {
  return removeOffsets(
    collapseIncomplete(
      removeGroups(
        leavesToValue(
          textToContent(
            fieldGroupsToTermGroups(
              valueGroupsToTermGroups(minimizeChildren(cst))
            )
          )
        )
      )
    )
  );
}

export function queryFromCst(node) {
  return (
    visit(node, queryFromCst)?.children?.join('') ??
    node?.raw ??
    node?.value ??
    ''
  );
}
