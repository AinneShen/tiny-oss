import md5 from 'md5';
import base64js from 'base64-js';
import Digest from '../../vendor/digest';

function isBlob(obj) {
  return Object.prototype.toString.call(obj) === '[object Blob]';
}

function blobToBuffer(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = new Uint8Array(fr.result);
      resolve(result);
    };
    fr.onerror = () => {
      reject(fr.error);
    };
    fr.readAsArrayBuffer(blob);
  });
}

function assertOptions(options) {
  const {
    accessKeyId,
    accessKeySecret,
    bucket,
    endpoint,
  } = options;
  if (!accessKeyId) {
    throw new Error('need accessKeyId');
  }
  if (!accessKeySecret) {
    throw new Error('need accessKeySecret');
  }
  if (!bucket && !endpoint) {
    throw new Error('need bucket or endpoint');
  }
}

function hexToBuffer(hex) {
  const arr = [];
  for (let i = 0; i < hex.length; i += 2) {
    arr.push(parseInt(hex[i] + hex[i + 1], 16));
  }
  return Uint8Array.from(arr);
}

function getContentMd5(buf) {
  // md5 doesn't work for Uint8Array
  const bytes = Array.prototype.slice.call(buf, 0);
  const md5Buf = hexToBuffer(md5(bytes));
  return base64js.fromByteArray(md5Buf);
}

function getCanonicalizedOSSHeaders(headers) {
  let result = '';
  let headerNames = Object.keys(headers);

  headerNames = headerNames.map(name => name.toLowerCase());
  headerNames.sort();

  headerNames.forEach((name) => {
    if (name.indexOf('x-oss-') === 0) {
      result += `${name}:${headers[name]}\n`;
    }
  });

  return result;
}

function getCanonicalizedResource(bucket = '', objectName = '') {
  let result = '';
  if (bucket) {
    result += `/${bucket}`;
  }
  if (objectName) {
    if (objectName.charAt(0) !== '/') {
      result += '/';
    }
    result += objectName;
  }
  return result;
}

function getAuthorization(options = {}) {
  const {
    verb,
    contentMd5 = '',
    bucket,
    objectName,
    accessKeyId,
    accessKeySecret,
    headers,
  } = options;
  const date = headers['x-oss-date'];
  const contentType = headers['Content-Type'];

  const data = ([
    verb,
    contentMd5,
    contentType,
    date,
    `${getCanonicalizedOSSHeaders(headers)}${getCanonicalizedResource(bucket, objectName)}`,
  ]).join('\n');
  const hmac = new Digest.HMAC_SHA1();
  hmac.setKey(accessKeySecret);
  hmac.update(data);
  const hashBuf = new Uint8Array(hmac.finalize());
  const signature = base64js.fromByteArray(hashBuf);

  return `OSS ${accessKeyId}:${signature}`;
}

export {
  isBlob,
  blobToBuffer,
  assertOptions,
  getContentMd5,
  getCanonicalizedOSSHeaders,
  getCanonicalizedResource,
  getAuthorization,
};
