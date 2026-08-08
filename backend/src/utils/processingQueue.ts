/**
 * Sequential in-process task queue. Each enqueued task waits its turn, runs,
 * and the caller awaits its own task's result — so from the HTTP handler's
 * point of view this still looks synchronous, but the server never parses
 * two large files at once and starves the event loop.
 *
 * This is intentionally NOT a distributed/persistent queue. If Upload Center
 * ever needs to survive server restarts mid-upload, or scale across multiple
 * instances, replace this with BullMQ + Redis — the enqueue() call site
 * wouldn't need to change shape much.
 */
class ProcessingQueue {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    // Swallow rejections in the tail chain so one failed upload doesn't
    // permanently jam the queue for everyone after it.
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export const uploadProcessingQueue = new ProcessingQueue();
