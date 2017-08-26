import { HTTP as _HTTP, HTTPOptions } from '@ananseio/serverless-handler/aws/HTTP';
import { FunctionHandlerConstructor, HandlerFunction } from '@ananseio/serverless-handler/FunctionHandler';
import { APIGatewayEvent } from 'aws-lambda';
import { FunctionHandlerWithLog } from './Log';

export function HTTP(options?: HTTPOptions) {
  return _HTTP(options);
}

export namespace HTTP {
  export interface Event<Body = never> extends _HTTP.Event<Body> { }
  export interface Response<Body> extends _HTTP.Response<Body> { }

  export const TraceHeader = 'X-Trace-ID';

  export function initLog(handler: FunctionHandlerWithLog, event: APIGatewayEvent): void {
    const traceHeaderName = Object.keys(event.headers)
      .find(headerName => headerName.toLowerCase() === TraceHeader.toLowerCase());

    const requestID = event.requestContext.requestId;
    const traceID = (traceHeaderName && event.headers[traceHeaderName]) || requestID;

    handler.traceID = traceID;
    handler.log.fields.traceID = traceID;
    handler.log.fields.requestID = requestID;
    handler.log.fields.stage = event.requestContext.stage;
  }
}
