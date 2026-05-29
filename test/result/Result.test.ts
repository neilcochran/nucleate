import type { Result } from '../../src/result/Result';
import { SuccessResult, FailureResult, success, failure } from '../../src/result/Result';

describe('Result module', () => {
  describe('success helper', () => {
    test('creates a SuccessResult with the data payload', () => {
      const result = success('hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
      expect(result).toBeInstanceOf(SuccessResult);
    });

    test('preserves data type information', () => {
      const result = success(42);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    test('handles complex types', () => {
      const obj = { name: 'foo', count: 3 };
      const result = success(obj);
      expect(result.data).toEqual(obj);
    });
  });

  describe('failure helper', () => {
    test('creates a FailureResult with a string error', () => {
      const result = failure('something went wrong');
      expect(result.success).toBe(false);
      expect(result.error).toBe('something went wrong');
      expect(result).toBeInstanceOf(FailureResult);
    });

    test('creates a FailureResult with a custom error type', () => {
      interface CustomError {
        code: number;
        message: string;
      }
      const err: CustomError = { code: 42, message: 'nope' };
      const result = failure(err);
      expect(result.error).toEqual(err);
    });
  });

  describe('direct discriminated-union narrowing on result.success', () => {
    test('if (result.success) narrows to SuccessResult', () => {
      const result: Result<string> = success('ok');
      if (result.success) {
        expect(result.data).toBe('ok');
      } else {
        throw new Error('expected success');
      }
    });

    test('if (!result.success) narrows to FailureResult', () => {
      const result: Result<string> = failure('boom');
      if (!result.success) {
        expect(result.error).toBe('boom');
      } else {
        throw new Error('expected failure');
      }
    });
  });

  describe('class methods on Result', () => {
    test('.map on a success transforms the data', () => {
      const r = success(5).map(n => n + 1);
      expect(r.data).toBe(6);
    });

    test('.map on a failure passes through', () => {
      const r: Result<number, string> = failure('e');
      const mapped = r.map(n => n + 1);
      expect(!mapped.success).toBe(true);
    });

    test('.chain on a success runs the mapper', () => {
      const r = success(5).chain(n => success(n * 2));
      if (r.success) {
        expect(r.data).toBe(10);
      }
    });

    test('.chain on a failure short-circuits', () => {
      const mapper = jest.fn((n: number) => success(n * 2));
      const r: Result<number, string> = failure('e');
      r.chain(mapper);
      expect(mapper).not.toHaveBeenCalled();
    });

    test('.mapError transforms the failure payload', () => {
      const r: Result<number, string> = failure('e');
      const mapped = r.mapError(e => `[wrapped] ${e}`);
      if (!mapped.success) {
        expect(mapped.error).toBe('[wrapped] e');
      }
    });

    test('.mapError on a success is a no-op', () => {
      const r = success(3).mapError(() => 'whatever');
      expect(r.data).toBe(3);
    });

    test('.unwrap on success returns the data', () => {
      expect(success(11).unwrap()).toBe(11);
    });

    test('.unwrap on failure throws', () => {
      expect(() => failure('e').unwrap()).toThrow('e');
    });

    test('.unwrap on a non-string failure throws a generic message', () => {
      const r = failure({ code: 1 });
      expect(() => r.unwrap()).toThrow('Result is a failure');
    });

    test('.unwrap preserves the structured payload on Error.cause for non-string errors', () => {
      const payload = { kind: 'invalid-input', field: 'name' } as const;
      const r = failure(payload);
      try {
        r.unwrap();
        throw new Error('unwrap was expected to throw but did not');
      } catch (caught) {
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toBe('Result is a failure');
        expect((caught as Error).cause).toEqual(payload);
      }
    });

    test('.unwrapOr returns data on success and default on failure', () => {
      expect(success(11).unwrapOr(0)).toBe(11);
      const r: Result<number, string> = failure('e');
      expect(r.unwrapOr(99)).toBe(99);
    });

    test('.match runs the matching handler', () => {
      const ok = success(3).match({
        success: n => `ok:${n}`,
        failure: () => 'err',
      });
      expect(ok).toBe('ok:3');

      const err = failure('boom').match<string>({
        success: () => 'ok',
        failure: e => `err:${e}`,
      });
      expect(err).toBe('err:boom');
    });
  });

  describe('isSuccess / isFailure as instance methods', () => {
    test('isSuccess() returns true on a success', () => {
      const r: Result<number, string> = success(1);
      expect(r.isSuccess()).toBe(true);
      expect(r.isFailure()).toBe(false);
    });

    test('isFailure() returns true on a failure', () => {
      const r: Result<number, string> = failure('e');
      expect(r.isFailure()).toBe(true);
      expect(r.isSuccess()).toBe(false);
    });
  });
});
