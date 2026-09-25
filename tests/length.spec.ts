import { describe, it, expect } from 'vitest';
import { Length } from '../index';

describe('@Length Decorator Suite', () => {
  it('should validate minimum length and throw if violated', () => {
    class User {
      @Length(3, 10)
      username: string;
    }

    const user = new User();
    expect(() => {
      user.username = 'ab';
    }).toThrow(/Property 'username' length \(2\) must be at least 3/);
  });

  it('should validate maximum length and throw if violated', () => {
    class User {
      @Length(3, 8)
      username: string;
    }

    const user = new User();
    expect(() => {
      user.username = 'thisisaverylongusername';
    }).toThrow(/Property 'username' length \(23\) must be at most 8/);
  });

  it('should accept valid values and preserve them across instances', () => {
    class User {
      @Length(3, 10)
      username: string;
    }

    const user1 = new User();
    const user2 = new User();

    user1.username = 'valid1';
    user2.username = 'valid2';

    expect(user1.username).toBe('valid1');
    expect(user2.username).toBe('valid2');
  });

  it('should validate array lengths', () => {
    class TagList {
      @Length(1, 3)
      tags: string[];
    }

    const list = new TagList();
    list.tags = ['tag1', 'tag2'];
    expect(list.tags).toEqual(['tag1', 'tag2']);

    expect(() => {
      list.tags = [];
    }).toThrow(/must be at least 1/);

    expect(() => {
      list.tags = ['t1', 't2', 't3', 't4'];
    }).toThrow(/must be at most 3/);
  });
});
