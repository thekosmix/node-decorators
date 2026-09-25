import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Log, LoggerManager } from '../index';

describe('@Log Decorator Suite', () => {
  const testLogPath = path.resolve(__dirname, 'test-output.log');

  beforeEach(() => {
    LoggerManager.reset();
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  it('should dispatch log entry to console transport', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class UserService {
      @Log({ logRequest: true, logResponse: true })
      greet(name: string): string {
        return `Hello, ${name}!`;
      }
    }

    const service = new UserService();
    const result = service.greet('Alice');

    expect(result).toBe('Hello, Alice!');
    expect(consoleSpy).toHaveBeenCalled();
    const loggedMessage = consoleSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('greet');
    expect(loggedMessage).toContain('Alice');
    expect(loggedMessage).toContain('Hello, Alice!');

    consoleSpy.mockRestore();
  });

  it('should write logs to a file using FileTransport', () => {
    LoggerManager.enableFileLogging(testLogPath, 'json');

    class OrderService {
      @Log({ logRequest: true, logResponse: true })
      createOrder(id: string, amount: number) {
        return { id, amount, status: 'created' };
      }
    }

    const service = new OrderService();
    service.createOrder('order-101', 250);

    expect(fs.existsSync(testLogPath)).toBe(true);
    const content = fs.readFileSync(testLogPath, 'utf-8');
    const parsed = JSON.parse(content.trim());

    expect(parsed.method).toBe('createOrder');
    expect(parsed.args).toEqual(['order-101', 250]);
    expect(parsed.result).toEqual({ id: 'order-101', amount: 250, status: 'created' });
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should dispatch to custom logger transport', () => {
    const customLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    LoggerManager.setCustomLogger(customLogger);

    class AuthService {
      @Log({ level: 'info' })
      verifyToken(token: string) {
        return true;
      }
    }

    const service = new AuthService();
    service.verifyToken('jwt-xyz');

    expect(customLogger.info).toHaveBeenCalled();
    const entry = customLogger.info.mock.calls[0][0];
    expect(entry.method).toBe('verifyToken');
  });

  it('should mask sensitive parameters', () => {
    const customLogger = {
      info: vi.fn(),
    };
    LoggerManager.setCustomLogger(customLogger);

    class LoginService {
      @Log({ maskParams: ['password', 'apiKey'] })
      login(payload: { username: string; password: string; apiKey: string }) {
        return { success: true };
      }
    }

    const service = new LoginService();
    service.login({ username: 'john', password: 'supersecret', apiKey: 'secret-key-123' });

    expect(customLogger.info).toHaveBeenCalled();
    const entry = customLogger.info.mock.calls[0][0];
    expect(entry.args[0].username).toBe('john');
    expect(entry.args[0].password).toBe('***MASKED***');
    expect(entry.args[0].apiKey).toBe('***MASKED***');
  });

  it('should log errors with stack trace and rethrow', async () => {
    const customLogger = {
      error: vi.fn(),
    };
    LoggerManager.setCustomLogger(customLogger);

    class FaultyService {
      @Log()
      async failOperation() {
        throw new Error('Database connection failed');
      }
    }

    const service = new FaultyService();

    await expect(service.failOperation()).rejects.toThrow('Database connection failed');
    expect(customLogger.error).toHaveBeenCalled();
    const errorEntry = customLogger.error.mock.calls[0][0];
    expect(errorEntry.error.message).toBe('Database connection failed');
    expect(errorEntry.level).toBe('error');
  });
});
