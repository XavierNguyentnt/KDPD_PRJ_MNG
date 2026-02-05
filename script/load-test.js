import autocannon from "autocannon";

const baseUrl = process.env.LOAD_TEST_URL || "http://localhost:5000";
const path = process.env.LOAD_TEST_PATH || "/api/tasks";
const method = process.env.LOAD_TEST_METHOD || "GET";
const duration = Number.parseInt(process.env.LOAD_TEST_DURATION || "30", 10);
const connections = Number.parseInt(process.env.LOAD_TEST_CONNECTIONS || "20", 10);
const pipelining = Number.parseInt(process.env.LOAD_TEST_PIPELINING || "1", 10);

const headers = {};
if (process.env.LOAD_TEST_HEADERS) {
  try {
    Object.assign(headers, JSON.parse(process.env.LOAD_TEST_HEADERS));
  } catch (error) {
    console.warn("LOAD_TEST_HEADERS is not valid JSON:", error);
  }
}
if (process.env.LOAD_TEST_COOKIE) {
  headers.Cookie = process.env.LOAD_TEST_COOKIE;
}

const body = process.env.LOAD_TEST_BODY || undefined;
const url = `${baseUrl}${path}`;

const instance = autocannon({
  url,
  method,
  duration,
  connections,
  pipelining,
  headers,
  body,
});

autocannon.track(instance, { renderProgressBar: true });

instance.on("done", (result) => {
  console.log("Load test complete");
  console.log(JSON.stringify(result, null, 2));
});
