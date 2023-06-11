# node-decorators

## What are Decorators
Just like we have `@annotations` in Java Universe (Spring), we have `@decorators` in NodeJS (TypeScript) universe. These 2 enable us to carve out redundant code like caching, logging, validity of parameters etc.

From [TypeScriptLang](https://www.typescriptlang.org/)

A Decorator is a special kind of declaration that can be attached to a class declaration, method, accessor, property, or parameter. Decorators use the form @expression , where expression must evaluate to a function that will be called at runtime with information about the decorated declaration.


## Why use Decorators 
1. Abstract out redundant code 
2. Keep business logic clean
3. Improve developer productivity

Look at this basic example

```
const getUsernameById(String userId){
  const userName = CACHE.get("bucket", userId);
  if(!_.isNil(userName)) {
    return userName;
  }
  
  const user = UserModel.getById(userId);
  CACHE.set("bucket", userId, user.name);
  Log.info(
    method: "getUsernameById"
    key_1: "userId",
    key_1_value: userId,
    key_2: "userName",
    key_2_value: userName
  )
  return user.name;
}
```

This can be reduced to following using decorators
```
@Cacheable
@Loggable
const getUsernameById(String userId){
  const user = UserModel.getById(userId);
  return user.name;
}
```

## How to use this project
```
git clone https://github.com/thekosmix/node-decorators
cd node-decorators
npm i
npm run build
npm start
```

## Features
1. Caching - concated method arguments as `key` and method response as `value`
2. Logging - takes argument `logRequest` & `logResponse` as boolean and extra `arguments` to log along with requests and responses
