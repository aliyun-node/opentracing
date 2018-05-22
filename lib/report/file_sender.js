'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment');
const CLEAR_RESTRICT = Symbol('NPP::CLEAR_RESTRICT');

class FileSender {
  constructor(tracer) {
    this.tracer = tracer;
    this.logger = tracer.logger;
    this.logDir = process.env.NODE_LOG_DIR || '/tmp/';
    this.sendingLimit = tracer.options.limit;
    this.interval = tracer.options.interval;
    this.restrict = { start: Date.now(), count: 0 };
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
    let logFile = this.getTraingLogFile();
    // append to log file
    fs.appendFile(logFile, Buffer.from(JSON.stringify(spanContext) + os.EOL), err => {
      if (err) {
        logger.error(err);
        this.tracer.emit('append error', err);
        return;
      }
      this.tracer.emit('append success');
    });
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