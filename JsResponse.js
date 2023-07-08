import { CONSTANTS } from "./constants.js";
const { whitelist } = CONSTANTS; 
class JsResponse extends Response {
  constructor(body, opt) {
    const origin = opt?.origin;
    const allow = whitelist.includes(origin) ? origin : whitelist[0];
    const jsonBody = JSON.stringify(body);
    const options = {
      headers: {
        "Content-Type": "text/javascript;charset=UTF-8",
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": "GET"
      }
    };
    super(jsonBody, options);
  }
}
export default JsResponse;