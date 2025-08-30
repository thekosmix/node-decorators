import NodeCache from 'node-cache';

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

export function Cache(bucket?:string) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {    
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            var cache = getCacheBucket(bucket)
            var key = args.join("-")
            var value = cache.get(key)
            if (value) {
                console.log(`returning from cache => id: ${key} & value: ${value}`)
            } else {
                console.log(`Didn't find in cache =>: ${key}`)
                value = originalMethod.apply(this, args)
                cache.set(key, value)
            }
            return value
        }

        return descriptor;
    }
}