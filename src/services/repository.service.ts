import { Injectable } from '@nestjs/common';
import { WorkerPoolService } from './worker-pool.service';
import { GithubService } from './github.service';

@Injectable()
export class RepositoryService {
  constructor(
    private readonly githubService: GithubService,
    private readonly workerPoolService: WorkerPoolService,
  ) {}

  async getRepositories(token: string, page: number) {
    const repositories = await this.githubService.getRepositories(token, page);
    return repositories;
  }

  async getFullRepo(repo: string, owner: string, token: string) {
    const repository = await this.workerPoolService.processTask(
      repo,
      owner,
      token,
    );
    return repository;
  }
}
