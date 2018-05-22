'use strict';
const mm = require('mm');
const expect = require('expect.js');
const internalIp = require('internal-ip');
const idGenerator = require('../lib/id_generator');
const IdGenerator = idGenerator.IdGenerator;

describe('id generator', function () {
  it('decimal to hex string should ok', function () {
    expect(IdGenerator.decimalToHexString(-1)).to.be('ffffffff');
    expect(IdGenerator.decimalToHexString(-999)).to.be('fffffc19');
  });

  it('get ip 16 should ok', function () {
    expect(IdGenerator.getIP_16('10.11.12.13')).to.be('0a0b0c0d');
  });

  it('get hex pid should ok', function () {
    expect(IdGenerator.getHexPid(-1)).to.be('0000');
    expect(IdGenerator.getHexPid(10)).to.be('000a');
  });

  it('generate should ok', function () {
    expect(idGenerator.generate()).to.be.ok();
    let id = idGenerator.generate('10.11.12.13');
    let regexp = new RegExp(`0a0b0c0d([0-9]*)1001${idGenerator.PID_FLAG}${IdGenerator.getHexPid(process.pid)}`);
    expect(regexp.test(id)).to.be.ok();
  });

  it('generator ipv4 id should ok', function () {
    let ipAddress = internalIp.v4.sync() || internalIp.v6.sync();
    expect(idGenerator.generateIpv4Id()).to.be(ipAddress.split('.').join(''));
  });

  it('generator ipv4 by id should ok', function () {
    let ipAddress = internalIp.v4.sync() || internalIp.v6.sync();
    expect(idGenerator.generateIpv4IdByIp()).to.be(ipAddress.split('.').join(''));
    expect(idGenerator.generateIpv4IdByIp('8.8.8.8')).to.be('8888');
  });

  it('get next id should ok', function () {
    let test = function (nextid, id) {
      let regexp = new RegExp(`0a0b0c0d([0-9]*)${nextid}${idGenerator.PID_FLAG}${IdGenerator.getHexPid(process.pid)}`);
      return regexp.test(id);
    };
    let generator = new IdGenerator();
    for (let i = 0; i < 7999; i++) {
      generator.generate('10.11.12.13');
    }
    let id_8999 = generator.generate('10.11.12.13');
    expect(test(8999, id_8999)).to.be.ok();
    let id_9000 = generator.generate('10.11.12.13');
    expect(test(9000, id_9000)).to.be.ok();
    let id_9001 = generator.generate('10.11.12.13');
    expect(test(1000, id_9001)).to.be.ok();
    let id_9002 = generator.generate('10.11.12.13');
    expect(test(1001, id_9002)).to.be.ok();
    let id_9003 = generator.generate('10.11.12.13');
    expect(test(1002, id_9003)).to.be.ok();
  });

  it('should wrong with no ipv4 address', function () {
    mm(internalIp.v4, 'sync', function () {
      return '';
    });
    mm(process, 'pid', '');
    let generator = new IdGenerator();
    let id = generator.generate();
    let regexp = new RegExp(`ffffffff([0-9]*)1000${idGenerator.PID_FLAG}0000`);
    expect(regexp.test(id)).to.be.ok();
    expect(id.length).to.be(30);
    mm.restore();
  });
});