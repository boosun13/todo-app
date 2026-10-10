export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} が見つかりません`);
    this.name = "NotFoundError";
  }
}
