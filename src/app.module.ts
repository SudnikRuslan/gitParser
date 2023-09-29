import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { RepositoryResolver } from './repository.resolver';
import { GithubService } from './github.service';
import { RepositoryService } from './repository.service';
import { WorkerPoolService } from './worker-pool.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
  ],
  controllers: [],
  providers: [
    RepositoryResolver,
    GithubService,
    RepositoryService,
    WorkerPoolService,
  ],
})
export class AppModule {}
