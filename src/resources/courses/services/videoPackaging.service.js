import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import Lesson from "../models/lesson.js";
import {
  ensureVideoBucketCors,
  extractPublicIdFromUrl,
  getReadableVideoUrl,
  uploadVideoObject,
} from "../../../utils/image/s3.js";
import logger from "../../../utils/log/logger.js";

const ffmpegPath = ffmpegInstaller.path;
let packaging = false;

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited ${code}`));
    });
  });
}

function probe(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-i", filePath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
}

async function downloadToFile(url, dest) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 0,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    response.data.on("error", reject);
  });
}

async function walkFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(full)));
    else files.push(full);
  }
  return files;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".m3u8") return "application/vnd.apple.mpegurl";
  if (ext === ".ts") return "video/mp2t";
  if (ext === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

export function queueLessonVideo(content, previousUrl = null) {
  if (!content?.videoUrl) return content;
  const urlChanged = previousUrl && previousUrl !== content.videoUrl;
  if (!urlChanged && content.hlsUrl && content.videoStatus === "ready") {
    return content;
  }
  content.hlsUrl = null;
  content.videoError = null;
  content.videoStatus = "pending";
  return content;
}

export async function enqueueLessonsMissingHls() {
  const result = await Lesson.updateMany(
    {
      type: "video",
      "content.videoUrl": { $exists: true, $nin: [null, ""] },
      $or: [
        { "content.hlsUrl": { $exists: false } },
        { "content.hlsUrl": null },
        { "content.hlsUrl": "" },
        { "content.videoStatus": "failed" },
      ],
    },
    {
      $set: { "content.videoStatus": "pending" },
      $unset: { "content.videoError": "" },
    },
  );
  return result.modifiedCount || 0;
}

export async function releaseStalePackaging(maxAgeMs = 2 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  await Lesson.updateMany(
    {
      "content.videoStatus": "processing",
      updatedAt: { $lte: cutoff },
    },
    { $set: { "content.videoStatus": "pending" } },
  );
}

async function packageFile(lesson, sourcePath, workDir) {
  const probeText = await probe(sourcePath);
  const heightMatch = probeText.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const height = heightMatch ? Number(heightMatch[2]) : 720;
  const hasAudio = /Audio:/.test(probeText);
  const durationMatch = probeText.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const durationSeconds = durationMatch
    ? Number(durationMatch[1]) * 3600 +
      Number(durationMatch[2]) * 60 +
      Number(durationMatch[3])
    : null;

  const faststartPath = path.join(workDir, "faststart.mp4");
  await runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    faststartPath,
  ]);

  let sourceKey = null;
  try {
    const host = new URL(lesson.content.videoUrl).hostname;
    if (process.env.AWS_BUCKET_NAME && host.includes(process.env.AWS_BUCKET_NAME)) {
      sourceKey = decodeURIComponent(extractPublicIdFromUrl(lesson.content.videoUrl) || "");
    }
  } catch {
    sourceKey = null;
  }
  const faststartKey = sourceKey || `techyjaunt/videos/faststart/${lesson._id}.mp4`;
  const faststartUrl = await uploadVideoObject(
    faststartKey,
    fs.createReadStream(faststartPath),
    "video/mp4",
    "public, max-age=86400",
  );
  lesson.content.videoUrl = faststartUrl;

  const renditions = [
    { name: "480", height: 480, width: 854, bitrate: "800k", maxrate: "900k", bufsize: "1200k" },
  ];
  if (height >= 600) {
    renditions.push({
      name: "720",
      height: 720,
      width: 1280,
      bitrate: "1800k",
      maxrate: "2000k",
      bufsize: "2700k",
    });
  }

  const hlsDir = path.join(workDir, "hls");
  await fs.promises.mkdir(hlsDir, { recursive: true });
  const masterLines = ["#EXTM3U", "#EXT-X-VERSION:3"];

  for (const rendition of renditions) {
    const outDir = path.join(hlsDir, rendition.name);
    await fs.promises.mkdir(outDir, { recursive: true });
    console.log(`Encoding ${rendition.name}p for ${lesson._id}`);
    const args = [
      "-y",
      "-fflags",
      "+genpts",
      "-i",
      faststartPath,
      "-vf",
      `scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-profile:v",
      "main",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      rendition.bitrate,
      "-maxrate",
      rendition.maxrate,
      "-bufsize",
      rendition.bufsize,
      "-g",
      "48",
      "-keyint_min",
      "48",
      "-sc_threshold",
      "0",
      "-avoid_negative_ts",
      "make_zero",
    ];
    if (durationSeconds) {
      args.push("-t", String(Math.ceil(durationSeconds + 1)));
    }
    if (hasAudio) {
      args.push("-c:a", "aac", "-b:a", "96k", "-ac", "2");
    } else {
      args.push("-an");
    }
    args.push(
      "-f",
      "hls",
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-hls_segment_filename",
      path.join(outDir, "seg_%03d.ts"),
      path.join(outDir, "index.m3u8"),
    );
    await runFfmpeg(args);
    const bandwidth = rendition.name === "720" ? 2000000 : 900000;
    masterLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`,
      `${rendition.name}/index.m3u8`,
    );
  }

  await fs.promises.writeFile(
    path.join(hlsDir, "master.m3u8"),
    `${masterLines.join("\n")}\n`,
  );

  const prefix = `techyjaunt/hls/${lesson._id}`;
  const files = await walkFiles(hlsDir);
  let masterUrl = "";
  for (const file of files) {
    const relative = path.relative(hlsDir, file).split(path.sep).join("/");
    const key = `${prefix}/${relative}`;
    const isPlaylist = file.endsWith(".m3u8");
    const url = await uploadVideoObject(
      key,
      fs.createReadStream(file),
      contentTypeFor(file),
      isPlaylist ? "public, max-age=60" : "public, max-age=31536000, immutable",
    );
    if (relative === "master.m3u8") masterUrl = url;
  }
  if (!masterUrl) throw new Error("HLS master playlist was not created");
  return masterUrl;
}

export async function packageLessonById(lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson?.content?.videoUrl) {
    throw new Error("Lesson has no video URL");
  }

  const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tj-hls-"));
  const sourcePath = path.join(workDir, "source.mp4");
  try {
    let readableUrl = lesson.content.videoUrl;
    try {
      const head = await axios.head(readableUrl, {
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      if (!head) readableUrl = await getReadableVideoUrl(lesson.content.videoUrl);
    } catch {
      readableUrl = await getReadableVideoUrl(lesson.content.videoUrl);
    }
    console.log(`Downloading ${lesson._id}`);
    await downloadToFile(readableUrl, sourcePath);
    const hlsUrl = await packageFile(lesson, sourcePath, workDir);
    lesson.content.hlsUrl = hlsUrl;
    lesson.content.videoStatus = "ready";
    lesson.content.videoError = undefined;
    await lesson.save();
    logger.info("Lesson video packaged", {
      lessonId: String(lesson._id),
      hlsUrl,
    });
    return lesson;
  } catch (error) {
    lesson.content.videoStatus = "failed";
    const detail = error.message || "packaging failed";
    lesson.content.videoError = detail.slice(-500);
    console.error(
      `Packaging failed ${lesson._id}: ${detail.slice(-300).replace(/\s+/g, " ")}`,
    );
    await lesson.save();
    logger.error("Lesson video packaging failed", {
      lessonId: String(lesson._id),
      error: error.message,
    });
    throw error;
  } finally {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}

export async function packageNextPendingLesson() {
  if (packaging) return null;
  packaging = true;
  let lessonId = null;
  try {
    const lesson = await Lesson.findOneAndUpdate(
      {
        "content.videoStatus": "pending",
        "content.videoUrl": { $exists: true, $nin: [null, ""] },
      },
      { $set: { "content.videoStatus": "processing" } },
      { sort: { updatedAt: 1 }, new: true },
    );
    if (!lesson) return null;
    lessonId = lesson._id;
    await packageLessonById(lesson._id);
    return { id: lessonId, ok: true };
  } catch (error) {
    logger.error("Pending video packaging failed", {
      lessonId: lessonId ? String(lessonId) : null,
      error: error.message?.slice(-500),
    });
    return { id: lessonId, ok: false };
  } finally {
    packaging = false;
  }
}

export async function prepareVideoBucket() {
  await ensureVideoBucketCors();
}
