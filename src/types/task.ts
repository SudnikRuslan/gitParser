export type Task = {
  task: <T>() => Promise<T>;
  id: string;
};
