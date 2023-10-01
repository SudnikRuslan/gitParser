import {
  Args,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Context,
} from '@nestjs/graphql';
import { ParseIntPipe } from '@nestjs/common';
import { FullRepository, Repository } from './entities';
import { RepositoryService } from './services/repository.service';
import { RepositoryCtx } from './types';

@Resolver(() => Repository)
export class RepositoryResolver {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Query(() => [Repository])
  async repositories(
    @Args('token') token: string,
    @Args('page', new ParseIntPipe()) page: number,
    @Context() ctx: RepositoryCtx,
  ): Promise<Repository[]> {
    ctx.token = token;
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

  @ResolveField(() => FullRepository)
  fullRepo(@Parent() rep: Repository, @Context() ctx: RepositoryCtx) {
    return this.repositoryService.getFullRepo(rep.name, rep.owner, ctx.token);
  }

  @Query(() => FullRepository)
  fullRepository(
    @Args('token') token: string,
    @Args('repo') repo: string,
    @Args('owner') owner: string,
  ): Promise<FullRepository> {
    return this.repositoryService.getFullRepo(repo, owner, token);
  }
}
