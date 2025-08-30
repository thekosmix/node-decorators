export function Async(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> | void {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
        setTimeout(() => {
            originalMethod.apply(this, args);
        }, 0);
    };

    return descriptor;
}
