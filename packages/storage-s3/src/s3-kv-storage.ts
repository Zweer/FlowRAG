import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { KVStorage } from '@flowrag/core';

export interface S3KVStorageOptions {
  bucket: string;
  prefix?: string;
  region?: string;
}

export class S3KVStorage implements KVStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(options: S3KVStorageOptions) {
    this.bucket = options.bucket;
    this.prefix = options.prefix ?? '';
    this.client = new S3Client({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
  }

  private key(k: string): string {
    return `${this.prefix}${k.replace(/[/\\]/g, '_')}.json`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(key) }),
      );
      const body = await response.Body?.transformToString();
      return body ? (JSON.parse(body) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(key),
        Body: JSON.stringify(value),
        ContentType: 'application/json',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(key) }));
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    for (;;) {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: this.prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        if (!obj.Key) continue;
        const k = obj.Key.slice(this.prefix.length).replace(/\.json$/, '');
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }

      if (!response.IsTruncated) break;
      continuationToken = response.NextContinuationToken;
    }

    return keys;
  }

  async clear(): Promise<void> {
    const keys = await this.list();
    await Promise.all(keys.map((k) => this.delete(k)));
  }
}
