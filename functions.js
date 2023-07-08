export const getOrigin = (req) => {
  return new Map(req.headers).get("origin");
};