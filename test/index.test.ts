import { describe, expect, it, vi } from "vitest";
import { HeartBeat } from "../src";
import { test } from "vitest";
import { beforeEach } from "vitest";
import { afterEach } from "vitest";

function flushPromises(): Promise<void> {
  return Promise.resolve();
}

describe("pollManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should poll after interval if set immediate false", async () => {
    const pollManager = new HeartBeat();
    const cb = vi.fn();
    pollManager.addTask("task 1", cb, 2000, { immediate: false });
    vi.advanceTimersByTime(0);
    await flushPromises()

    expect(cb).not.toBeCalled();

    vi.advanceTimersByTime(2000);

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("should poll immediately if set immediate true", async () => {
    const pollManager = new HeartBeat();
    const cb = vi.fn();
    pollManager.addTask("task 1", cb, 1000, { immediate: true });
    // https://stackoverflow.com/a/52196951/8947428
    // when vi.advanceTimerByTime called, a loop will run synchronously calling any cbs that would
    // have been scheduled in the ellpased time, including any (cbs of setTimeout) that get added while running the callbacks.
    // But those cbs may cause jobs to be queued in `micro-tasks`
    // so after every advanceTimersBytTime, we use `await flushPromises()` to queue the remainder of the test at the end of `micro-task`
    // queue and let everything alreadly in the queue run first
    // Here, we queue one micro-task at 0ms, then every 1000ms. so we need to flush at 0ms, and then every 1000ms
    vi.advanceTimersByTime(0);
    await flushPromises();
    expect(cb).toBeCalled();

    for (let i = 0; i < 8; i++) {
      vi.advanceTimersByTime(1000);
      await flushPromises();
    }

    expect(cb).toHaveBeenCalledTimes(9);
  });

  test("execution order", async () => {
    const order: string[] = [];
    order.push("1");
    setTimeout(() => order.push("6"), 0);
    const promise = new Promise<void>((resolve) => {
      order.push("2");
      resolve();
    }).then(() => {
      order.push("4");
    });
    order.push("3");
    await promise;
    order.push("5");
    vi.advanceTimersByTime(0);
    expect(order).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("should be able to run multiple tasks", () => {
    const pollManager = new HeartBeat();
    const cb = vi.fn();
    pollManager.addTask("task 1", cb, 1000);
    pollManager.addTask("task 2", cb, 1000);

    expect(cb).not.toBeCalled();

    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("should be able to stop single tasks", async () => {
    const pollManager = new HeartBeat();
    const cb = vi.fn();
    pollManager.addTask("task 1", cb, 1000);

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    pollManager.stop("task 1");

    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
