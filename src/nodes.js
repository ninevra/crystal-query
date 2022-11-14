class Node {
  constructor({ start, end }) {
    if (start !== undefined) {
      this.start = start;
    }

    if (end !== undefined) {
      this.end = end;
    }
  }
}

class Branch extends Node {
  constructor({ children, ...rest }) {
    super(rest);
    this.children = children;
  }
}

class Binary extends Branch {
  get left() {
    return this.children[0];
  }

  get right() {
    return this.children[4];
  }
}

export class And extends Binary {
  name = 'And';

  constructor({ children, left, and, right, ...rest }) {
    children ??= [left, undefined, and, undefined, right];
    super({ children, ...rest });
  }

  get and() {
    return this.children[2];
  }
}

export class Or extends Binary {
  name = 'Or';

  constructor({ children, left, or, right, ...rest }) {
    children ??= [left, undefined, or, undefined, right];
    super({ children, ...rest });
  }

  get or() {
    return this.children[2];
  }
}

class Unary extends Branch {
  get expression() {
    return this.children[2];
  }
}

export class Not extends Unary {
  name = 'Not';

  constructor({ children, not, expression, ...rest }) {
    children ??= [not, undefined, expression];
    super({ children, ...rest });
  }

  get not() {
    return this.children[0];
  }
}

export class Group extends Unary {
  name = 'Group';

  constructor({ children, open, expression, close, ...rest }) {
    children ??= [open, undefined, expression, undefined, close];
    super({ children, ...rest });
  }

  get open() {
    return this.children[0];
  }

  get close() {
    return this.children[4];
  }
}

export class Term extends Branch {
  name = 'Term';

  constructor({ children, field, operator, value, ...rest }) {
    children ??= [field, undefined, operator, undefined, value];
    super({ children, ...rest });
  }

  get field() {
    return this.children[0];
  }

  get operator() {
    return this.children[2];
  }

  get value() {
    return this.children[4];
  }
}

export class Text extends Branch {
  name = 'Text';

  constructor({ children, open, content, close, ...rest }) {
    children ??= [open, content, close];
    super({ children, ...rest });
  }

  get open() {
    return this.children[0];
  }

  get content() {
    return this.children[1];
  }

  get close() {
    return this.children[2];
  }
}

class Leaf extends Node {
  constructor({ value, raw, ...rest }) {
    super(rest);
    if (value !== undefined) {
      this.value = value;
    }

    if (raw !== undefined) {
      this.raw = raw;
    }
  }
}

export class Literal extends Leaf {}

export class Word extends Leaf {
  name = 'Word';
}
