const LinkedList = require("./linkedList");

const generateRandomArray = ({ length }) => {
  const min = -1000;
  const max = 1000;
  return Array.from(
    { length },
    () => Math.floor(Math.random() * (max - min + 1)) + min
  );
};

const transformToArray = (iterator) => {
  const array = [];
  for (const element of iterator) {
    array.push(element);
  }
  return array;
};

describe("linked list", () => {
  let randomArray = [];
  let linkedList;

  beforeEach(() => {
    randomArray = generateRandomArray(100);
    linkedList = new LinkedList();
  });

  afterEach(() => {
    randomArray = [];
    linkedList = undefined;
  });

  test("Should work like array.push()", () => {
    randomArray.forEach((el) => linkedList.addToTail(el));
    const array = transformToArray(linkedList.getIteratorHead());

    expect(array).toEqual(randomArray);
  });

  test("Read from tail", () => {
    randomArray.forEach((el) => linkedList.addToTail(el));
    const array = transformToArray(linkedList.getIteratorTail());

    expect(array).toEqual(randomArray.reverse());
  });

  test("metod add", () => {
    linkedList.addToTail(1); // [1]
    linkedList.addToTail(2); // [1,2]
    linkedList.addToHead(3); // [3,1,2]
    linkedList.addToHead(4); // [4,3,1,2]
    linkedList.add(5, 0); // [5,4,3,1,2]
    linkedList.add(6, linkedList.length); // [5,4,3,1,2,6]
    linkedList.add(7, 3); // [5,4,3,7,1,2,6]

    const array = transformToArray(linkedList.getIteratorHead());

    expect(array).toEqual([5, 4, 3, 7, 1, 2, 6]);
  });
});
