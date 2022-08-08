// test suite example

var assert = require('assert');
const leetcode = require('../leetcode')
const generateList = leetcode.generateList
const reverseNumber = leetcode.reverseNumber
const numberToListNode = leetcode.numberToListNode

describe('#addTwoNumbers(l1, l2)', function(){
  describe('test', function(){
    let l1 = [1,2,3,4]
    let l2 = [1,2,3,4]
    let expected = [2,4,6,8];
    it(`addTwoNumbers([${l1}], [${l2}])`, () => assert.deepEqual(leetcode.addTwoNumbers(generateList(l1), generateList(l2)), generateList(expected)))
  });
  
  describe('test', function(){
    let l1 = [4,4,4,4]
    let l2 = [6,6,6,6]
    let expected = [0,1,1,1,1];
    it(`addTwoNumbers([${l1}], [${l2}])`, () => assert.deepEqual(leetcode.addTwoNumbers(generateList(l1), generateList(l2)), generateList(expected)))
  });
  describe('test', function(){
    let l1 = [4,4,4]
    let l2 = [6,6,6,6]
    let expected = [0,1,1,7];
    it(`addTwoNumbers([${l1}], [${l2}])`, () => assert.deepEqual(leetcode.addTwoNumbers(generateList(l1), generateList(l2)), generateList(expected)))
  });
  describe('test', function(){
    let l1 = [0]
    let l2 = [6,6,6,6]
    let expected = [6,6,6,6];
    it(`addTwoNumbers([${l1}], [${l2}])`, () => assert.deepEqual(leetcode.addTwoNumbers(generateList(l1), generateList(l2)), generateList(expected)))
  });
  describe('test', function(){
    let l1 = [0]
    let l2 = [6,6,6,6]
    let expected = [6,6,6,6];
    it(`addTwoNumbers([${l1}], [${l2}])`, () => assert.deepEqual(leetcode.addTwoNumbers(generateList(l1), generateList(l2)), generateList(expected)))
  });
});