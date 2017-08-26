import { checkCondition, fromBase64JSON, toBase64JSON } from './utils';

describe('checkCondition', () => {
  it('should be successful', async (done) => {
    expect(await checkCondition(Promise.resolve('ok'))).toBe('ok');
    done();
  });

  it('should return null when condition failed', async (done) => {
    expect(await checkCondition(Promise.reject({
      code: 'ConditionalCheckFailedException'
    }))).toBeNull();
    done();
  });

  it('should re-throw unknown error', async (done) => {
    const error = {};
    try {
      await checkCondition(Promise.reject(error));
      fail('should not be successful');
    } catch (error) {
      expect(error).toBe(error);
    }
    done();
  });
});

describe('toBase64JSON', () => {
  it('should encode correctly', () => {
    expect(toBase64JSON([1, 2, 3])).toBe('WzEsMiwzXQ==');
  });
});

describe('fromBase64JSON', () => {
  it('should decode correctly', () => {
    expect(fromBase64JSON('WzEsMiwzXQ==')).toEqual([1, 2, 3]);
  });
});
