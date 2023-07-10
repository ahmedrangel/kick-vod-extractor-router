import m3u8stream from "m3u8stream";
import "isomorphic-fetch";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";
import { error, Router } from "itty-router";
import JsResponse from "./JsResponse.js";
import CustomResponse from "./CustomResponse.js";
import { getOrigin } from "./functions.js";
const router = Router();
const port = process.env.PORT || 3000;

router
  .get("/", () => "Success!")
  // STEP 1: receive master URL and send playlist.m3u8 URLs and available qualities for each one
  .get("/qualities?", async (req) => {
    const { query } = req;
    const master = decodeURIComponent(query.master);
    const masterF = await fetch(master);
    const masterR = await masterF.text();
    const regex = /VIDEO="([^"]+)"/g;
    const matches = masterR.matchAll(regex);
    const q = [...matches].map(match => match[1]);
    const quality = [];
    q.forEach(elem => {
      const playlist = master.replace("master.m3u8", "") + elem + "/playlist.m3u8";
      quality.push({quality: elem, playlist: playlist});
    });
    console.info(quality);
    const options = {origin: getOrigin(req)};
    return new JsResponse(quality, options);
  })
  // STEP 2: receive a playlist.m3u8 URL and send total segments and duration response
  .get("/segments?", async (req) => { 
    const { query } = req;
    const url = decodeURIComponent(query.playlist);
    const playF = await fetch(url);
    const playR = await playF.text();
    const regexSegments = /\.ts\b/g;
    const regexDuration = /#EXTINF:([\d.]+)/g;
    const tsFiles = playR.match(regexSegments);
    const segments = tsFiles ? tsFiles.length : 0;
    const durations = playR.matchAll(regexDuration);
    let add = 0;
    for (const d of durations) {
      const value = Number(d[1].replace(".",""));
      add += value;
    }
    const json = {segments: segments, duration: add};
    const options = {origin: getOrigin(req)};
    return new JsResponse(json, options);

  })
  // STEP 3: receive master URL, selected quality, start time and total segments. Then, send MP2T Array Buffer response (.ts file)
  .get("/extract?", async (req) => {
    const { query } = req;
    const quality = query.quality; // selected quality
    const master = decodeURIComponent(query.master); // master.m3u8 url
    const start = decodeURIComponent(query.start); // start time (hh:mm:ss)
    const end = Number(query.end); // end (total segments to merge) (int)
    console.info(start);
    console.info(end);
    const playlist = master.replace("master.m3u8", "") + quality + "/playlist.m3u8"; // playlist URL
    console.info(playlist);
    const stream = m3u8stream(playlist, { begin: start });
    const streamToArrayBuffer = (stream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("progress", (chunkLength, downloaded, total) => {
          console.info(chunkLength, downloaded, total);
          if (chunkLength.num === end) { // 5 = 1 min
            stream.end();
          }
        });
        stream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          resolve(arrayBuffer);
        });
        stream.on("error", reject);
      });
    };
    const aB = await streamToArrayBuffer(stream)
      .then((aB) => {
        return aB;
      })
      .catch((error) => {
        console.info("Error al crear el Blob:", error);
      });
    console.info(aB);
    return new CustomResponse(aB, {type: "video/MP2T", origin: getOrigin(req)});
  })

  .all("*", () => new Response("Not Found.", {status:404}));

const ittyServer = createServerAdapter(
  (request, env, ctx) => router
    .handle(request, env, ctx)
    .catch(error)
);
const httpServer = createServer(ittyServer);
httpServer.listen(port);
console.info("Server started on port" + port);