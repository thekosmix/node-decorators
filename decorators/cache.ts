import * as NodeCache from 'node-cache';

const defaultCacheOptions = {
    stdTTL: 100, 
    checkperiod: 120
}

const cacheBuckets = {
    
}

function getCacheBucket(bucket:string = "default"): NodeCache {
    var cache = cacheBuckets[bucket]
    if(!cache){
        cache = new NodeCache( defaultCacheOptions )
        cacheBuckets[bucket] = cache
    }
    return cache;
}

export function Cacheable(bucket?:string) {
    return function(target: any, context) {    
        if (context.kind === "method") {
            return function (...args: any[]) {
                var cache = getCacheBucket(bucket)
                var key = args.join("-")
                var value = cache[key]
                if (value) {
                    console.log(`returning from cache => id: ${key} & value: ${value}`)
                } else {
                    console.log(`Didn't find in cache =>: ${key}`)
                    value = target.apply(this, args)
                    cache[key] = value
                }
                return value
            }
        }
    }
}