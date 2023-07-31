import Cookies from 'js-cookie';
export type StorageType = 'cookie' | 'local' | 'memory';
export interface BaseStorageOptions {
    keySuffix?: string;
}
export interface MemoryStorageOptions extends BaseStorageOptions {
    sharedContext?: boolean;
}
export declare abstract class BaseStorage {
    protected options: BaseStorageOptions;
    constructor(options?: BaseStorageOptions);
    protected getSuffixedKey(key: string): string;
    abstract set(key: string, value: string, options?: unknown): void;
    abstract get(key: string): string;
    abstract delete(key: string): void;
}
/**
 * A normalized implementation for Cookie store. It implements the BaseStorage interface
 * which allows developers to easily switch between Cookie, LocalStorage, Memory store
 * or a customized storage. This class is mainly used for commerce-sdk-react library
 * to store authentication tokens.
 */
export declare class CookieStorage extends BaseStorage {
    constructor(options?: BaseStorageOptions);
    set(key: string, value: string, options?: Cookies.CookieAttributes): void;
    get(key: string): string;
    delete(key: string): void;
}
/**
 * A normalized implementation for LocalStorage. It implements the BaseStorage interface
 * which allows developers to easily switch between Cookie, LocalStorage, Memory store
 * or a customized storage. This class is mainly used for commerce-sdk-react library
 * to store authentication tokens.
 */
export declare class LocalStorage extends BaseStorage {
    constructor(options?: BaseStorageOptions);
    set(key: string, value: string): void;
    get(key: string): string;
    delete(key: string): void;
}
export declare class MemoryStorage extends BaseStorage {
    private map;
    constructor(options?: MemoryStorageOptions);
    set(key: string, value: string): void;
    get(key: string): string;
    delete(key: string): void;
}
//# sourceMappingURL=storage.d.ts.map