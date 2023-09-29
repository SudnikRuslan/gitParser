import {
  Args,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Context,
} from '@nestjs/graphql';
import { FullRepository, Repository } from './entities';
import { RepositoryService } from './repository.service';
import { ParseIntPipe } from '@nestjs/common';

@Resolver(() => Repository)
export class RepositoryResolver {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Query(() => [Repository])
  async repositories(
    @Args('token') token: string,
    @Args('page', new ParseIntPipe()) page: number,
  ): Promise<Repository[]> {
    const repositories = await this.repositoryService.getRepositories(
      token,
      page,
    );
    return repositories.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      size: repo.size,
    }));
  }

  @Query(() => FullRepository)
  async fullRepository(
    @Args('token') token: string,
    @Args('repo') repo: string,
    @Args('owner') owner: string,
    @Context() info: any,
  ): Promise<FullRepository> {
    info.token111 = token;
    const repository = await this.repositoryService.getFullRepo(
      repo,
      owner,
      token,
    );
    return repository;
  }

  @ResolveField(() => FullRepository)
  fullRepo(@Parent() rep: Repository, @Args('token') token: string) {
    return this.repositoryService.getFullRepo(rep.name, rep.owner, token);
  }
}
