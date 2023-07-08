import { CONSTANTS } from "./constants.js";
const { whitelist } = CONSTANTS; 
class CustomResponse extends Response {
  constructor(body, opt) {
    const origin = opt?.origin;
    const allow = whitelist.includes(origin) ? origin : whitelist[0];
    const options = {
      headers: {
        "Content-Type": opt?.type,
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": opt?.cache,
      }
    };
    super(body, options);
  }
}
export default CustomResponse;