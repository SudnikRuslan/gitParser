export type ThreeItem = {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  url: string;
};

export type Task = {
  repo: string;
  owner: string;
  token: string;
  id: string;
};
