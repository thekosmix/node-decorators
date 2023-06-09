import {UserService} from './tests/user-service';
import {CalculatorService} from './tests/calculator-service';

const us = new UserService("user-123")
console.log(us.getUser("a"))
console.log(us.getUser('b'))
console.log(us.getUser('c'))
console.log(us.getUser('d'))
console.log(us.getUser('a'))
console.log(us.getUser('b'))
console.log(us.getUser('c'))
console.log(us.getUser('d'))

console.log()

const cals = new CalculatorService("user-456");
console.log(cals.calculator("add", 1, 2, 3, 4))
console.log(cals.calculator("multiply", 1, 2, 3, 4))
console.log(cals.calculator("add", 1, 2, 3, 4))
console.log(cals.calculator("multiply", 1, 2, 3, 4))

console.log()
