import { HeartBeat } from '../src/main';
jest.useFakeTimers();

function flushPromises() {
  // return Promise.resolve();
  // return new Promise(resolve => setImmediate(resolve));
  return new Promise(resolve => jest.requireActual('timers').setImmediate(resolve))
}

describe('pollManager', () => {
  it('should poll after interval if set immediate false', () => {
    const pollManager = new HeartBeat();
    const callback = jest.fn();
    pollManager.addTask('task 1', callback, 2000, { immediate: false });

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(2000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should poll immediately if set immediate true', async () => {
    const pollManager = new HeartBeat();
    const callback = jest.fn();
    pollManager.addTask('task 1', callback, 1000, { immediate: true });
    // https://stackoverflow.com/a/52196951/8947428
    // when jest.advanceTimerByTime called, a loop will run synchronously calling any callbacks that would
    // have been scheduled in the ellpased time, including any (callbacks of setTimeout) that get added while running the callbacks.
    // But those callbacks may cause jobs to be queued in `micro-tasks`
    // so after every advanceTimersBytTime, we use `await flushPromises()` to queue the remainder of the test at the end of `micro-task`
    // queue and let everything alreadly in the queue run first
    // Here, we queue one micro-task at 0ms, then every 1000ms. so we need to flush at 0ms, and then every 1000ms
    jest.advanceTimersByTime(0);
    await flushPromises();
    expect(callback).toBeCalled();

    for (let i = 0; i < 8; i++) {
      jest.advanceTimersByTime(1000);
      await flushPromises();
    }

    expect(callback).toHaveBeenCalledTimes(9);
  });

  test('execution order', async () => {
    const order = [];
    order.push('1');
    setTimeout(() => order.push('6'), 0);
    const promise = new Promise<void>(resolve => {
      order.push('2');
      resolve();
    }).then(() => {
      order.push('4');
    });
    order.push('3');
    await promise;
    order.push('5');
    jest.advanceTimersByTime(0);
    expect(order).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('should be able to run multiple tasks', () => {
    const pollManager = new HeartBeat();
    const callback = jest.fn();
    pollManager.addTask('task 1', callback, 1000);
    pollManager.addTask('task 2', callback, 1000);

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should be able to stop single tasks', () => {
    const pollManager = new HeartBeat();
    const callback = jest.fn();
    pollManager.addTask('task 1', callback, 1000);

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);

    pollManager.stop('task 1');

    jest.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(1);

  });
});
