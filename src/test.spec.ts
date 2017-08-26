import { Lambda } from 'aws-sdk';
import { FuncDef, FunctionHandler, Handler } from './FunctionHandler';
import { test } from './test';

const context = {};

const externalFunc1 = {
  Service: 'xyz',
  Function: 'test1'
} as FuncDef<string, string>;

const externalFunc2 = {
  Service: 'xyz',
  Function: 'test2'
} as FuncDef<string, number>;

const externalFunc3 = {
  Service: 'abc',
  Function: 'test1'
} as FuncDef<string, number>;

// tslint:disable-next-line:completed-docs
class TestHandler extends FunctionHandler {
  private t: string;

  @Handler
  public async test1(str: string) {
    expect(this.context).toBe(context as any);
    expect(this.rawEvent).toBe(str);

    return `${str}123`;
  }

  @Handler
  public async test2(str: string) {
    expect(this.context).toEqual({} as any);
    expect(this.t).toBe('xyz');
  }

  @Handler
  public async test3(str: string) {
    expect(await this.invoke(externalFunc1, '123')).toBe('123123');
    expect(await this.invoke(externalFunc2, '456')).toBe(456);
    try {
      await this.invoke(externalFunc3, '456');
      fail('should not be successful');
    } catch (error) {
      expect(error.message).toBe('function abc:test1 should not be invoked');
    }

    return 'ok';
  }
}

describe('Serverless function test helpers', () => {
  it('should test functions', async (done) => {
    const funcDef = {
    } as FuncDef<string, string>;

    const test1 = test(TestHandler, 'test1', funcDef);
    const test2 = test(TestHandler, 'test2', funcDef);

    const result1 = await test1('abc', { context });
    expect(result1).toBe('abc123');

    test1.fields.context = context;
    const result2 = await test1('abc');
    expect(result2).toBe('abc123');

    await test2('abc', { t: 'xyz' });
    done();
  });

  it('should mock functions', async (done) => {
    const mockHandler = test(TestHandler, 'test3', {} as FuncDef<string, string>)
      .func(externalFunc1, async (msg) => {
        expect(msg).toBe('123');

        return `${msg}123`;
      })
      .func(externalFunc2, async function (msg) {
        expect(this.rawEvent === '456');

        return 456;
      });
    expect(await mockHandler('')).toBe('ok');

    done();
  });
});
