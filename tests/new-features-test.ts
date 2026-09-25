import { Async, Rest, Length } from '../index';

// ### Test for @Length Decorator ###

class User {
  @Length(5, 10)
  username: string;
}

const user = new User();

try {
  user.username = 'test'; // less than 5 characters
} catch (e: any) {
  console.error(e.message);
}

try {
  user.username = 'thisusernameistoolong'; // more than 10 characters
} catch (e: any) {
  console.error(e.message);
}

user.username = 'validuser'; // valid username
console.log(`Username is set to: ${user.username}`);

// ### Test for @Async Decorator ###

class AsyncService {
  @Async
  public myAsyncFunction(message: string) {
    console.log(`${message} from myAsyncFunction`);
  }
}

const asyncService = new AsyncService();
console.log('Calling myAsyncFunction...');
asyncService.myAsyncFunction('Hello');
console.log('...myAsyncFunction was called');

// ### Test for @Rest Decorator ###

class RestService {
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

console.log('Endpoints registered for RestService');