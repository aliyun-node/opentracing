'use strict';
const internalIp = require('internal-ip');

class IdGenerator {
  constructor() {
    this.count = 1000;
    this.regexp = new RegExp('\\b((?!\\d\\d\\d)\\d+|1\\d\\d|2[0-4]\\d|25[0-5])\\' +
      '.((?!\\d\\d\\d)\\d+|1\\d\\d|2[0-4]\\d|25[0-5])\\' +
      '.((?!\\d\\d\\d)\\d+|1\\d\\d|2[0-4]\\d|25[0-5])\\' +
      '.((?!\\d\\d\\d)\\d+|1\\d\\d|2[0-4]\\d|25[0-5])\\b');
    this.PID = '0000';
    this.PID_FLAG = 'd';
    this.IP_16 = 'ffffffff';
    this.IP_int = '255255255255';
    // get local ipv4 & pid
    let ipAddress = internalIp.v4.sync();
    if (ipAddress) {
      this.IP_16 = IdGenerator.getIP_16(ipAddress);
      this.IP_int = IdGenerator.getIP_int(ipAddress);
    }
    if (process.pid) {
      this.PID = IdGenerator.getHexPid(process.pid);
    }
  }

  static decimalToHexString(number) {
    if (number < 0) {
      number = 0xFFFFFFFF + number + 1;
    }
    return number.toString(16);
  }

  static getIP_16(ip) {
    let ips = ip.split('.');
    let sb = ips.reduce((pre, ip) => {
      let hex = IdGenerator.decimalToHexString(parseInt(ip));
      if (hex.length === 1) {
        pre = `${pre}0${hex}`;
      } else {
        pre = `${pre}${hex}`;
      }
      return pre;
    }, '');
    return sb.toString();
  }

  static getIP_int(ip) {
    return ip.replace(/\./g, '');
  }

  static getHexPid(pid) {
    // unsign short 0 to 65535
    if (pid < 0) {
      pid = 0;
    } else if (pid > 65535) {
      pid = pid % 10000;
    }
    let str = IdGenerator.decimalToHexString(pid);
    while (str.length < 4) {
      str = '0' + str;
    }
    return str;
  }

  getNextId() {
    let next = this.count > 9000 ? (this.count = 1001) && 1000 : this.count++;
    return next;
  }

  getId(ip, timestamp, nextId) {
    let appender = `${ip}${timestamp}${nextId}${this.PID_FLAG}${this.PID}`;
    return appender;
  }

  generate(ip) {
    if (ip && this.validate(ip)) {
      return this.getId(IdGenerator.getIP_16(ip), Date.now(), this.getNextId());
    }
    return this.getId(this.IP_16, Date.now(), this.getNextId());

  }

  generateIpv4Id() {
    return this.IP_int;
  }

  generateIpv4IdByIp(ip) {
    if (ip && this.validate(ip)) {
      return IdGenerator.getIP_int(ip);
    }
    return this.IP_int;

  }

  validate(ip) {
    return this.regexp.test(ip);
  }
}

exports = module.exports = new IdGenerator();
exports.IdGenerator = IdGenerator;