import {Cacheable} from './cache';
import {Loggable} from './log';

class UserService {

    userDict: {}

    initialise(){
        const a = ["complex", "array"]
        const b = {
            key1: "complex",
            key2: "map",
            key3: {
                subKey1: "complex",
                subKey2: "object"
            }
        }
        const c = "complex string"
        const d = 5
                
         this.userDict = {
            a: a,
            b: b,
            c: c,
            d: d
         }

    }
  
    @Cacheable()
    @Loggable(true, true)
    getUser(id:string) {
        console.log("Getting value from method")
        return this.userDict[id]
    }
  }
  
  const us = new UserService()
  us.initialise();
  console.log(us.getUser("a"))
  console.log()
  console.log(us.getUser('b'))
  console.log()
  console.log(us.getUser('c'))
  console.log()
  console.log(us.getUser('d'))
  console.log()
  console.log(us.getUser('a'))
  console.log()
  console.log(us.getUser('b'))
  console.log()
  console.log(us.getUser('c'))
  console.log()
  console.log(us.getUser('d'))