export function Log(logRequest: boolean = false, logResponse: boolean = true, ...logArgs: any[]) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            var logStr = new Date().toISOString().concat(" - ").concat(propertyKey)
            if(logRequest) {
                logStr = logStr.concat(" - Request: ").concat(...args)
            }

            var response = originalMethod.apply(this, args)
            
            if(logResponse){
                logStr = logStr.concat(" - Response: ").concat(JSON.stringify(response))
            }

            if(logArgs.length){
                logStr = logStr.concat(" - Addional Info: ").concat(logArgs.join(" "))
            }
            
            console.log(logStr)
            return response
        }

        return descriptor;
    }
  }