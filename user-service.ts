import {Cacheable} from './cache';
import {Loggable} from './log';

class UserService {

    userDict: Map<string, string>

    initialise(){
         this.userDict = new Map<string, string>([
            ["a", "apple"],
            ["b", "ball"],
            ["c", "cat"]
        ]);
    }
  
    @Loggable(true, true)
    @Cacheable()
    getUser(id:string) {
        console.log("Getting value from method")
        return this.userDict.get(id)
    }
  }
  
  const us = new UserService()
  us.initialise();
  console.log(us.getUser("a"))
  console.log(us.getUser('b'))
  console.log(us.getUser('c'))
  console.log(us.getUser('a'))
  console.log(us.getUser('b'))