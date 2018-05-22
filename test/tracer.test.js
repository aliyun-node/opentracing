'use strict';
const co = require('co');
const fs = require('fs');
const mm = require('mm');
const IncomingMessage = require('http').IncomingMessage;
const path = require('path');
const expect = require('expect.js');
const opentracing = require('..');
const Tracer = require('../lib/tracer');
const FileSender = require('../lib/report/file_sender');
// set log dir
process.env.NODE_LOG_DIR = path.join(__dirname, './logdir');
// mm delay 1~2s
const delay = function (time, ext) {
  time = time || 1;
  ext = ext || 0;
  return new Promise(resolve => {
    setTimeout(resolve, (Math.random() * time + ext) * 1000);
  });
};
// noop callback
const noop = function () { };
// get log file
const logfile = new FileSender({ logger: console, options: { limit: 10 } }).getTraingLogFile();
// on append file
const onMessage = function (tracer) {
  return new Promise((resolve, reject) => {
    tracer.once('append success', resolve);
    tracer.once('append error', reject);
  });
};

describe('tracer & span', function () {
  before(function () {
    if (fs.existsSync(logfile)) {
      fs.unlink(logfile, noop);
    }
  });

  it('tracer should ok with error param', function () {
    try { new Tracer(); }
    catch (e) { expect(e.message).to.be('service name must be string!'); }
    try { new Tracer({}); }
    catch (e) { expect(e.message).to.be('service name must be string!'); }
    let tracer = new Tracer('Test');
    try { tracer.startSpan(); }
    catch (e) { expect(e.message).to.be('span name must be string!'); }
    try { tracer.startSpan({}); }
    catch (e) { expect(e.message).to.be('span name must be string!'); }
  });

  it('span should ok with no parent', function () {
    let tracer = new Tracer('Test');
    let span = tracer.startSpan('test-span');
    expect(span.serviceName).to.be.ok();
    expect(span.traceId).to.be.ok();
    expect(span.spanId).to.be.ok();
    expect(span.spanId.length).to.be(30);
    expect(span.parentSpanId).to.not.be.ok();
    expect(span.operationName).to.be.ok();
    expect(span.startTime).to.be.ok();
    expect(span.duration).to.not.be.ok();
    expect(Array.isArray(span.logs)).to.be.ok();
    expect(span.logs.length).to.be(0);
    expect(Array.isArray(span.tags)).to.be.ok();
    expect(span.tags.length).to.be(0);
  });

  it('span should ok with parent', function () {
    let tracer = new Tracer('Test');
    let parent = tracer.startSpan('test-span-parent');
    let span = tracer.startSpan('test-span', { childOf: parent });
    expect(span.serviceName).to.be.ok();
    expect(span.traceId).to.be.ok();
    expect(span.spanId).to.be.ok();
    expect(span.spanId.length).to.be(30);
    expect(span.parentSpanId).to.be.ok();
    expect(span.operationName).to.be.ok();
    expect(span.startTime).to.be.ok();
    expect(span.duration).to.not.be.ok();
    expect(Array.isArray(span.logs)).to.be.ok();
    expect(Array.isArray(span.tags)).to.be.ok();
  });

  it('span log & set tag should ok', function () {
    let tracer = new Tracer('Test');
    let parent = tracer.startSpan('test-span-parent');
    let span = tracer.startSpan('test-span', { childOf: parent });
    span.log({ name: 'log' });
    span.logEvent('hi', { name: 'logEvent' });
    span.setTag(opentracing.Tags.HTTP_METHOD, 'GET');
    span.addTags({
      [opentracing.Tags.PEER_HOSTNAME]: 'localhost',
      [opentracing.Tags.HTTP_URL]: '/test'
    });

    // check logs
    let logs = span.logs;
    expect(logs.length).to.be(2);
    expect(logs.some(log => log.logMessage.name === 'log')).to.be.ok();
    expect(logs.some(log => log.logMessage.event === 'hi'
      && log.logMessage.payload.name === 'logEvent')).to.be.ok();

    // check tags
    let tags = span.tags;
    expect(tags.length).to.be(3);
    expect(tags.some(tag => tag[opentracing.Tags.HTTP_METHOD] === 'GET')).to.be.ok();
    expect(tags.some(tag => tag[opentracing.Tags.PEER_HOSTNAME] === 'localhost')).to.be.ok();
    expect(tags.some(tag => tag[opentracing.Tags.HTTP_URL] === '/test')).to.be.ok();

    // get context
    let context = span.context();
    expect(context.serviceName).to.be(span.serviceName);
    expect(context.traceId).to.be(span.traceId);
    expect(context.spanId).to.be(span.spanId);
    expect(context.parentSpanId).to.be(span.parentSpanId);
    expect(context.operationName).to.be(span.operationName);
    expect(context.startTime).to.be(span.startTime);
    expect(context.rootTime).to.be(span.rootTime);
    expect(context.duration).to.be(span.duration);
    expect(context.logs).to.be(span.logs);
    expect(context.tags).to.be(span.tags);
  });

  it('span set setOperationName should ok', function () {
    let tracer = new Tracer('Test');
    let span = tracer.startSpan('test-span');
    span.setOperationName('test-span-reset-name');
    expect(span.context().operationName).to.be('test-span-reset-name');
  });

  it('span.finish create tracing log should ok with request', co.wrap(function* () {
    let tracer = new Tracer('Test');
    let request = new IncomingMessage();
    // root span
    let parent = tracer.startSpan('test-span-parent');
    parent.log({ status: 'root' });
    // child span1
    let span1 = tracer.startSpan('test-span-1', { childOf: parent });
    span1.log({ status: 'span1' });
    yield delay(0.5);
    span1.finish(request);
    // child span2
    let span2 = tracer.startSpan('test-span-2', { childOf: parent });
    span2.log({ status: 'span2' });
    yield delay(0.5);
    span2.finish(request);
    // repeat finish will be ignore
    span2.finish(request);
    // root span finish
    parent.finish(request);
    // wait append to logfile
    try { yield onMessage(tracer); }
    catch (e) { expect(e).to.not.be.ok(); }

    // check if tracing log file exists
    expect(fs.existsSync(logfile)).to.be.ok();
    let content = fs.readFileSync(logfile, 'utf8').toString();
    try { content = JSON.parse(content); }
    catch (e) { expect(e).to.not.be.ok(); }
    expect(Array.isArray(content)).to.be.ok();
    expect(content.length).to.be(3);
    // delete log file
    fs.unlink(logfile, noop);
  }));

  it('span.finish create tracing log should ok with no request', co.wrap(function* () {
    let tracer = new Tracer('Test');
    // root span
    let parent = tracer.startSpan('test-span-parent');
    parent.log({ status: 'root' });
    // child span1
    let span1 = tracer.startSpan('test-span-1', { childOf: parent });
    span1.log({ status: 'span1' });
    yield delay(0.5);
    span1.finish();
    // child span2
    let span2 = tracer.startSpan('test-span-2', { childOf: parent });
    span2.log({ status: 'span2' });
    yield delay(0.5);
    span2.finish();
    // root span finish
    parent.finish();
    // wait append to logfile
    try { yield onMessage(tracer); }
    catch (e) { expect(e).to.not.be.ok(); }

    // check if tracing log file exists
    expect(fs.existsSync(logfile)).to.be.ok();
    let content = fs.readFileSync(logfile, 'utf8').toString();
    content = content.split('\n');
    try { content = content.map(c => c && JSON.parse(c)).filter(c => c); }
    catch (e) { expect(e).to.not.be.ok(); }
    expect(Array.isArray(content)).to.be.ok();
    expect(content.length).to.be(3);
    // delete log file
    fs.unlink(logfile, noop);
  }));

  it('log file > limit should give warn message', co.wrap(function* () {
    let tracer = new Tracer('Test', { limit: 10, interval: 1000 });
    let parent = tracer.startSpan('test-span-parent');
    for (let i = 0; i < 20; i++) {
      let span = tracer.startSpan('test-span-1', { childOf: parent });
      span.log({ status: 'span1' });
      span.finish();
    }
    parent.finish();
    // wait append to logfile
    try { yield onMessage(tracer); }
    catch (e) { expect(e).to.not.be.ok(); }

    // do check
    expect(fs.existsSync(logfile)).to.be.ok();
    let content = fs.readFileSync(logfile, 'utf8').toString();
    content = content.split('\n');
    try { content = content.map(c => c && JSON.parse(c)).filter(c => c); }
    catch (e) { expect(e).to.not.be.ok(); }
    expect(Array.isArray(content)).to.be.ok();
    expect(content.length).to.be(10);
    // delete log file
    fs.unlink(logfile, noop);
  }));

  it('clear restrict shoud ok', co.wrap(function* () {
    let tracer = new Tracer('Test', { limit: 5, interval: 50 });
    let parent = tracer.startSpan('test-span-parent');
    for (let i = 0; i < 10; i++) {
      let span = tracer.startSpan('test-span-1', { childOf: parent });
      span.log({ status: 'span1' });
      yield delay(0.05, 0.06);
      span.finish();
    }
    parent.finish();
    // wait append to logfile
    try { yield onMessage(tracer); }
    catch (e) { expect(e).to.not.be.ok(); }

    // do check
    expect(fs.existsSync(logfile)).to.be.ok();
    let content = fs.readFileSync(logfile, 'utf8').toString();
    content = content.split('\n');
    try { content = content.map(c => c && JSON.parse(c)).filter(c => c); }
    catch (e) { expect(e).to.not.be.ok(); }
    expect(Array.isArray(content)).to.be.ok();
    expect(content.length).to.be(11);
    // delete log file
    fs.unlink(logfile, noop);
  }));

  it('append file throw error', co.wrap(function* () {
    mm(fs, 'appendFile', function (file, content, cb) {
      expect(file).to.be(logfile);
      expect(content).to.be.ok();
      setImmediate(() => cb('mock append file error'));
    });
    let tracer = new Tracer('Test', { logger: { error: noop } });
    let span = tracer.startSpan('test-span-parent');
    span.log({ status: 'root' });
    span.finish();
    try { yield onMessage(tracer); }
    catch (e) { expect(e).to.be('mock append file error'); }
    mm.restore();
  }));

  it('should ok with default log dir', function () {
    mm(process.env, 'NODE_LOG_DIR', '');
    let logfile = new FileSender({ logger: console, options: { limit: 10 } }).getTraingLogFile();
    expect(logfile.startsWith('/tmp/')).to.be.ok();
    mm.restore();
  });
});