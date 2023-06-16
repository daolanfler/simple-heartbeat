export type CancelFn = () => void;

/**
 * @description 定时器，返回 cancel 函数
 */
export function poll(
  cb: (cancel: CancelFn) => void,
  interval = 4e3,
  { immediate = true } = {}
): CancelFn {
  let isRunning = true;
  let timerId: number | NodeJS.Timeout;

  const exec = (timeout?: number) => {
    return new Promise((resolve) => {
      timerId = setTimeout(() => {
        if (isRunning) {
          resolve(cb(cancel));
        }
      }, timeout ?? interval);
    })
  };

  const run = async () => {
    try {
      if (immediate) {
        await exec(0);
      }
    } finally {
      while (isRunning) {
        try {
          await exec();
        } finally {
          await exec();
        }
      }
    }
  };

  const cancel: CancelFn = () => {
    isRunning = false;
    if (timerId) {
      clearTimeout(timerId as number);
    }
  };

  run();
  return cancel;
}
