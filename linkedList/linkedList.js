class LinkedElement {
  constructor(value, prev, next) {
    this.value = value;
    this.next = next;
    this.prev = prev;
  }
  changeNext(next) {
    this.next = next;
  }
  changePrev(prev) {
    this.prev = prev;
  }
}

class LinkedList {
  #head;
  #tail;
  #length = 0;

  #iteartor(current, field) {
    return {
      [Symbol.iterator]() {
        return {
          current,
          next() {
            if (this.current) {
              const { value } = this.current;
              this.current = this.current?.[field];
              return { done: false, value };
            } else {
              return { done: true };
            }
          },
        };
      },
    };
  }

  constructor() {
    this.#head = null;
    this.#tail = null;
  }

  addToHead(value) {
    const node = new LinkedElement(value, null, this.#head);
    if (!this.#tail) {
      this.#tail = node;
    }

    if (this.#head) {
      this.#head.changePrev(node);
    }

    this.#length++;

    this.#head = node;

    return this;
  }

  addToTail(value) {
    const node = new LinkedElement(value, this.#tail, null);
    if (!this.#head) {
      this.#head = node;
    }

    if (this.#tail) {
      this.#tail.changeNext(node);
    }

    this.#length++;
    this.#tail = node;

    return this;
  }

  add(value, index) {
    if (index === this.#length) {
      this.addToTail(value);
      return;
    }
    if (index === 0) {
      this.addToHead(value);
      return;
    }
    console.log(value);
    if (index < this.#length && index > 0) {
      let i = 0;
      let current = this.#head;

      while (i <= index) {
        if (i === index) {
          const node = new LinkedElement(value, current.prev, current);
          current.prev.changeNext(node);
          current.changePrev(node);
          this.#length++;
          return this;
        }
        current = current.next;
        i++;
      }
    } else {
      throw Error("Out of range");
    }
  }

  getIteratorHead() {
    return this.#iteartor(this.#head, "next");
  }
  getIteratorTail() {
    return this.#iteartor(this.#tail, "prev");
  }
  get length() {
    return this.#length;
  }

  get head() {
    return this.#head;
  }

  get tail() {
    return this.#tail;
  }
}

module.exports = LinkedList;
