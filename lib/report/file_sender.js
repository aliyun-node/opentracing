'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment');
const CLEAR_RESTRICT = Symbol('NPP::CLEAR_RESTRICT');

class FileSender {
  constructor(tracer) {
    this.logger = tracer.logger;
    this.logDir = process.env.NODE_LOG_DIR || '/tmp/';
    this.sendingLimit = tracer.options.limit;
    this.restrict = { start: Date.now(), count: 0 };
  }

  append(spanContext) {
    let logger = this.logger;
    if (Date.now() - this.restrict.start > 60 * 1000)
      this[CLEAR_RESTRICT]();
    else if (this.sendingLimit !== 'unlimited' && this.restrict.count >= this.sendingLimit) {
      logger.warn(`In 1 min, sending more than ${this.sendingLimit} tracing log, so this will be ignore...`);
      return;
    }
    let logFile = path.join(this.logDir, `tracing-${moment().format('YYYYMMDD')}.log`);
    // append to log file
    fs.appendFile(logFile, Buffer.from(JSON.stringify(spanContext) + os.EOL), err => err && logger.error(err));
    this.restrict.count++;
  }

  get [CLEAR_RESTRICT]() {
    return () => {
      this.restrict.start = Date.now();
      this.restrict.count = 0;
    }
  }
}

module.exports = FileSender;