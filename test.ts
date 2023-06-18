function Min(limit: number) {
    return function(target: Object, propertyKey: string) { 
      let value : string;
      const getter = function() {
        return value;
      };
      const setter = function(newVal: string) {
         if(newVal.length < limit) {
          Object.defineProperty(target, 'errors', {
            value: `Your password should be bigger than ${limit}`
          });
        }
        else {
          value = newVal;
        }      
      }; 
      Object.defineProperty(target, propertyKey, {
        get: getter,
        set: setter
      }); 
    }
  }

  class User {
    username: string;
    @Min(8)
    password: string;
    constructor(username: string, password: string){
        this.username = username;
        this.password = password;
    }    
  }


  let danyUser = new User("dany", "pass");
  console.log(danyUser);
  console.log(danyUser.errors);