import { Context } from 'aws-lambda';
import { FuncDef, FunctionHandler, FunctionHandlerConstructor, HandlerFunction } from './FunctionHandler';

export interface HandlerAttributes {
  context?: Partial<Context>;
  [name: string]: any;
}

export interface TestInvoker<Event, Response> {
  (event: Partial<Event>, attrs?: HandlerAttributes): Promise<Response>;
  fields: HandlerAttributes;

  func<Func extends FuncDef>(func: Func, mockHandler: HandlerFunction<Func>): this;
}

/**
 * Creates test invoker for the specified handler
 */
export function test<HandlerType extends FunctionHandler, Handler extends keyof HandlerType, Func extends FuncDef>(
  handler: FunctionHandlerConstructor<HandlerType>,
  name: Handler,
  functionDef: Func
): TestInvoker<Func['Event'], Func['Response']> {
  let invoker: TestInvoker<Func['Event'], Func['Response']>;

  const mocks = new Map<FuncDef, HandlerFunction>();
  const func = <InvokeFunc extends FuncDef>(
    funcDef: InvokeFunc,
    mockHandler: HandlerFunction<InvokeFunc>
  ) => {
    mocks.set(funcDef, mockHandler);

    return invoker;
  };

  const handlerType = class extends (handler as typeof FunctionHandler) {
    public async invoke<InvokeFunc extends FuncDef>(funcDef: InvokeFunc, event: InvokeFunc['Event']) {
      const mockFunc = mocks.get(funcDef);
      if (!mockFunc) {
        throw new Error(`function ${funcDef.Service}:${funcDef.Function} should not be invoked`);
      }

      return mockFunc.call(this, event);
    }
  };

  invoker = Object.assign(
    (event: Func['Event'], attrs?: HandlerAttributes) => {
      attrs = Object.assign({}, attrs, invoker.fields);
      const handlerObj = new handlerType(event, (attrs && attrs.context || {}) as Context);
      Object.assign(handlerObj, attrs);

      return (handlerObj as HandlerType)[name](event);
    },
    {
      fields: {}, func
    });

  return invoker;
}
