import useSWRInfinite, {
    type SWRInfiniteConfiguration,
    type SWRInfiniteKeyLoader,
} from 'swr/infinite';
import handleErrorResponses from '../httpErrorResponseHandler';
import type { IActionSetEvent } from 'interfaces/action';

type ActionEventsResponse = {
    actionSetEvents: IActionSetEvent[];
};

const fetcher = async (url: string) => {
    const response = await fetch(url);
    await handleErrorResponses('Action events')(response);
    return response.json();
};

export const useActionEvents = (
    actionSetId?: number,
    projectId?: string,
    limit = 50,
    options: SWRInfiniteConfiguration = {},
) => {
    const getKey: SWRInfiniteKeyLoader = (
        pageIndex: number,
        previousPageData: ActionEventsResponse,
    ) => {
        // Does not meet conditions
        return null;
    };

    const { data, error, size, setSize, mutate } =
        useSWRInfinite<ActionEventsResponse>(getKey, fetcher, {
            ...options,
            revalidateAll: true,
        });

    const actionEvents = data
        ? data.flatMap(({ actionSetEvents }) => actionSetEvents)
        : [];

    const isLoadingInitialData = !data && !error;
    const isLoadingMore = size > 0 && !data?.[size - 1];
    const loading = isLoadingInitialData || isLoadingMore;

    const hasMore = data?.[size - 1]?.actionSetEvents.length === limit;

    const loadMore = () => {
        if (loading || !hasMore) return;
        setSize(size + 1);
    };

    return {
        actionEvents,
        hasMore,
        loadMore,
        loading,
        refetch: () => mutate(),
        error,
    };
};
