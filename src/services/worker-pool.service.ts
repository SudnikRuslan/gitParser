import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import { Task } from '../types';

@Injectable()
export class WorkerPoolService {
  private readonly workers: any[] = [];

  private readonly taskEmitter: EventEmitter = new EventEmitter();
  private readonly tasks: Task[] = [];

  private readonly workerCount = 2;

  constructor() {
    this.addWorkers(this.workerCount);
    this.workers.forEach((fn) => fn());
  }

  processTask<A>(task: <T = A>() => Promise<T>): Promise<A> {
    return new Promise((resolve, reject) => {
      const taskId = uuid();
      let isResolved = false;

      const handleTaskFunc = (res: {
        data?: A;
        error?: Error;
        task: string;
      }) => {
        if (res.task === taskId) {
          isResolved = true;
          if (res.error) {
            reject(res.error);
          }
          if (res.data) {
            resolve(res.data);
          }
          this.taskEmitter.removeListener('task', handleTaskFunc);
        }
      };
      this.taskEmitter.addListener('task', handleTaskFunc);

      setTimeout(() => {
        if (!isResolved) {
          this.taskEmitter.removeListener('message', handleTaskFunc);
          reject(new Error(`TimeoutError: Request took longer 200 sec`));
        }
      }, 200000);
      this.tasks.push({
        task,
        id: taskId,
      });
    });
  }

  private addWorkers(count: number) {
    for (let i = 0; i < count; i++) {
      this.workers.push(this.worker.bind(this));
    }
  }

  private async worker() {
    if (this.tasks.length > 0) {
      const task = this.tasks.pop();
      try {
        const data = task.task();
        this.taskEmitter.emit('task', { data, task: task.id });
      } catch (e) {
        this.taskEmitter.emit('task', {
          error: new Error(e?.message),
          task: task.id,
        });
      }
    }
    setTimeout(this.worker.bind(this), 10);
  }
}
