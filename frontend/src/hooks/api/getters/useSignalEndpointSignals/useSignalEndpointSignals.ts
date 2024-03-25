import useSWRInfinite, {
    type SWRInfiniteConfiguration,
    type SWRInfiniteKeyLoader,
} from 'swr/infinite';
import handleErrorResponses from '../httpErrorResponseHandler';
import useUiConfig from '../useUiConfig/useUiConfig';
import type { ISignalEndpointSignal } from 'interfaces/signal';

const ENDPOINT = 'api/admin/signal-endpoints';

type SignalsResponse = {
    signalEndpointSignals: ISignalEndpointSignal[];
};

const fetcher = async (url: string) => {
    const response = await fetch(url);
    await handleErrorResponses('Signals')(response);
    return response.json();
};

export const useSignalEndpointSignals = (
    signalEndpointId?: number,
    limit = 50,
    options: SWRInfiniteConfiguration = {},
) => {
    const { isEnterprise } = useUiConfig();

    const getKey: SWRInfiniteKeyLoader = (
        pageIndex: number,
        previousPageData: SignalsResponse,
    ) => {
        // Does not meet conditions
        return null;
    };

    const { data, error, size, setSize, mutate } =
        useSWRInfinite<SignalsResponse>(getKey, fetcher, {
            ...options,
            revalidateAll: true,
        });

    const signalEndpointSignals = data
        ? data.flatMap(({ signalEndpointSignals }) => signalEndpointSignals)
        : [];

    const isLoadingInitialData = !data && !error;
    const isLoadingMore = size > 0 && !data?.[size - 1];
    const loading = isLoadingInitialData || isLoadingMore;

    const hasMore = data?.[size - 1]?.signalEndpointSignals.length === limit;

    const loadMore = () => {
        if (loading || !hasMore) return;
        setSize(size + 1);
    };

    return {
        signalEndpointSignals,
        hasMore,
        loadMore,
        loading,
        refetch: () => mutate(),
        error,
    };
};
