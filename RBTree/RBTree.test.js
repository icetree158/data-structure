const RBTree = require("./RBTree");
const createTree = require("functional-red-black-tree");

const generateRandomArray = ({ length }) => {
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

const validateTrees = (libNode, treeNode) => {
  if (!libNode && !treeNode) {
    return;
  }

  if (libNode.right || treeNode.right) {
    validateTrees(libNode.right, treeNode.right);
  }

  if (libNode.left || treeNode.left) {
    validateTrees(libNode.left, treeNode.left);
  }

  expect(libNode.value).toEqual(treeNode.value);
  expect(libNode.color).toEqual(treeNode.color);
};

describe("Red Black tree", () => {
  test("Fill tree & delete", () => {
    let libTree = createTree();
    const tree = new RBTree();
    const randArray = generateRandomArray(561);

    libTree = randArray.reduce((acc, el) => {
      tree.add(el);
      acc = acc.insert(el, el);
    }, libTree);

    let libRootNode = libTree.root;
    let treeRootNode = tree.toObjectTree();

    validateTrees(libRootNode, treeRootNode);

    for (let i = 0; i < randArray.length; i += 10) {
      const candidate = randArray[i];
      tree.delete(candidate);
      libTree = libTree.remove(candidate);
    }

    libRootNode = libTree.root;
    treeRootNode = tree.toObjectTree();

    validateTrees(libRootNode, treeRootNode);
  });
});
