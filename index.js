'use strict';
const opentracing = require('opentracing');

module.exports = {
  Tags: opentracing.Tags,
  Tracer: require('./lib/tracer')
}