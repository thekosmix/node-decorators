import {UserService} from './tests/user-service';
import {CalculatorService} from './tests/calculator-service';
import {cacheBuckets} from './decorators/cache'


const us = new UserService()
console.log(us.getUser("a"))
console.log(us.getUser('b'))
console.log(us.getUser('c'))
console.log(us.getUser('d'))
console.log(us.getUser('a'))
console.log(us.getUser('b'))
console.log(us.getUser('c'))
console.log(us.getUser('d'))

console.log()

const cals = new CalculatorService();
console.log(cals.calculator("add", 1, 2, 3, 4))
console.log(cals.calculator("multiply", 1, 2, 3, 4))
console.log(cals.calculator("add", 1, 2, 3, 4))
console.log(cals.calculator("multiply", 1, 2, 3, 4))

console.log()

//To test cacheBucketSize
Object.entries(cacheBuckets).forEach(
    ([key, value]) => console.log(key)
);