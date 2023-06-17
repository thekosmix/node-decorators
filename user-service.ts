import {Cacheable} from './cache';
import {Loggable} from './log';

class UserService {

    userDict: {}

    constructor(){
        this.userDict = {
            a: ["complex", "array"],
            b: {
                key1: "complex",
                key2: "map",
                key3: {
                    subKey1: "complex",
                    subKey2: "object"
                }
            },
            c: "complex string",
            d: 5
        }
    }
  
    @Cacheable()
    @Loggable(true, true)
    getUser(id:string) {
        console.log("Getting value from method")
        return this.userDict[id]
    }

  }

  export { UserService }