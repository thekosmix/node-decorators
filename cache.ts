import * as NodeCache from 'node-cache';
const cache = new NodeCache( { stdTTL: 100, checkperiod: 120 } );

//const cache = {};  

export function Cacheable() {
    return function(target: Function, context) {    
        if (context.kind === "method") {
            return function (...args: any[]) {
                var key = args.join("-")
                var value = cache[key]
                if (value) {
                    console.log(`returning from cache => id: ${key} & value: ${value}`)
                } else {
                    console.log(`Didn't find in cache =>: ${key}`)
                    value = target.apply(this, args)
                    cache[key] = value
                }
                return value //.toString()
            }
        }
    }
  }