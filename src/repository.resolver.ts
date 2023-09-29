import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FullRepository, Repository } from './entities';
import { GithubService } from './github.service';

// const pubSub = new PubSub();

@Resolver(() => Repository)
export class RepositoryResolver {
  constructor(private readonly githubService: GithubService) {}

  @Query(() => [Repository])
  async repositories(@Args('token') token: string): Promise<Repository[]> {
    const repositories = await this.githubService.getRepositories(token);
    return repositories.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      size: repo.size,
    }));
  }

  @ResolveField(() => FullRepository)
  fullRepo(@Parent() rep: Repository, @Args('token') token: string) {
    return this.githubService.getFullRepo(rep.name, rep.owner, token);
  }

  @Query(() => FullRepository)
  async fullRepository(
    @Args('token') token: string,
    @Args('repo') repo: string,
    @Args('owner') owner: string,
  ): Promise<FullRepository> {
    const repository = await this.githubService.getFullRepo(repo, owner, token);
    return repository;
  }
}
