import { Cache } from '../decorators/cache.js';
import { Log } from '../decorators/log.js';
import { Length } from '../decorators/length.js';

class UserService {

    @Length(1,10)
    serviceID: string

    userDict: {}

    constructor(serviceID: string) {
        this.serviceID = serviceID;
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

    @Log(true, true)
    @Cache()
    getUser(id: string) {
        console.log("Getting value from method")
        return this.userDict[id]
    }

}

export { UserService }