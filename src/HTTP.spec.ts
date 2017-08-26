import { ClientContext, Context } from 'aws-lambda';
import * as Logger from 'bunyan';
import { FuncDef, FunctionHandler, Handler } from './FunctionHandler';
import { HTTP } from './HTTP';
import { Log } from './Log';

// tslint:disable:completed-docs
class TestHandler extends FunctionHandler {
  public static test1: (event: any, context: Context) => Promise<void>;
  public static test2: (event: any, context: Context) => Promise<void>;

  public log: Logger;
  public traceID: string;

  @Handler
  @Log(HTTP)
  @HTTP()
  public async test1() {
    expect(this.log.fields.traceID).toBe('trace-id');
    expect(this.log.fields.requestID).toBe('api-request-id');
    expect(this.log.fields.stage).toBe('dev');
    expect(this.traceID).toBe('trace-id');

    return this.resp.ok();
  }

  @Handler
  @Log(HTTP)
  @HTTP()
  public async test2() {
    expect(this.log.fields.traceID).toBe('api-request-id');
    expect(this.log.fields.requestID).toBe('api-request-id');
    expect(this.traceID).toBe('api-request-id');

    return this.resp.ok();
  }
}

describe('HTTP decorator', () => {
  const event = {
    httpMethod: 'POST',
    headers: {
      'x-trace-ID': 'trace-id'
    },
    requestContext: {
      requestId: 'api-request-id',
      stage: 'dev'
    }
  };
  const context: any = {
    awsRequestId: 'request-id',
    functionName: 'handler',
    functionVersion: 'latest'
  };

  beforeAll(() => {
    spyOn(process.stdout, 'write').and.returnValue(undefined);
  });

  it('should extract logging data from HTTP event', async (done) => {
    await TestHandler.test1(event, context);
    await TestHandler.test2({ ...event, headers: {} }, context);
    done();
  });
});
