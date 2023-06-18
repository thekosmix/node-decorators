import { Cacheable } from '../decorators/cache';
import { Loggable } from '../decorators/log';
import { Length } from '../decorators/length';

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

    @Loggable(true, true)
    @Cacheable()
    getUser(id: string) {
        console.log("Getting value from method")
        return this.userDict[id]
    }

}

export { UserService }