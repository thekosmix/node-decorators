import { describe, it, expect } from 'vitest';
import { Validate, ValidationError } from '../index';

describe('@Validate Decorator Suite', () => {
  it('should pass through when custom predicate returns true', async () => {
    class Service {
      @Validate((email: string) => email.includes('@') || 'Email must contain @')
      send(email: string) {
        return `Sent to ${email}`;
      }
    }

    const service = new Service();
    expect(await service.send('test@example.com')).toBe('Sent to test@example.com');
  });

  it('should throw ValidationError when custom predicate returns error message', async () => {
    class Service {
      @Validate((email: string) => email.includes('@') || 'Email must contain @')
      send(email: string) {
        return `Sent to ${email}`;
      }
    }

    const service = new Service();
    await expect(service.send('invalid-email')).rejects.toThrow(ValidationError);
    await expect(service.send('invalid-email')).rejects.toThrow('Email must contain @');
  });

  it('should validate using Zod-like safeParse schema', async () => {
    const mockZodSchema = {
      safeParse: (val: any) => {
        if (!val || typeof val.age !== 'number' || val.age < 18) {
          return {
            success: false,
            error: { message: 'Must be 18 or older' },
          };
        }
        return { success: true, data: val };
      },
    };

    class UserService {
      @Validate(mockZodSchema)
      register(user: { name: string; age: number }) {
        return `Registered ${user.name}`;
      }
    }

    const service = new UserService();
    expect(await service.register({ name: 'Bob', age: 25 })).toBe('Registered Bob');
    await expect(service.register({ name: 'Kid', age: 15 })).rejects.toThrow(ValidationError);
  });

  it('should validate multiple arguments using an array of schemas', async () => {
    const isPositiveNumber = (n: number) => n > 0 || 'Must be positive';
    const isNonEmptyString = (s: string) => (s && s.length > 0) || 'Must not be empty';

    class PaymentService {
      @Validate([isNonEmptyString, isPositiveNumber])
      charge(account: string, amount: number) {
        return { account, amount };
      }
    }

    const service = new PaymentService();
    expect(await service.charge('acc-1', 100)).toEqual({ account: 'acc-1', amount: 100 });

    await expect(service.charge('', 100)).rejects.toThrow('Must not be empty');
    await expect(service.charge('acc-1', -50)).rejects.toThrow('Must be positive');
  });
});
