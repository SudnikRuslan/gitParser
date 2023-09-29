import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';
import { FullRepository } from './entities';
import { ThreeItem } from './types';

@Injectable()
export class GithubService {
  constructor() {}

  async getRepositories(token: string, page: number) {
    const octokit = new Octokit({
      auth: token,
    });
    const repositories = await octokit.request(
      'GET /user/repos?page={page}&per_page={per_page}',
      {
        page,
        per_page: 100,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    return repositories.data;
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
    const threesJobs: Promise<ThreeItem[]>[] = [];
    if (initNode.data && Array.isArray(initNode.data)) {
      for (const item of initNode.data) {
        if (item.type === 'dir')
          threesJobs.push(
            this.repositoryThreeBySHA(repo, owner, item.sha, octokit),
          );

        if (item.type === 'file') {
          filesCount++;
          if (!ymlData && item.name.includes('.yml')) {
            ymlData = await this.getFileContent(
              repo,
              owner,
              item.path,
              octokit,
            );
          }
        }
      }
      const threes = (await Promise.all(threesJobs)).flatMap((tree) => tree);
      for (const three of threes) {
        if (three.type === 'blob') {
          filesCount++;
          if (!ymlData && three.path.includes('.yml')) {
            ymlData = await this.getFileContentByUrl(three.url, octokit);
          }
        }
      }
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

  async repositoryThreeBySHA(
    repo: string,
    owner: string,
    tree_sha: string,
    octokit: Octokit,
  ) {
    try {
      const res = await octokit.request(
        'GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive={recursive}',
        {
          owner,
          repo,
          tree_sha,
          recursive: 1,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return res.data.tree;
    } catch (e) {
      if (e?.status === 404) {
        return null;
      }
      throw new Error(e?.message);
    }
  }

  async getWebHooks(repo: string, owner: string, octokit: Octokit, page = 1) {
    try {
      const PER_PAGE_MAX = 100;
      const webHooks = await octokit.request(
        'GET /repos/{owner}/{repo}/hooks?page={page}&per_page={per_page}',
        {
          owner,
          repo,
          page,
          per_page: PER_PAGE_MAX,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      const data = [...webHooks.data];
      if (data.length === PER_PAGE_MAX) {
        const nextPageResult = await this.getWebHooks(
          repo,
          owner,
          octokit,
          page + 1,
        );
        data.push(...nextPageResult);
      }
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

  async getFileContentByUrl(url: string, octokit: Octokit) {
    const res = await octokit.request(`GET ${url}`);
    return atob(res.data.content);
  }
}
