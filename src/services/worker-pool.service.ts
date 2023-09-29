import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { FullRepository } from '../entities';
import { EventEmitter } from 'events';
import { GithubService } from './github.service';
import { Task } from '../types';

@Injectable()
export class WorkerPoolService {
  private readonly workers: any[] = [];

  private readonly testEmitter: EventEmitter = new EventEmitter();
  private readonly tasks: Task[] = [];

  private readonly workerCount = 2;

  constructor(private readonly githubService: GithubService) {
    this.addWorkers(this.workerCount);
    this.workers.forEach((fn) => fn());
  }

  processTask(
    repo: string,
    owner: string,
    token: string,
  ): Promise<FullRepository> {
    return new Promise((resolve, reject) => {
      const task = uuid();
      let isResolved = false;

      const handleTaskFunc = (res: {
        repo?: FullRepository;
        error: Error;
        task: string;
      }) => {
        if (res.task === task) {
          isResolved = true;
          if (res.error) {
            reject(res.error);
          }
          if (res.repo) {
            resolve(res.repo);
          }
          this.testEmitter.removeListener('task', handleTaskFunc);
        }
      };
      this.testEmitter.addListener('task', handleTaskFunc);

      setTimeout(() => {
        if (!isResolved) {
          this.testEmitter.removeListener('message', handleTaskFunc);
          reject(new Error(`TimeoutError: Request took longer 200 sec`));
        }
      }, 200000);
      this.tasks.push({
        repo,
        owner,
        token,
        id: task,
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
        const repo = await this.githubService.getFullRepoRequest(
          task.repo,
          task.owner,
          task.token,
        );
        this.testEmitter.emit('task', { repo, task: task.id });
      } catch (e) {
        this.testEmitter.emit('task', {
          error: new Error(e?.message),
          task: task.id,
        });
      }
    }
    setTimeout(this.worker.bind(this), 10);
  }
}
