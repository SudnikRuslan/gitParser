import { Field, ObjectType } from '@nestjs/graphql';
// import { TypeormLoader } from 'type-graphql-dataloader';

@ObjectType()
export class FullRepository {
  @Field(() => String)
  name: string;

  @Field(() => Number)
  size: number;

  @Field(() => String)
  owner: string;

  @Field(() => Boolean)
  isPrivate: boolean;

  @Field(() => Number)
  filesCount: number;

  @Field(() => String, { nullable: true })
  ymlFileContent: string;

  @Field(() => [WebHooks], { nullable: true })
  activeWebhooks: WebHooks[];
}

@ObjectType()
export class WebHooks {
  @Field(() => Number)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => [String])
  events: string[];
}

@ObjectType()
export class Repository {
  @Field(() => String)
  name: string;

  @Field(() => Number)
  size: number;

  @Field(() => String)
  owner: string;

  @Field(() => FullRepository, { nullable: true })
  fullRepo?: FullRepository;
}
