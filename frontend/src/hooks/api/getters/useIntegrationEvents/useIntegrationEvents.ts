import { useContext } from 'react';
import useSWRInfinite, {
    type SWRInfiniteConfiguration,
    type SWRInfiniteKeyLoader,
} from 'swr/infinite';
import type { IntegrationEvents } from 'interfaces/integrationEvent';
import handleErrorResponses from '../httpErrorResponseHandler';

const fetcher = async (url: string) => {
    const response = await fetch(url);
    await handleErrorResponses('Integration events')(response);
    return response.json();
};

export const useIntegrationEvents = (
    integrationId?: number,
    limit = 50,
    options: SWRInfiniteConfiguration = {},
) => {
    const getKey: SWRInfiniteKeyLoader = (
        pageIndex: number,
        previousPageData: IntegrationEvents,
    ) => {
        // Does not meet conditions
        return null;
    };

    const { data, error, size, setSize, mutate } =
        useSWRInfinite<IntegrationEvents>(getKey, fetcher, {
            ...options,
            revalidateAll: true,
        });

    const integrationEvents = data
        ? data.flatMap(({ integrationEvents }) => integrationEvents)
        : [];

    const isLoadingInitialData = !data && !error;
    const isLoadingMore = size > 0 && !data?.[size - 1];
    const loading = isLoadingInitialData || isLoadingMore;

    const hasMore = data?.[size - 1]?.integrationEvents.length === limit;

    const loadMore = () => {
        if (loading || !hasMore) return;
        setSize(size + 1);
    };

    return {
        integrationEvents,
        hasMore,
        loadMore,
        loading,
        refetch: () => mutate(),
        error,
    };
};
