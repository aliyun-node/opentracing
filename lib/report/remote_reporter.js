'use strict';
const NppSpan = require('../span');
const FileSender = require('./file_sender');

class RemoteReporter {
  constructor(tracer, sender) {
    this.logger = tracer.logger;
    this.sender = sender || new FileSender(tracer);
  }

  report(span) {
    if (span instanceof NppSpan)
    {this.sender.append(span.context());}
    if (Array.isArray(span)) {
      span = span.map(s => s instanceof NppSpan && s.context()).filter(s => s);
      this.sender.append(span);
    }
  }
}

module.exports = RemoteReporter;