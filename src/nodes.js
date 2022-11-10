class Node {
  constructor(data) {
    for (const [key, value] of Object.entries(data)) {
      this[key] = value;
    }
  }
}

class Branch extends Node {
  constructor({ children = [], ...rest }) {
    super({ children, ...rest });
  }
}

class Binary extends Branch {
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

class Unary extends Branch {
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

export class Group extends Unary {
  name = 'Group';

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

export class Term extends Branch {
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

export class Text extends Branch {
  name = 'Text';

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

export class Literal extends Node {}

export class Word extends Literal {
  name = 'Word';
}
