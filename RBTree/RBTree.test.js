const RBTree = require("./RBTree");
const createTree = require("functional-red-black-tree");

const generateRandomArray = (length) => {
  const min = -1000;
  const max = 1000;

  // реализованно добавление только уникальных значений, чтобы не было разницы с библиотекой
  return [
    ...new Set(
      Array.from(
        { length },
        () => Math.floor(Math.random() * (max - min + 1)) + min
      )
    ),
  ];
};

const compareTrees = (libNode, treeNode) => {
  if (!libNode && !treeNode) {
    return;
  }

  if (libNode.right || treeNode.right) {
    compareTrees(libNode.right, treeNode.right);
  }

  if (libNode.left || treeNode.left) {
    compareTrees(libNode.left, treeNode.left);
  }

  expect(libNode.value).toEqual(treeNode.value);
  expect(libNode._color).toEqual(treeNode.color);
};

const validateRBProperties = (node, isRoot = false) => {
  if (!node) return 0;


  if (isRoot) {
    expect(node.color).toBe(1);
  }

  if (node.color === 0) {
    if (node.left) {
      expect(node.left.color).toBe(1);
    }
    if (node.right) {
      expect(node.right.color).toBe(1);
    }
  }

  if (node.left) {
    expect(node.left.value).toBeLessThan(node.value);
    expect(node.left.parent).toBe(node);
  }
  if (node.right) {
    expect(node.right.value).toBeGreaterThan(node.value);
    expect(node.right.parent).toBe(node);
  }

  validateRBProperties(node.left, false);
  validateRBProperties(node.right, false);
};

describe("Red Black tree", () => {
  test("Fill tree & delete", () => {
    let libTree = createTree();
    const tree = new RBTree();
    const randArray = generateRandomArray(30);

    let libTreeFill = randArray.reduce((acc, el) => {
      tree.add(el);
      return acc.insert(el, el);
    }, libTree);

    let libRootNode = libTreeFill.root;
    let treeRootNode = tree.toObjectTree();

    compareTrees(libRootNode, treeRootNode);

    for (let i = 0; i < randArray.length; i += 3) {
      tree.delete(randArray[i]);
    }

    treeRootNode = tree.toObjectTree();

    validateRBProperties(treeRootNode, true);
  });
});
