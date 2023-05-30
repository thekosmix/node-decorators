var redisClient = new Map();  

export function cacheable() {
    return function(target: Function, context) {
        if (context.kind === "method") {
            return function (...args: any[]) {
                var key = args.join("-")
                var value = redisClient.get(key)
                if (value) {
                    console.log(`returning from cache => id: ${key} & value: ${value}`)
                } else {
                    console.log(`Didn't find in cache =>: ${key}`)
                    value = target.apply(this, args)
                    redisClient.set(key, value)
                }
                return value
            }
        }
    }
  }
