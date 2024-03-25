import type { IUnleashConfig } from '../types/option';
import type { IUnleashStores } from '../types/stores';
import type { Logger } from '../logger';
import type { IEventStore } from '../types/stores/event-store';
import type { IFlagResolver } from '../types';

export default class EventAnnouncer {
    private logger: Logger;

    private eventStore: IEventStore;

    private flagResolver: IFlagResolver;

    constructor(
        { eventStore }: Pick<IUnleashStores, 'eventStore'>,
        {
            getLogger,
            flagResolver,
        }: Pick<IUnleashConfig, 'getLogger' | 'flagResolver'>,
    ) {
        this.logger = getLogger('services/event-service.ts');
        this.flagResolver = flagResolver;
        this.eventStore = eventStore;
    }

    async publishUnannouncedEvents(): Promise<void> {
        return this.eventStore.publishUnannouncedEvents();
    }
}
