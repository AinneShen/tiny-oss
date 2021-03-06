require('dotenv').config();
const Koa = require('koa');
const serve = require('koa-static');
const { STS } = require('ali-oss');

const autoKill = process.env.AUTO_KILL;
const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;
const region = process.env.OSS_REGION;
const endpoint = process.env.OSS_ENDPOINT;
const arn = process.env.OSS_ARN;

const root = process.cwd();
const app = new Koa();
const PORT = 8080;

app.use(serve(root));

let lastReqTime = Date.now();

app.use(async (ctx, next) => {
  lastReqTime = Date.now();
  if (ctx.path === '/api/oss-config') {
    ctx.body = {
      accessKeyId,
      accessKeySecret,
      bucket,
      region,
      endpoint,
    };
  }
  if (ctx.path === '/api/sts') {
    const sts = new STS({
      accessKeyId,
      accessKeySecret,
    });
    // 60 mins
    const expires = 60 * 60;
    const sessionName = 'foo';
    const stsToken = await sts.assumeRole(arn, undefined, expires, sessionName);
    ctx.body = {
      bucket,
      region,
      endpoint,
      stsToken,
    };
  }
  next();
});

app.listen(PORT);
console.log('listening on port %s', PORT);

if (autoKill) {
  setInterval(() => {
    if (Date.now() - lastReqTime > 5000) {
      process.exit(0);
    }
  }, 500);
}
