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

class Binary extends Node {
  get left() {
    return this.children[0];
  }

  set left(child) {
    this.children[0] = child;
  }

  get right() {
    return this.children[4];
  }

  set right(child) {
    this.children[4] = child;
  }
}

export class And extends Binary {
  name = 'And';

  constructor({ children, left, and, right, ...rest }) {
    super(rest);
    this.children = children ?? [left, undefined, and, undefined, right];
  }

  get and() {
    return this.children[2];
  }

  set and(child) {
    this.children[2] = child;
  }
}

export class Or extends Binary {
  name = 'Or';

  constructor({ children, left, or, right, ...rest }) {
    super(rest);
    this.children = children ?? [left, undefined, or, undefined, right];
  }

  get or() {
    return this.children[2];
  }

  set or(child) {
    this.children[2] = child;
  }
}

class Unary extends Node {
  get expression() {
    return this.children[2];
  }

  set expression(child) {
    this.children[2] = child;
  }
}

export class Not extends Unary {
  name = 'Not';

  constructor({ children, not, expression, ...rest }) {
    super(rest);
    this.children = children ?? [not, undefined, expression];
  }

  get not() {
    return this.children[0];
  }

  set not(child) {
    this.children[0] = child;
  }
}

export class Group extends Unary {
  name = 'Group';

  constructor({ children, open, expression, close, ...rest }) {
    super(rest);
    this.children = children ?? [open, undefined, expression, undefined, close];
  }

  get open() {
    return this.children[0];
  }

  set open(child) {
    this.children[0] = child;
  }

  get close() {
    return this.children[4];
  }

  set close(child) {
    this.children[4] = child;
  }
}

export class Term extends Node {
  name = 'Term';

  constructor({ children, field, operator, value, ...rest }) {
    super(rest);
    this.children = children ?? [field, operator, value];
  }

  get field() {
    return this.children[0];
  }

  set field(child) {
    this.children[0] = child;
  }

  get operator() {
    return this.children[1];
  }

  set operator(child) {
    this.children[1] = child;
  }

  get value() {
    return this.children[2];
  }

  set value(child) {
    this.children[2] = child;
  }
}

export class Text extends Node {
  name = 'Text';

  constructor({ children, open, content, close, ...rest }) {
    super(rest);
    this.children = children ?? [open, content, close];
  }

  get open() {
    return this.children[0];
  }

  set open(child) {
    this.children[0] = child;
  }

  get content() {
    return this.children[1];
  }

  set content(child) {
    this.children[1] = child;
  }

  get close() {
    return this.children[2];
  }

  set close(child) {
    this.children[2] = child;
  }
}

export class Literal extends Node {
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

export class Word extends Literal {
  name = 'Word';
}
