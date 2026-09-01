/**
 * @duckdb/node-api の最小型定義。
 * 使う機能だけを書いてあり、パッケージが無い開発機でも型検査が通る。
 * 実行時は本物のパッケージ（Railway の npm ci で入る）が使われる。
 */
declare module "@duckdb/node-api" {
  export type DuckDBValue = unknown;
  export interface DuckDBResultReader {
    getRowObjects(): Record<string, DuckDBValue>[];
  }
  export interface DuckDBConnection {
    run(sql: string, values?: DuckDBValue[]): Promise<unknown>;
    runAndReadAll(sql: string, values?: DuckDBValue[]): Promise<DuckDBResultReader>;
    closeSync(): void;
  }
  export class DuckDBInstance {
    static create(path?: string, options?: Record<string, string>): Promise<DuckDBInstance>;
    connect(): Promise<DuckDBConnection>;
    closeSync(): void;
  }
}
