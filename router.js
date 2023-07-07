import m3u8stream from "m3u8stream";
import "isomorphic-fetch";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";
import { error, Router } from "itty-router";
import JsResponse from "./JsResponse.js";
import CustomResponse from "./CustomResponse.js";
const router = Router();

router
  .get("/", () => "Success!")
  // STEP 1: get qualities and playlists from master.m3u8 url (obtained from fetching https://kick.com/api/v1/video/:ID)
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
    return new JsResponse(quality);
  })
  // STEP 2: get segments and duration from playlist.m3u8 url
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
    return new JsResponse(json);

  })
  // get merged segments into array buffer video/mp2t (.ts file)
  .get("/extract?", async (req) => {
    const { query } = req;
    const quality = query.quality; // selected quality
    const master = decodeURIComponent(query.master); // master.m3u8 url
    const start = decodeURIComponent(query.start); // start time (hh:mm:ss)
    const end = Number(query.end); // end (total segments to merge) (int)
    console.info(start);
    console.info(end);
    const playlist = master.replace("master.m3u8", "") + quality + "/playlist.m3u8";
    console.info(playlist);
    const stream = m3u8stream(playlist, { begin: start });
    function streamToArrayBuffer(stream) {
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
    }
    const aB = await streamToArrayBuffer(stream)
      .then((aB) => {
        return aB;
      })
      .catch((error) => {
        console.info("Error al crear el Blob:", error);
      });
    console.info(aB);
    return new CustomResponse(aB, {type: "video/MP2T"});
  })

  .all("*", () => new Response("Not Found.", {status:404}));

const ittyServer = createServerAdapter(
  (request, env, ctx) => router
    .handle(request, env, ctx)
    .catch(error)
);
const httpServer = createServer(ittyServer);
httpServer.listen(1515);
console.info("Server started on port 1515.");
