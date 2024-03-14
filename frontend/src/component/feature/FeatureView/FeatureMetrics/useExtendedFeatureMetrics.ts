import useUiConfig from 'hooks/api/getters/useUiConfig/useUiConfig';

export const useExtendedFeatureMetrics = () => {
    const { isEnterprise } = useUiConfig();

    return false;
};
