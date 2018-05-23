'use strict';
const NppSpan = require('./span');
const RemoteReporter = require('./report/remote_reporter');
const defaultOptions = require('./default_options');
const BUILD_OPTIONS = Symbol('NPP::BUILD_OPTIONS');
const EventEmitter = require('events').EventEmitter;

class NppTracer extends EventEmitter {
  constructor(serviceName, options, reporter) {
    super();
    if (!serviceName || typeof serviceName !== 'string') {
      throw new Error('service name must be string!');
    }
    this.serviceName = serviceName;
    this.options = this[BUILD_OPTIONS](options);
    this.logger = this.options.logger;
    this.reporter = reporter || new RemoteReporter(this);
  }

  startSpan(spanName, options) {
    if (!spanName || typeof spanName !== 'string') {
      throw new Error('span name must be string!');
    }
    options = options || {};
    let parentSpan = options.childOf;
    let span = new NppSpan(this, spanName);
    if (parentSpan) {
      span.traceId = parentSpan.traceId;
      span.parentSpanId = parentSpan.spanId;
      span.rootTime = parentSpan.rootTime;
    } else {
      span.traceId = NppSpan.randomId();
      span.rootTime = span.startTime;
    }
    return span;
  }

  report(span) {
    this.reporter.report(span);
  }

  get [BUILD_OPTIONS]() {
    return function (options) {
      options = options || {};
      return Object.assign({}, defaultOptions, options);
    };
  }
}

module.exports = NppTracer;