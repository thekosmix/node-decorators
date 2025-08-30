import { Cache } from '../decorators/cache';
import { Log } from '../decorators/log';

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

  @Cache("calc")
  @Log(true, true, "calculator")
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