'use strict';
const LOGS_RECORDED = Symbol('NPP::LOGS_RECORDED');
const CACHE_TRACING_LOGS = Symbol('NPP::CACHE_TRACING_LOGS');
const idGenerator = require('./id_generator');
const Request = require('http').IncomingMessage;

class NppSpan {
  constructor(tracer, spanName) {
    this.logger = tracer.logger;
    this.tracer = tracer;
    // span context
    this.serviceName = tracer.serviceName;
    this.traceId = null;
    this.spanId = NppSpan.randomId();
    this.parentSpanId = null;
    this.operationName = spanName;
    this.startTime = Date.now();
    this.rootTime = null;
    this.duration = null;
    this.logs = [];
    this.tags = [];
  }

  static randomId() {
    return idGenerator.generate();
  }

  context() {
    return {
      serviceName: this.serviceName,
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      operationName: this.operationName,
      startTime: this.startTime,
      rootTime: this.rootTime,
      duration: this.duration,
      logs: this.logs,
      tags: this.tags
    };
  }

  log(msg) {
    this.logs.push({
      startTimeFromFullTrace: Date.now() - this.rootTime || 0,
      logMessage: msg
    });
    return this;
  }

  logEvent(eventName, payload) {
    return this.log({ event: eventName, payload });
  }

  setTag(tag, value) {
    this.tags.push({ [tag]: value });
    return this;
  }

  addTags(keyValueMap) {
    let keys = Object.keys(keyValueMap);
    keys.forEach(key => this.tags.push({ [key]: keyValueMap[key] }));
    return this;
  }

  setOperationName(name) {
    this.operationName = name;
    return this;
  }

  finish(req) {
    this.duration = Date.now() - this.startTime;
    if (req && req instanceof Request) {
      if (req[LOGS_RECORDED]) {
        return;
      }
      if (!(req[CACHE_TRACING_LOGS] && Array.isArray(req[CACHE_TRACING_LOGS]))) {
        req[CACHE_TRACING_LOGS] = [];
      }
      if (!req[CACHE_TRACING_LOGS].includes(this)) {
        req[CACHE_TRACING_LOGS].push(this);
      }
      if (!this.parentSpanId) {
        let apdex = this.tracer.options && this.tracer.options.apdex;
        if (isNaN(apdex) || apdex < 100) {
          apdex = 100;
        }
        if (this.duration > 4 * apdex) {
          this.tracer.report(req[CACHE_TRACING_LOGS]);
        }
        req[CACHE_TRACING_LOGS] = [];
        req[LOGS_RECORDED] = true;
      }
      return;
    }
    this.logger.warn('span.finish without request will cause some problem, please use "span.finish(req)..."');
    this.tracer.report(this);
  }
}

module.exports = NppSpan;