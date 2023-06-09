import { Cacheable } from '../decorators/cache';
import { Loggable } from '../decorators/log';

class CalculatorService {

  serviceID: string

  constructor(serviceID: string){
    this.serviceID = serviceID
  }

  operations = {
    add: (...numbers: number[]) => numbers.reduce((a, b) => a + b),
    subtract: (...numbers: number[]) => numbers.reduce((a, b) => a - b),
    multiply: (...numbers: number[]) => numbers.reduce((a, b) => a * b),
    divide: (...numbers: number[]) => numbers.reduce((a, b) => a / b),
  }

  @Cacheable("calc")
  @Loggable(true, true, "calculator")
  calculator(operation: string, ...numbers: number[]) {
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