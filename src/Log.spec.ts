import { ClientContext, Context } from 'aws-lambda';
import * as Logger from 'bunyan';
import { FuncDef, FunctionHandler, Handler } from './FunctionHandler';
import { Log } from './Log';
import { test } from './test';

// tslint:disable:completed-docs
class TestHandler extends FunctionHandler {
  public static handler: (event: any, context: Context) => Promise<{ traceID: string }>;
  public static logInitTest: (event: string, context: Context) => Promise<void>;

  public log: Logger;
  public traceID: string;

  @Handler
  @Log()
  public async handler() {
    const id = this.traceID;
    if (!id) {
      throw new Error('invalid trace id');
    }

    this.log.info(`test: ${id}`);

    return { traceID: id };
  }

  @Handler
  @Log({ initLog: (handler, event) => handler.traceID = event })
  public async logInitTest(id: string) {
    expect(this.traceID === id);
  }
}

describe('Log decorator', () => {
  it('should add logger and trace ID', async (done) => {
    const writeSpy = spyOn(process.stdout, 'write').and.returnValue(undefined);
    const logSpy = spyOn(console, 'log').and.returnValue(undefined);

    const resp1 = await TestHandler.handler(undefined, {
      awsRequestId: 'trace-id',
      functionName: 'handler',
      functionVersion: 'latest'
    } as Context);
    expect(resp1).toEqual({ traceID: 'trace-id' });
    expect(writeSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).not.toHaveBeenCalled();
    writeSpy.calls.reset();

    const resp2 = await TestHandler.handler(undefined, {
      awsRequestId: 'something',
      clientContext: {
        Custom: { traceID: 'trace-id' }
      },
      functionName: 'handler',
      functionVersion: 'latest'
    } as Context);
    expect(resp2).toEqual({ traceID: 'trace-id' });
    expect(writeSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).not.toHaveBeenCalled();

    done();
  });

  it('should log unexpected error', async (done) => {
    const writeSpy = spyOn(process.stdout, 'write').and.returnValue(undefined);
    const logSpy = spyOn(console, 'log').and.returnValue(undefined);

    try {
      const resp = await TestHandler.handler(undefined, {
        awsRequestId: '',
        functionName: 'handler',
        functionVersion: 'latest'
      } as Context);
    } catch (error) {
      expect(error.message).toBe('invalid trace id');
    }
    expect(writeSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).not.toHaveBeenCalled();

    done();
  });

  it('should initialize logger data', async (done) => {
    const writeSpy = spyOn(process.stdout, 'write').and.returnValue(undefined);
    const logSpy = spyOn(console, 'log').and.returnValue(undefined);

    const resp = await TestHandler.handler('trace-id', {
      awsRequestId: 'request-id',
      functionName: 'handler',
      functionVersion: 'latest'
    } as Context);

    done();
  });
});
