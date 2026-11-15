export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  public isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside window
    const valid = timestamps.filter((t) => now - t < this.windowMs);

    if (valid.length >= this.maxRequests) {
      this.requests.set(key, valid);
      return false;
    }

    valid.push(now);
    this.requests.set(key, valid);
    return true;
  }

  public reset(key: string): void {
    this.requests.delete(key);
  }
}
