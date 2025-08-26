// Реализация ноды
// left/right/parent(Int32), color(Uint8), value(Int32)

class RBNode {
  static STRIDE = 20; // 4 + 4 + 4 + 1 + 3pad + 4
  static OFF_LEFT = 0;
  static OFF_RIGHT = 4;
  static OFF_PARENT = 8;
  static OFF_COLOR = 12;
  static OFF_VALUE = 16;

  static NIL = -1; // sentinel for null
  static COLOR_BLACK = 0;
  static COLOR_RED = 1;

  static #encIndex(idx) {
    return idx === null || idx === undefined ? RBNode.NIL : idx;
  }

  static #decIndex(stored) {
    return stored === RBNode.NIL ? null : stored;
  }

  static create({
    left = null,
    right = null,
    parent = null,
    color = 0,
    value = 0,
  }) {
    const buf = new ArrayBuffer(RBNode.STRIDE);
    const dv = new DataView(buf);
    dv.setInt32(RBNode.OFF_LEFT, RBNode.#encIndex(left), false);
    dv.setInt32(RBNode.OFF_RIGHT, RBNode.#encIndex(right), false);
    dv.setInt32(RBNode.OFF_PARENT, RBNode.#encIndex(parent), false);
    dv.setUint8(RBNode.OFF_COLOR, color);
    dv.setInt32(RBNode.OFF_VALUE, value, false);
    return dv;
  }

  static readHeader(dv) {
    const left = RBNode.#decIndex(dv.getInt32(RBNode.OFF_LEFT, false));
    const right = RBNode.#decIndex(dv.getInt32(RBNode.OFF_RIGHT, false));
    const parent = RBNode.#decIndex(dv.getInt32(RBNode.OFF_PARENT, false));
    const color = dv.getUint8(RBNode.OFF_COLOR);
    const value = dv.getInt32(RBNode.OFF_VALUE, false);
    return { parent, right, left, color, value };
  }

  static writeHeader(dv, { left, right, parent, color, value }) {
    if (left !== undefined)
      dv.setInt32(RBNode.OFF_LEFT, RBNode.#encIndex(left), false);
    if (right !== undefined)
      dv.setInt32(RBNode.OFF_RIGHT, RBNode.#encIndex(right), false);
    if (parent !== undefined)
      dv.setInt32(RBNode.OFF_PARENT, RBNode.#encIndex(parent), false);
    if (color !== undefined) dv.setUint8(RBNode.OFF_COLOR, color);
    if (value !== undefined) dv.setInt32(RBNode.OFF_VALUE, value, false);
  }
}

// Реализация стора

class RBNodeStore {
  constructor() {
    this.stride = RBNode.STRIDE;
    this.capacity = 1024;
    this.size = 0;
    this.buffer = new ArrayBuffer(this.capacity * this.stride);
    this.dv = new DataView(this.buffer);
    this.freeSlots = []; // стек для переиспользования удаленных узлов
  }

  #offsetOf(index) {
    if (index < 0 || index >= this.size) throw new Error("out of range index");
    return index * this.stride;
  }

  #ensureCapacity(nextSize) {
    if (nextSize <= this.capacity) return;
    let newCapacity = this.capacity;
    // в 2 раза больше <<=1
    while (newCapacity < nextSize) newCapacity <<= 1;
    const newBuffer = new ArrayBuffer(newCapacity * this.stride);
    new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
    this.buffer = newBuffer;
    this.dv = new DataView(newBuffer);
    this.capacity = newCapacity;
  }

  #allocateSlot() {
    // сначала пытаемся использовать удаленный узел
    if (this.freeSlots.length > 0) {
      return this.freeSlots.pop();
    }
    // если нет свободных, выделяем новый
    const index = this.size;
    this.#ensureCapacity(index + 1);
    this.size += 1;
    return index;
  }

  append(fields) {
    const index = this.#allocateSlot();
    const off = index * this.stride;
    const nodeView = RBNode.create(fields);
    new Uint8Array(this.buffer, off, this.stride).set(
      new Uint8Array(nodeView.buffer)
    );
    return index;
  }

  freeSlot(index) {
    if (index >= 0 && index < this.size) {
      this.freeSlots.push(index);
    }
  }

  #viewAt(index) {
    const off = this.#offsetOf(index);
    return new DataView(this.buffer, off, this.stride);
  }

  // переписать филды
  writeAt(index, fields) {
    const view = this.#viewAt(index);
    RBNode.writeHeader(view, fields);
    if (fields.value !== undefined)
      view.setInt32(RBNode.OFF_VALUE, fields.value, false);
  }

  readAt(index) {
    const view = this.#viewAt(index);
    return RBNode.readHeader(view);
  }

  getValue(index) {
    const view = this.#viewAt(index);
    return view.getInt32(RBNode.OFF_VALUE, false);
  }

  setValue(index, value) {
    const view = this.#viewAt(index);
    view.setInt32(RBNode.OFF_VALUE, value, false);
  }

  findByValue(value) {
    for (let i = 0; i < this.size; i += 1) {
      const off = i * this.stride + RBNode.OFF_VALUE;
      if (this.dv.getInt32(off, false) === value) return i;
    }
    return -1;
  }
}

// Реализация дерева
class RBTree extends RBNodeStore {
  #rootIndex = null;

  add(value) {
    const newNodeIndex = this.append({
      parent: null,
      left: null,
      right: null,
      color: RBNode.COLOR_RED,
      value,
    });

    if (this.#rootIndex === null) {
      this.#rootIndex = newNodeIndex;
      this.writeAt(newNodeIndex, { color: RBNode.COLOR_BLACK });
      return;
    }

    // поиск места вставки
    let currentIndex = this.#rootIndex;
    let parentIndex = null;
    let isLeftChild = false;

    while (currentIndex !== null) {
      const currentValue = this.getValue(currentIndex);
      parentIndex = currentIndex;

      if (value < currentValue) {
        const leftIndex = this.readAt(currentIndex).left;
        if (leftIndex === null) {
          isLeftChild = true;
          break;
        }
        currentIndex = leftIndex;
      } else {
        const rightIndex = this.readAt(currentIndex).right;
        if (rightIndex === null) {
          isLeftChild = false;
          break;
        }
        currentIndex = rightIndex;
      }
    }

    // линки
    this.writeAt(newNodeIndex, { parent: parentIndex });
    if (isLeftChild) {
      this.writeAt(parentIndex, { left: newNodeIndex });
    } else {
      this.writeAt(parentIndex, { right: newNodeIndex });
    }

    this.#fixupInsert(newNodeIndex);
  }

  #fixupInsert(nodeIndex) {
    let currentIndex = nodeIndex;

    while (true) {
      const current = this.readAt(currentIndex);
      // rooot
      if (current.parent === null) {
        this.writeAt(currentIndex, { color: RBNode.COLOR_BLACK });
        break;
      }

      let parentIndex = current.parent;
      const parent = this.readAt(parentIndex);

      // не нужен фикс
      if (this.#isBlack(parent.color)) {
        break;
      }

      const grandparentIndex = parent.parent;
      if (grandparentIndex === null) break;

      const uncleIndex = this.#getUncleIndex(parentIndex, grandparentIndex);

      if (uncleIndex !== null && this.#isRed(this.readAt(uncleIndex).color)) {
        // Case 1: перекраска
        this.writeAt(parentIndex, { color: RBNode.COLOR_BLACK });
        this.writeAt(uncleIndex, { color: RBNode.COLOR_BLACK });
        this.writeAt(grandparentIndex, { color: RBNode.COLOR_RED });
        currentIndex = grandparentIndex;
      } else {
        // Case 2: поворот
        if (this.#isRightChild(parentIndex, grandparentIndex)) {
          if (this.#isLeftChild(currentIndex, parentIndex)) {
            // Right-left case
            this.#rotateRight(parentIndex);
            currentIndex = parentIndex;
            parentIndex = this.readAt(currentIndex).parent;
          }
          // Right-right case
          this.#rotateLeft(grandparentIndex);
        } else {
          if (this.#isRightChild(currentIndex, parentIndex)) {
            // Left-right case
            this.#rotateLeft(parentIndex);
            currentIndex = parentIndex;
            parentIndex = this.readAt(currentIndex).parent;
          }
          // Left-left case
          this.#rotateRight(grandparentIndex);
        }

        this.writeAt(parentIndex, { color: RBNode.COLOR_BLACK });
        this.writeAt(grandparentIndex, { color: RBNode.COLOR_RED });
        break;
      }
    }
  }

  #getUncleIndex(parentIndex, grandparentIndex) {
    const grandparent = this.readAt(grandparentIndex);
    if (this.#isLeftChild(parentIndex, grandparentIndex)) {
      return grandparent.right;
    } else {
      return grandparent.left;
    }
  }

  #isLeftChild(nodeIndex, parentIndex) {
    const parent = this.readAt(parentIndex);
    return parent.left === nodeIndex;
  }

  #isRightChild(nodeIndex, parentIndex) {
    const parent = this.readAt(parentIndex);
    return parent.right === nodeIndex;
  }

  delete(value) {
    const nodeIndex = this.#findNodeByValue(value);
    if (nodeIndex === null) return false;

    this.#deleteNode(nodeIndex);
    return true;
  }

  #findNodeByValue(value) {
    let currentIndex = this.#rootIndex;

    while (currentIndex !== null) {
      const currentValue = this.getValue(currentIndex);
      if (value === currentValue) return currentIndex;

      if (value < currentValue) {
        currentIndex = this.readAt(currentIndex).left;
      } else {
        currentIndex = this.readAt(currentIndex).right;
      }
    }
    return null;
  }

  #deleteNode(nodeIndex) {
    const node = this.readAt(nodeIndex);
    let childIndex = null;
    let originalColor = node.color;

    if (node.left === null) {
      childIndex = node.right;
      this.#transplant(nodeIndex, childIndex);
    } else if (node.right === null) {
      childIndex = node.left;
      this.#transplant(nodeIndex, childIndex);
    } else {
      // 2 child
      const successorIndex = this.#findSuccessor(nodeIndex);
      const successor = this.readAt(successorIndex);
      originalColor = successor.color;

      childIndex = successor.right;
      if (successor.parent === nodeIndex) {
        if (childIndex !== null) {
          this.writeAt(childIndex, { parent: successorIndex });
        }
      } else {
        this.#transplant(successorIndex, childIndex);
        this.writeAt(successorIndex, { right: node.right });
        this.writeAt(node.right, { parent: successorIndex });
      }

      this.#transplant(nodeIndex, successorIndex);
      this.writeAt(successorIndex, { left: node.left, color: node.color });
      this.writeAt(node.left, { parent: successorIndex });
    }

    if (originalColor === RBNode.COLOR_BLACK) {
      if (childIndex !== null) {
        this.#deleteFixup(childIndex);
      }
    }

    // Освобождаем удаленный узел для переиспользования
    this.freeSlot(nodeIndex);
  }

  // нода для реального удаления
  #findSuccessor(nodeIndex) {
    let currentIndex = this.readAt(nodeIndex).right;
    while (this.readAt(currentIndex).left !== null) {
      currentIndex = this.readAt(currentIndex).left;
    }
    return currentIndex;
  }

  #transplant(oldIndex, newIndex) {
    const oldNode = this.readAt(oldIndex);
    if (oldNode.parent === null) {
      this.#rootIndex = newIndex;
    } else if (this.#isLeftChild(oldIndex, oldNode.parent)) {
      this.writeAt(oldNode.parent, { left: newIndex });
    } else {
      this.writeAt(oldNode.parent, { right: newIndex });
    }

    if (newIndex !== null) {
      this.writeAt(newIndex, { parent: oldNode.parent });
    }
  }

  #deleteFixup(nodeIndex) {
    let currentIndex = nodeIndex;

    while (
      currentIndex !== this.#rootIndex &&
      this.#isBlack(this.readAt(currentIndex).color)
    ) {
      const currentNode = this.readAt(currentIndex);
      const parentIndex = currentNode.parent;
      const isCurrentLeftChild = this.#isLeftChild(currentIndex, parentIndex);

      let siblingIndex = isCurrentLeftChild
        ? this.readAt(parentIndex).right
        : this.readAt(parentIndex).left;
      let siblingNode = this.readAt(siblingIndex);

      // Case 1: брат красный
      if (this.#isRed(siblingNode.color)) {
        this.writeAt(siblingIndex, { color: RBNode.COLOR_BLACK });
        this.writeAt(parentIndex, { color: RBNode.COLOR_RED });
        if (isCurrentLeftChild) {
          this.#rotateLeft(parentIndex);
          siblingIndex = this.readAt(parentIndex).right;
        } else {
          this.#rotateRight(parentIndex);
          siblingIndex = this.readAt(parentIndex).left;
        }
        siblingNode = this.readAt(siblingIndex);
      }

      const leftNephewIndex = siblingNode.left;
      const rightNephewIndex = siblingNode.right;
      const leftNephewColor =
        leftNephewIndex !== null
          ? this.readAt(leftNephewIndex).color
          : RBNode.COLOR_BLACK;
      const rightNephewColor =
        rightNephewIndex !== null
          ? this.readAt(rightNephewIndex).color
          : RBNode.COLOR_BLACK;

      // Case 2: 2 племянника красные
      if (this.#isBlack(leftNephewColor) && this.#isBlack(rightNephewColor)) {
        this.writeAt(siblingIndex, { color: RBNode.COLOR_RED });
        currentIndex = parentIndex;
        continue;
      }

      // Case 3: Дальний племянник черный, ближний племянник красный.
      if (
        (isCurrentLeftChild && this.#isBlack(rightNephewColor)) ||
        (!isCurrentLeftChild && this.#isBlack(leftNephewColor))
      ) {
        const nearNephewIndex = isCurrentLeftChild
          ? leftNephewIndex
          : rightNephewIndex;
        if (nearNephewIndex !== null) {
          this.writeAt(nearNephewIndex, { color: RBNode.COLOR_BLACK });
        }
        this.writeAt(siblingIndex, { color: RBNode.COLOR_RED });
        if (isCurrentLeftChild) {
          this.#rotateRight(siblingIndex);
          siblingIndex = this.readAt(parentIndex).right;
        } else {
          this.#rotateLeft(siblingIndex);
          siblingIndex = this.readAt(parentIndex).left;
        }
        siblingNode = this.readAt(siblingIndex);
      }

      // Case 4: Дальний племянник красный
      this.writeAt(siblingIndex, { color: this.readAt(parentIndex).color });
      this.writeAt(parentIndex, { color: RBNode.COLOR_BLACK });
      const farNephewIndex = isCurrentLeftChild
        ? siblingNode.right
        : siblingNode.left;
      if (farNephewIndex !== null) {
        this.writeAt(farNephewIndex, { color: RBNode.COLOR_BLACK });
      }
      if (isCurrentLeftChild) {
        this.#rotateLeft(parentIndex);
      } else {
        this.#rotateRight(parentIndex);
      }
      currentIndex = this.#rootIndex;
    }

    if (currentIndex !== null) {
      this.writeAt(currentIndex, { color: RBNode.COLOR_BLACK });
    }
  }

  #rotateLeft(pivotNodeIndex) {
    const pivotNode = this.readAt(pivotNodeIndex);
    const rightChildIndex = pivotNode.right;

    if (rightChildIndex === null) {
      return;
    }

    const rightChildNode = this.readAt(rightChildIndex);

    this.writeAt(pivotNodeIndex, { right: rightChildNode.left });
    if (rightChildNode.left !== null) {
      this.writeAt(rightChildNode.left, { parent: pivotNodeIndex });
    }

    this.writeAt(rightChildIndex, { parent: pivotNode.parent });

    if (pivotNode.parent === null) {
      this.#rootIndex = rightChildIndex;
    } else if (this.#isLeftChild(pivotNodeIndex, pivotNode.parent)) {
      this.writeAt(pivotNode.parent, { left: rightChildIndex });
    } else {
      this.writeAt(pivotNode.parent, { right: rightChildIndex });
    }

    this.writeAt(rightChildIndex, { left: pivotNodeIndex });
    this.writeAt(pivotNodeIndex, { parent: rightChildIndex });
  }

  #rotateRight(nodeIndex) {
    const node = this.readAt(nodeIndex);
    const leftChildIndex = node.left;

    if (leftChildIndex === null) return;

    const leftChild = this.readAt(leftChildIndex);
    this.writeAt(leftChildIndex, { parent: node.parent });

    if (node.parent === null) {
      this.#rootIndex = leftChildIndex;
    } else if (this.#isLeftChild(nodeIndex, node.parent)) {
      this.writeAt(node.parent, { left: leftChildIndex });
    } else {
      this.writeAt(node.parent, { right: leftChildIndex });
    }

    this.writeAt(nodeIndex, { left: leftChild.right });
    if (leftChild.right !== null) {
      this.writeAt(leftChild.right, { parent: nodeIndex });
    }

    this.writeAt(leftChildIndex, { right: nodeIndex });
    this.writeAt(nodeIndex, { parent: leftChildIndex });
  }

  #isBlack(color) {
    return color === RBNode.COLOR_BLACK;
  }

  #isRed(color) {
    return color === RBNode.COLOR_RED;
  }

  #isEmpty() {
    return this.#rootIndex === null;
  }

  toObjectTree() {
    // структура node
    // value: number,
    // color: 1 === черный | 2 === красный
    // parent: node | null,
    // left: node | null,
    // right: node | null,

    if (this.#isEmpty()) return null;

    const indexToNode = new Map();

    for (let i = 0; i < this.size; i++) {
      const nodeData = this.readAt(i);
      const node = {
        value: nodeData.value,
        color: nodeData.color === RBNode.COLOR_RED ? 0 : 1,
        parent: null,
        left: null,
        right: null,
      };
      indexToNode.set(i, node);
    }

    for (let i = 0; i < this.size; i++) {
      const nodeData = this.readAt(i);
      const node = indexToNode.get(i);

      if (nodeData.parent !== null) {
        node.parent = indexToNode.get(nodeData.parent);
      }
      if (nodeData.left !== null) {
        node.left = indexToNode.get(nodeData.left);
      }
      if (nodeData.right !== null) {
        node.right = indexToNode.get(nodeData.right);
      }
    }

    return indexToNode.get(this.#rootIndex);
  }
}

module.exports = RBTree;
