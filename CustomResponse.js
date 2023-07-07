import { CONSTANTS } from "./constants.js";
const { origin } = CONSTANTS; 
class CustomResponse extends Response {
  constructor(body, opt) {
    const options = {
      headers: {
        "Content-Type": opt?.type,
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": opt?.cache
      }
    };
    super(body, options);
  }
}
export default CustomResponse;