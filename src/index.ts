import { poll } from "./util";

interface CancelTimerObj {
  name: string;
  handler: () => void;
}

interface TaskConfig {
  name: string;
  interval: number;
  running: boolean;
  handler: () => void;
  immediate: boolean;
}

export class HeartBeat {
  private _cancelTimer: CancelTimerObj[] = [];

  private _tasks: TaskConfig[] = [];

  checkExisted(taskName: string): boolean{
    const t = this._tasks.find((item) => item.name === taskName);
    return Boolean(t);
  }

  /**
   * @description 添加任务
   * @param  name 轮询名称
   * @param  handler 回调
   * @param  interval 间隔 ms
   * @param  option
   */
  addTask(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    handler = () => {},
    interval = 1e4,
    { immediate = false } = {}
  ): void {
    if (this.checkExisted(name)) {
      console.warn("task name already exists");
      return;
    }
    this._tasks.push({
      name,
      interval,
      running: false,
      handler,
      immediate,
    });
    this._start(name);
  }

  startTimer(task: TaskConfig): CancelTimerObj {
    const cancel = poll(task.handler, task.interval, {
      immediate: task.immediate,
    });
    task.running = true;
    const obj = {
      name: task.name,
      handler: () => {
        cancel();
        task.running = false;
        // 将对应的 cancelHandler 移除
        const index = this._cancelTimer.indexOf(obj);
        this._cancelTimer.splice(index, 1);
      },
    };
    return obj;
  }

  private _start(name: string): void {
    if (!name) return;
    const task = this._tasks.find((item) => item.name === name);
    if (!task) {
      console.warn("no such task ");
      return;
    }
    if (task.running) {
      console.warn("task is already running: ", name);
    } else {
      this._cancelTimer.push(this.startTimer(task));
    }
  }

  restart(): void {
    this.stopAll();
    this.startAll();
  }

  /**
   * @description 停止任务
   * @param  name 任务名称
   * @param remove 是否移除任务
   */
  stop(name: string, remove = true): void {
    if (!name) return;
    const cancel = this._cancelTimer.find((item) => item.name === name);
    const taskIndex = this._tasks.findIndex((item) => item.name === name);
    if (cancel) {
      cancel.handler();
      if (remove && taskIndex > -1) {
        this._tasks.splice(taskIndex, 1);
      }
    }
  }

  /**
   * @description 停止所有任务 如果任务依赖于组件，比如任务里面的this，组件销毁时需要设置remove=true，否则任务里面的this指向的还是原来的组件，原来的组件也不会被回收
   * @param remove 是否清空任务列表。
   */
  stopAll(remove = true): void {
    const allCancelHandler = this._cancelTimer.map((item) => item.handler);
    allCancelHandler.forEach((handler) => handler());
    if (remove) {
      this.resetTaskList();
    }
  }

  startAll():void {
    const notStarted = this._tasks.filter((item) => !item.running);

    const cancelTimers = notStarted.map((task) => {
      return this.startTimer(task);
    });

    this._cancelTimer = [...this._cancelTimer, ...cancelTimers];
  }

  resetTaskList(): void {
    this._tasks = [];
    this._cancelTimer = [];
  }
}

export const pollManager = new HeartBeat();
