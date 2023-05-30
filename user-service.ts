import {cacheable} from './cache';
import {loggable} from './log';

class UserService {

    userDict: Map<string, string>

    initialise(){
         this.userDict = new Map<string, string>([
            ["a", "anand"],
            ["b", "bairwa"],
            ["c", "cat"]
        ]);
    }
  
    @cacheable()
    @loggable(true, true)
    get(id:string) {
        console.log("Getting value from method")
        return this.userDict.get(id)
    }
  }
  
  const us = new UserService()
  us.initialise();
  console.log(us.get("a"))
  console.log(us.get('b'))
  console.log(us.get('c'))
  console.log(us.get('a'))
  console.log(us.get('b'))