import { EventEmitter } from 'events';
import { IncomingMessage } from 'http'

export { Tags } from 'opentracing'

export interface TracerOption {
    /**
     * 每分钟限制记录落盘的数据条数限制，防止大量异常的情况下大量日志写入文件造成磁盘溢出
     */
    limit?: number,
    /**
     * 日志句柄，最小需要实现 info、log、warn 和 error 方法，默认采用 console
     */
    logger?: any

    interval?: number

    apdex: number
}

export interface StartSpanOption {
    childOf?: Span
}

export class Tracer extends EventEmitter {
    /**
     *
     * @param serviceName tracer 的名称
     * @param option  可选参数
     * @param reporter 自定义发送方法，需要实现 report 方法，入参为 span
     */
    constructor(serviceName: string, option?: TracerOption, reporter?: any)

    startSpan(spanName: string, option?: StartSpanOption): Span

    report(span: Span)
}


export interface LogMessage {
    event: string
    payload: any
}

export interface Log {
    startTimeFromFullTrace: number
    logMessage: LogMessage
}

type Tag = {
    [index: string]: string
}

export interface SpanContext {
    serviceName: string
    traceId: string
    spanId: string
    parentSpanId: null | string,
    operationName: string,
    startTime: number,
    rootTime: number,
    duration: null | number,
    logs: Log[],
    tags: Tag[]
}

export class Span {
    constructor(tracer: Tracer, spanName: string)

    randomId(): string

    context(): SpanContext

    log(msg: any): this

    logEvent(eventName: string, payload: any): this

    /**
     *
     * @param tag Tag 名称，可以自定义，一般从 opentracing.Tags 中获取（里面定义了常见的 host、url、statusCode 等链路信
     * @param value Tag 名称对应的值
     */
    setTag(tag: string, value: any): this

    addTags(tag: any): this

    setOperationName(name: string): this

    finish(req: IncomingMessage)
}
