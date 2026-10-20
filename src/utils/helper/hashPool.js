import os from "node:os";
import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";
import bcrypt from "bcryptjs";
import logger from "../log/logger.js";

/**
 * bcrypt hashing on worker threads.
 *
 * bcryptjs is pure JavaScript, so on the main thread every hash (~100-400 ms)
 * blocks the event loop. Bulk jobs that create thousands of accounts would
 * stall every other API request. The hashes are identical to bcryptjs on the
 * main thread, so bcrypt.compare at login works unchanged.
 */
const require = createRequire(import.meta.url);
const BCRYPT_PATH = require.resolve("bcryptjs");

const WORKER_SOURCE = `
const { parentPort } = require("node:worker_threads");
const bcrypt = require(${JSON.stringify(BCRYPT_PATH)});
parentPort.on("message", ({ id, password, rounds }) => {
  bcrypt.hash(password, rounds).then(
    (hash) => parentPort.postMessage({ id, hash }),
    (error) => parentPort.postMessage({ id, error: error.message }),
  );
});
`;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class HashPool {
  constructor(size) {
    this.size = size;
    this.slots = [];
    this.pending = new Map(); // id -> { resolve, reject, slot }
    this.nextId = 0;
    this.disabled = false;
  }

  spawn(index) {
    const worker = new Worker(WORKER_SOURCE, { eval: true });
    // Don't keep the process alive just for idle hash workers
    worker.unref();
    worker.on("message", ({ id, hash, error }) => {
      const job = this.pending.get(id);
      if (!job) return;
      this.pending.delete(id);
      if (error) job.reject(new Error(error));
      else job.resolve(hash);
    });
    const fail = (reason) => {
      // Reject this worker's in-flight hashes and replace it on next use
      for (const [id, job] of this.pending) {
        if (job.slot === index) {
          this.pending.delete(id);
          job.reject(reason instanceof Error ? reason : new Error(String(reason)));
        }
      }
      this.slots[index] = null;
    };
    worker.on("error", fail);
    worker.on("exit", (code) => {
      if (this.slots[index] === worker) fail(new Error(`Hash worker exited (${code})`));
    });
    this.slots[index] = worker;
    return worker;
  }

  hash(password, rounds) {
    if (this.disabled) return bcrypt.hash(password, rounds);

    const id = ++this.nextId;
    const slot = id % this.size;
    let worker = this.slots[slot];
    try {
      worker = worker || this.spawn(slot);
    } catch (error) {
      // e.g. worker threads unavailable: degrade to main-thread hashing
      logger.warn("Hash worker pool unavailable, hashing on main thread", {
        error: error.message,
      });
      this.disabled = true;
      return bcrypt.hash(password, rounds);
    }

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, slot });
      worker.ref(); // keep alive while work is in flight
      worker.postMessage({ id, password, rounds });
    }).finally(() => {
      if (![...this.pending.values()].some((job) => job.slot === slot)) {
        this.slots[slot]?.unref();
      }
    });
  }
}

const pool = new HashPool(
  toPositiveInt(
    process.env.HASH_WORKER_THREADS,
    Math.max(1, Math.min(4, os.cpus().length - 1)),
  ),
);

/** bcrypt hash computed off the main thread. */
export const hashPasswordOffThread = (password, rounds) => pool.hash(password, rounds);
