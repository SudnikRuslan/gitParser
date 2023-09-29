import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';
import { v4 as uuid } from 'uuid';
import { FullRepository } from './entities';
import { EventEmitter } from 'events';

type task = {
  repo: string;
  owner: string;
  token: string;
  id: string;
};

@Injectable()
export class GithubService {
  private readonly workers: any[] = [];

  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly tasks: task[] = [];

  private readonly workerCount = 2;

  constructor() {
    this.addWorkers(this.workerCount);
    this.workers.forEach((fn) => fn());
  }

  async getRepositories(token: string) {
    const octokit = new Octokit({
      auth: token,
    });
    const repositories = await octokit.request('GET /user/repos', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return repositories.data;
  }

  async getFullRepo(repo: string, owner: string, token: string) {
    const repository = await this.processTask(repo, owner, token);
    return repository;
  }

  async getFullRepoRequest(
    repo: string,
    owner: string,
    token: string,
  ): Promise<FullRepository> {
    const octokit = new Octokit({
      auth: token,
    });
    const [repository, [filesCount, ymlFileContent], webHooks] =
      await Promise.all([
        octokit.request('GET /repos/{owner}/{repo}', {
          owner,
          repo,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }),
        this.getRepositoryContent(repo, owner, octokit),
        this.getWebHooks(repo, owner, octokit),
      ]);

    return {
      name: repository.data.name,
      owner: repository.data.owner.login,
      size: repository.data.size,
      isPrivate: repository.data.private,
      filesCount,
      ymlFileContent,
      activeWebhooks: webHooks.map((webHook) => ({
        name: webHook.name,
        id: webHook.id,
        type: webHook.type,
        events: webHook.events,
      })),
    };
  }

  async getRepositoryContent(
    repo: string,
    owner: string,
    octokit: Octokit,
  ): Promise<[number, string]> {
    let filesCount = 0;
    let ymlData: string = null;
    const initNode = await this.repositoryContentByPath(
      repo,
      owner,
      '',
      octokit,
    );
    if (!initNode) {
      return [0, ''];
    }
    const nodesToCheck = [initNode];
    while (nodesToCheck.length > 0) {
      const nodesToAdd = [];
      const nodes = nodesToCheck.splice(0, 5); // parse only by 5 nodes per time;
      for (const node of nodes) {
        if (node?.data && Array.isArray(node.data)) {
          for (const item of node.data) {
            if (item.type === 'dir') {
              nodesToAdd.push(
                this.repositoryContentByPath(repo, owner, item.path, octokit),
              );
            }
            if (item.type === 'file') {
              filesCount++;
              if (item.name.includes('.yml') && !ymlData) {
                ymlData = await this.getFileContent(
                  repo,
                  owner,
                  item.path,
                  octokit,
                );
              }
            }
          }
        }
      }
      const newNodes = await Promise.all(nodesToAdd);
      nodesToCheck.push(...newNodes);
    }
    return [filesCount, ymlData];
  }

  async repositoryContentByPath(
    repo: string,
    owner: string,
    path: string,
    octokit: Octokit,
  ) {
    try {
      const res = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        {
          owner,
          repo,
          path,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return res;
    } catch (e) {
      if (e?.status === 404) {
        return null;
      }
      throw new Error(e?.message);
    }
  }

  async getWebHooks(repo: string, owner: string, octokit: Octokit) {
    try {
      const webHooks = await octokit.request(
        'GET /repos/{owner}/{repo}/hooks',
        {
          owner,
          repo,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return webHooks.data;
    } catch (e) {
      if (e?.status === 404) {
        return [];
      }
      throw new Error(e?.message);
    }
  }

  async getFileContent(
    repo: string,
    owner: string,
    path: string,
    octokit: Octokit,
  ) {
    const res = await this.repositoryContentByPath(repo, owner, path, octokit);
    if (res?.data && !Array.isArray(res?.data)) {
      if (res.data.type === 'file') {
        return atob(res.data.content);
      }
    }
    return null;
  }

  processTask(
    repo: string,
    owner: string,
    token: string,
  ): Promise<FullRepository> {
    return new Promise((resolve, reject) => {
      const taskId = uuid();
      let isResolved = false;

      const handleTaskFunc = (res: {
        repo?: FullRepository;
        error: Error;
        taskId: string;
      }) => {
        if (res.taskId === taskId) {
          isResolved = true;
          if (res.error) {
            reject(res.error);
          }
          if (res.repo) {
            resolve(res.repo);
          }
          this.eventEmitter.removeListener('task', handleTaskFunc);
        }
      };
      this.eventEmitter.addListener('task', handleTaskFunc);

      setTimeout(() => {
        if (!isResolved) {
          this.eventEmitter.removeListener('message', handleTaskFunc);
          reject(new Error(`TimeoutError: Request took longer 200 sec`));
        }
      }, 200000);
      this.tasks.push({
        repo,
        owner,
        token,
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
        const repo = await this.getFullRepoRequest(
          task.repo,
          task.owner,
          task.token,
        );
        this.eventEmitter.emit('task', { repo, taskId: task.id });
      } catch (e) {
        this.eventEmitter.emit('task', {
          error: new Error(e?.message),
          taskId: task.id,
        });
      }
    }
    setTimeout(this.worker.bind(this), 10);
  }
}
