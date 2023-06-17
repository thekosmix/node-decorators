import {Cacheable} from './cache';
import {Loggable} from './log';

class CalculatorService {

    operations = {
        add: (...numbers:number[]) => numbers.reduce((a, b) => a + b),
        subtract: (...numbers:number[]) => numbers.reduce((a, b) => a - b),
        multiply: (...numbers:number[]) => numbers.reduce((a, b) => a * b),
        divide: (...numbers:number[]) => numbers.reduce((a, b) => a / b),
      }
    
    @Cacheable("calc")  
    @Loggable(true, true, "calculator")
    calculator(operation:string, ...numbers:number[]) {
        if (typeof operation !== "string") {
          throw new Error("Invalid operation");
        }
      
        if (!this.operations.hasOwnProperty(operation)) {
          throw new Error("Invalid operation");
        }
      
        return this.operations[operation](...numbers);
      }

}

export { CalculatorService }