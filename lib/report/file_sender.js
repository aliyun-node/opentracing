'use strict';
const path = require('path');
const moment = require('moment');
const Footprint = require('footprint');
const CLEAR_RESTRICT = Symbol('NPP::CLEAR_RESTRICT');

class FileSender {
  constructor(tracer) {
    this.tracer = tracer;
    this.logger = tracer.logger;
    this.logDir = process.env.NODE_LOG_DIR || '/tmp/';
    this.sendingLimit = tracer.options.limit;
    this.interval = tracer.options.interval;
    this.restrict = { start: Date.now(), count: 0 };
    this.appender = new Footprint({
      logdir: this.logDir,
      prefix: 'tracing-',
      enable: true,
      format: Footprint.YYYYMMDD
    });
  }

  getTraingLogFile() {
    return path.join(this.logDir, `tracing-${moment().format('YYYYMMDD')}.log`);
  }

  append(spanContext) {
    let logger = this.logger;
    if (Date.now() - this.restrict.start > this.interval)
    { this[CLEAR_RESTRICT](); }
    else if (this.sendingLimit !== 'unlimited' && this.restrict.count >= this.sendingLimit) {
      logger.warn(`In ${this.interval / 1000}s, sending more than`
        + ` ${this.sendingLimit} tracing log, so this will be ignore...`);
      return;
    }
    // append to log file
    this.appender.log(JSON.stringify(spanContext));
    this.restrict.count++;
  }

  get [CLEAR_RESTRICT]() {
    return () => {
      this.restrict.start = Date.now();
      this.restrict.count = 0;
    };
  }
}

module.exports = FileSender;