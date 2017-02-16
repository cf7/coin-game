
/*
  For testing:
  use redis.select()
  write integration tests

  start redis instance
  flush db
  insert data
  test data
  flush db again when finished

  have game play on 0
  have tests on a different index
*/

const gameutil = require('../server/gameutil');
const assert = require('assert');

describe('Redis', () => {
  it('stores player names', () => {
      
  });
});

describe('The clamp function', () => {
  it('accepts values in range', () => {
    assert.equal(gameutil.clamp(7, -10, 20), 7);
  });

  it('clamps to lower bound', () => {
    assert.equal(gameutil.clamp(7, 10, 20), 10);
  });

  it('clamps to upper bound', () => {
    assert.equal(gameutil.clamp(7, 3, 5), 5);
  });
});


describe('The randomPoint function', () => {
  it('generates only acceptable points', () => {
    const set = new Set([
      '0,0', '0,1', '0,2',
      '1,0', '1,1', '1,2',
      '2,0', '2,1', '2,2',
      '3,0', '3,1', '3,2',
    ]);
    for (let i = 0; i < 100; i += 1) {
      const point = gameutil.randomPoint(4, 3);
      assert.ok(Array.isArray(point));
      assert.equal(point.length, 2);
      assert.ok(set.has(point.toString()));
    }
  });

  it('can generate all the points', () => {
    const set = new Set([
      '0,0', '0,1', '0,2',
      '1,0', '1,1', '1,2',
      '2,0', '2,1', '2,2',
      '3,0', '3,1', '3,2',
    ]);
    for (let i = 0; i < 100; i += 1) {
      const point = gameutil.randomPoint(4, 3);
      set.delete(point.toString());
    }
    assert.equal(set.size, 0);
  });
});

describe('The permutation function', () => {
  it('permutes the empty array', () => {
    assert.deepStrictEqual(gameutil.permutation(0), []);
  });

  it('permutes the single-element array', () => {
    assert.deepStrictEqual(gameutil.permutation(1), [0]);
  });

  it('returns an array of the desired size', () => {
    [40, 25, 11, 3].forEach((size) => {
      const result = gameutil.permutation(size);
      assert.ok(Array.isArray(result));
      assert.equal(result.length, size);
    });
  });

  it('generates all permutations of [0,1,2] within 100 runs', () => {
    const set = new Set();
    for (let i = 0; i < 100; i += 1) {
      set.add(gameutil.permutation(3).toString());
    }
    assert.ok(set.has('0,1,2'));
    assert.ok(set.has('0,2,1'));
    assert.ok(set.has('1,0,2'));
    assert.ok(set.has('1,2,0'));
    assert.ok(set.has('2,0,1'));
    assert.ok(set.has('2,1,0'));
  });
});

describe('The zip function', () => {
  it('zips two arrays into a list of list pairs', () => {
    let result = gameutil.zip([1,2,3], [4,5,6])
    assert.equal(result[0][0], 1);
    assert.equal(result[0][1], 4);
    assert.equal(result[1][0], 2);
    assert.equal(result[1][1], 5);
    assert.equal(result[2][0], 3);
    assert.equal(result[2][1], 6);
  });
});

describe('The evenArrayToObject function', () => {
  it('converts an empty array to an empty object', () => {
    assert.ok(gameutil.evenArrayToObject([]));
  });

  it('returns null when not given an even number of elements', () => {
    assert.ok(gameutil.evenArrayToObject(['name1', '1', 'name2', '2', 'name3', '3']));
    assert.ok(!gameutil.evenArrayToObject(['name1', '1', 'name2', '2', 'name3']));
    assert.ok(!gameutil.evenArrayToObject(['name2', '2', 'name3']));
  });

  it('includes all elements of the original array in the result object', () => {
    let result = gameutil.evenArrayToObject(['name1', '1', 'name2', '2', 'name3', '3']);
    assert.equal(result.name1, 1);
    assert.equal(result.name2, 2);
    assert.equal(result.name3, 3);
  });
});
