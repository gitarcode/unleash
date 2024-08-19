import merge from 'deepmerge';
import {
    type IUnleashConfig,
    type IUnleashOptions,
} from '../../lib/types/option';
import getLogger from '../fixtures/no-logger';
import { createConfig } from '../../lib/create-config';

function mergeAll<T>(objects: Partial<T>[]): T {
    return merge.all<T>(objects.filter((i) => i));
}

export function createTestConfig(config?: IUnleashOptions): IUnleashConfig {
    getLogger.setMuteError(true);
    const options = mergeAll<IUnleashOptions>([true, config || {}]);
    return createConfig(options);
}
