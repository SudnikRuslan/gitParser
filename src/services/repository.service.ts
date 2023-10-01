import { Injectable } from '@nestjs/common';
import { WorkerPoolService } from './worker-pool.service';
import { GithubService } from './github.service';
import { FullRepository } from '../entities';

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
    const repository = await this.workerPoolService.processTask<FullRepository>(
      this.githubService.getFullRepoRequest.bind(
        this.githubService,
        repo,
        owner,
        token,
      ),
    );
    return repository;
  }
}
