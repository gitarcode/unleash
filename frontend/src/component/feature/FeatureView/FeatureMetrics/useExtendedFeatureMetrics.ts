import useUiConfig from 'hooks/api/getters/useUiConfig/useUiConfig';

export const useExtendedFeatureMetrics = () => {
    const { isEnterprise } = useUiConfig();
    const extendedOptions = isEnterprise();

    return extendedOptions;
};
