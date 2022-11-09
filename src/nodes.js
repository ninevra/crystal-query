class Node {
  constructor({ start, end, children = [], ...rest }) {
    this.start = start;
    this.end = end;
    this.children = children;
    for (const [key, value] of Object.entries(rest)) {
      this[key] = value;
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

  get and() {
    return this.children[2];
  }

  set and(child) {
    this.children[2] = child;
  }
}

export class Or extends Binary {
  name = 'Or';

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

  get not() {
    return this.children[0];
  }

  set not(child) {
    this.children[0] = child;
  }
}

export class Paren extends Unary {
  name = 'Parenthetical';

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

export class NodeString extends Node {
  name = 'String';

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

export class Literal {
  constructor({ start, end, value, raw }) {
    this.start = start;
    this.end = end;
    this.value = value;
    if (raw !== undefined) {
      this.raw = raw;
    }
  }
}

export class Ident extends Literal {
  name = 'Identifier';
}
