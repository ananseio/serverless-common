import { Lambda } from 'aws-sdk';
import { FuncDef, FunctionHandler, Handler } from './FunctionHandler';
import { fromBase64JSON } from './utils';

describe('Serverless function handler', () => {
  it('should invoke functions', async (done) => {
    const event = { user: 'abc' };
    const context: any = { awsRequestId: 'request-id' };
    let clientContext: any;
    let invokeType = 'RequestResponse';

    let resp: any = { ok: true };
    Lambda.prototype.invoke = <any>(() => void 0);
    spyOn(Lambda.prototype, 'invoke').and.callFake((params: Lambda.InvocationRequest) => {
      expect(params.FunctionName).toBe('service-dev-func');
      expect(params.Payload).toBe(JSON.stringify(event));
      if (clientContext) {
        expect(fromBase64JSON(params.ClientContext!)).toEqual(clientContext);
      } else {
        expect(params.ClientContext).toBeUndefined();
      }
      expect(params.InvocationType).toBe(invokeType);

      return {
        promise: () => Promise.resolve({
          Payload: JSON.stringify(resp)
        })
      };
    });

    const handler = new FunctionHandler({ requestContext: { stage: 'dev' } }, context);
    const funcDef = {
      Service: 'service',
      Function: 'func'
    } as FuncDef<{ user: string }, { ok: boolean }>;

    clientContext = { Custom: { invokerID: 'request-id' } };
    const result1 = await handler.invoke(funcDef, event);
    expect(result1).toEqual(resp);

    (handler as any).traceID = 'trace-id';
    clientContext = { Custom: { traceID: 'trace-id', invokerID: 'request-id' } };
    const result2 = await handler.invoke(funcDef, event);
    expect(result2).toEqual(resp);

    resp = {
      errorMessage: 'fail',
      errorType: 'Failure',
      stackTrace: ['function2', 'function1']
    };
    try {
      await handler.invoke(funcDef, event);

      fail('should not be successful');
    } catch (error) {
      expect(error).toEqual(jasmine.any(Error));
      expect(error.message).toBe('fail');
      expect(error.name).toBe('Failure');
      expect(error.stack).toBe('function2\nfunction1');
    }

    resp = {
      errorMessage: 'fail'
    };
    try {
      await handler.invoke(funcDef, event);

      fail('should not be successful');
    } catch (error) {
      expect(error).toEqual(jasmine.any(Error));
      expect(error.message).toBe('fail');
      expect(error.name).toBe('Error');
      expect(error.stack).toBe('');
    }

    try {
      await new FunctionHandler({}, context).invoke(funcDef, event);
      fail('should not be successful');
    } catch (error) {
      expect(error).toEqual(jasmine.any(Error));
    }
    done();

    invokeType = 'Event';
    expect(await handler.trigger(funcDef, event)).toBeUndefined();
  });
});
