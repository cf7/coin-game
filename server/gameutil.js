exports.clamp = (value, low, high) => Math.max(low, Math.min(high, value));

exports.randomPoint = (maxX, maxY) => [
  Math.floor(Math.random() * maxX),
  Math.floor(Math.random() * maxY),
];

// Returns an array of size n with the values 0..n-1 in random positions.
exports.permutation = (n) => {
  const array = Array(n).fill(0).map((_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

exports.zip = (list1, list2) => {
    let newlist = [];
    list1.forEach((element, index) => {
        newlist.push([element, list2[index]]);
    });
    return newlist;
};

exports.evenArrayToObject = (array) => {
    if (array.length === 0) {
        return {};
    } else if ((array.length % 2) !== 0) {
        return null;
    } else {
      let result = {};
      for (let i = 0; i + 2 <= array.length; i += 2) {
        result[array[i]] = array[i + 1];
      }
      return result;
    }
};