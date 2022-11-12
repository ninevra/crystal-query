import { fold } from './transforms.js';

export function missingDelimiters(string) {
  let left = 0;
  let right = 0;
  let state = 'default';
  for (const char of string) {
    if (state === 'escape') {
      state = 'string';
    } else if (state === 'string') {
      if (char === '"') {
        state = 'default';
      } else if (char === '\\') {
        state = 'escape';
      }
    } else {
      switch (char) {
        case '"':
          state = 'string';
          break;
        case ')':
          if (right > 0) {
            right--;
          } else {
            left++;
          }

          break;
        case '(':
          right++;
          break;
        // No default
      }
    }
  }

  const escape = state === 'escape';
  const quote = escape || state === 'string';

  return { left, right, escape, quote };
}

export function repairDelimiters(string, { left, right, escape, quote }) {
  const prefix = '('.repeat(left);
  const suffix = (escape ? '\\' : '') + (quote ? '"' : '') + ')'.repeat(right);
  const balanced = prefix + string + suffix;
  return { prefix, suffix, balanced };
}

export function trimCst(cst, prefixLength, inputLength) {
  return fold(cst, (node, visit) => {
    if (node === undefined) {
      return undefined;
    }

    if (node.end <= prefixLength && node.start < prefixLength) {
      // Node exists wholely in the prefix
      return undefined;
    }

    node.start = Math.max(0, node.start - prefixLength);
    node.end -= prefixLength;

    if (node.start >= inputLength && node.end > inputLength) {
      // Node exists wholely in the suffix
      return undefined;
    }

    node.end = Math.min(inputLength, node.end);

    const length = node.end - node.start;
    if (node.raw !== undefined && node.raw.length > length) {
      node.raw = node.raw.slice(0, length);
    }

    return visit(node);
  });
}
