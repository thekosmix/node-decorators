
import { Async, Rest } from '../index';

class TestService {

    @Async
    public async myAsyncFunction(message: string) {
        console.log(`${message} from myAsyncFunction`);
    }

    @Rest
    public getUser(id: string) {
        return { id: id, name: 'test user' };
    }

    @Rest
    public addUser(user: any) {
        console.log('user added', user);
        return { ...user, id: 'new-id' };
    }
}

const testService = new TestService();
testService.myAsyncFunction('Hello');

console.log('\n\nTo test the @Rest decorator, run this file and then send requests to the following endpoints:');
console.log('GET http://localhost:3000/api/user?id=123');
console.log('POST http://localhost:3000/api/user with body { "name": "test" }');
