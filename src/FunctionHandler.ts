import { APIGatewayEvent, Context } from 'aws-lambda';
import { Lambda } from 'aws-sdk';

import { Handler } from '@ananseio/serverless-handler/aws';
import { FunctionHandler as FuncHandler } from '@ananseio/serverless-handler/aws';
import { FunctionHandlerConstructor, HandlerFunction } from '@ananseio/serverless-handler/FunctionHandler';

import { toBase64JSON } from './utils';

export interface FuncDef<Event = any, Response = any> {
  Service: string;
  Function: string;
  Event: Event;
  Response: Response;
}

export interface HandlerFunction<Func extends FuncDef = any>
  extends HandlerFunction<Context, Func['Event'], Func['Response']> {
}

export { Handler, FunctionHandlerConstructor };

/**
 * Serverless Function Handler
 */
export class FunctionHandler extends FuncHandler {
  private lambda = new Lambda();

  /**
   * Invoke another lambda function
   * @param func the function definition
   * @param event the event payload
   * @param trigger whether the invocation is asynchronous (with InvocationType = Event)
   */
  public async invoke<Func extends FuncDef>(func: Func, event: Func['Event'], trigger = false): Promise<Func['Response']> {
    const rawEvent = this.rawEvent as APIGatewayEvent;
    const stage = rawEvent.requestContext && rawEvent.requestContext.stage || process.env.STAGE;
    if (!stage) {
      throw new Error('Stage is not set!');
    }

    const context = {
      Custom: { invokerID: this.context.awsRequestId } as Record<string, string>
    };
    const traceID: string | undefined = (this as any).traceID;
    if (traceID) {
      context.Custom.traceID = traceID;
    }

    const resp = await this.lambda.invoke({
      FunctionName: `${func.Service}-${stage}-${func.Function}`,
      Payload: JSON.stringify(event),
      ClientContext: context && toBase64JSON(context),
      InvocationType: trigger ? 'Event' : 'RequestResponse'
    }).promise();

    if (trigger) {
      return null;
    }

    const respObj = JSON.parse(String(resp.Payload));
    if (respObj.errorMessage) {
      const err = new Error(respObj.errorMessage);
      err.name = respObj.errorType || Error.name;
      err.stack = respObj.stackTrace && respObj.stackTrace.join('\n') || '';
      throw err;
    }

    return respObj;
  }

  /**
   * Invoke another lambda function asynchronously (with InvocationType = Event)
   * @param func the function definition
   * @param event the event payload
   */
  public async trigger<Func extends FuncDef>(func: Func, event: Func['Event']) {
    await this.invoke(func, event, true);
  }
}
