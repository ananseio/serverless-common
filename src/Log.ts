import * as Logger from 'bunyan';
import { FunctionHandler, HandlerFunction } from './FunctionHandler';

export interface FunctionHandlerWithLog extends FunctionHandler {
  log: Logger;
  traceID?: string;
}

export interface LoggerInitializer {
  initLog(handler: FunctionHandlerWithLog, event: any): void;
}

export { Logger };

export function Log(...initializers: LoggerInitializer[]) {
  return (
    target: FunctionHandlerWithLog,
    name: string,
    desc: TypedPropertyDescriptor<HandlerFunction>): void => {

    const handler: HandlerFunction = desc.value!.decorated || desc.value!;
    function logHandler(this: FunctionHandlerWithLog, event: any): Promise<any> {
      const traceID: string = this.context.clientContext &&
        this.context.clientContext.Custom.traceID ||
        this.context.awsRequestId;

      const invokerID = this.context.clientContext &&
        this.context.clientContext.Custom.invokerID ||
        null;

      const logger = Logger.createLogger({
        name: this.context.functionName,
        version: this.context.functionVersion,
        level: process.env.LOG_LEVEL as Logger.LogLevel || Logger.DEBUG,

        traceID,
        invokerID,
        requestID: this.context.awsRequestId,

        serializers: Logger.stdSerializers
      });

      this.traceID = traceID;
      this.log = logger;
      for (const initializer of initializers) {
        initializer.initLog(this, event);
      }

      logger.info('request start.');

      return handler.call(this, event)
        .catch(error => {
          logger.error(error, 'unexpected error occurred.');
          logger.info('request end.');
          throw error;
        })
        .then(resp => {
          logger.info('request end.');

          return resp;
        });
    }

    desc.value!.decorated = logHandler;
  };
}
