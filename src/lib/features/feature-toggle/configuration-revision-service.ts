import type { Logger } from '../../logger';
import type {
    IEventStore,
    IFlagResolver,
    IUnleashConfig,
    IUnleashStores,
} from '../../types';
import EventEmitter from 'events';

export const UPDATE_REVISION = 'UPDATE_REVISION';

export default class ConfigurationRevisionService extends EventEmitter {
    private static instance: ConfigurationRevisionService;

    private logger: Logger;

    private eventStore: IEventStore;

    private revisionId: number;

    private flagResolver: IFlagResolver;

    static getInstance(
        { eventStore }: Pick<IUnleashStores, 'eventStore'>,
        {
            getLogger,
            flagResolver,
        }: Pick<IUnleashConfig, 'getLogger' | 'flagResolver'>,
    ) {
        if (!ConfigurationRevisionService.instance) {
            ConfigurationRevisionService.instance =
                new ConfigurationRevisionService(
                    { eventStore },
                    { getLogger, flagResolver },
                );
        }
        return ConfigurationRevisionService.instance;
    }

    async getMaxRevisionId(): Promise<number> {
        if (this.revisionId > 0) {
            return this.revisionId;
        } else {
            return this.updateMaxRevisionId();
        }
    }

    async updateMaxRevisionId(): Promise<number> {
        const revisionId = await this.eventStore.getMaxRevisionId(
            this.revisionId,
        );
        if (this.revisionId !== revisionId) {
            this.logger.debug(
                'Updating feature configuration with new revision Id',
                revisionId,
            );
            this.emit(UPDATE_REVISION, revisionId);
            this.revisionId = revisionId;
        }

        return this.revisionId;
    }

    destroy(): void {
        ConfigurationRevisionService.instance?.removeAllListeners();
    }
}
