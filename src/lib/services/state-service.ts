import { stateSchema } from './state-schema';
import {
    DropEnvironmentsEvent,
    DropFeaturesEvent,
    DropFeatureTagsEvent,
    DropProjectsEvent,
    DropStrategiesEvent,
    DropTagsEvent,
    DropTagTypesEvent,
    EnvironmentImport,
    FeatureImport,
    FeatureTagImport,
    ProjectImport,
    StrategyImport,
    TagImport,
    TagTypeImport,
} from '../types/events';

import { filterEqual, filterExisting, parseFile, readFile } from './state-util';

import type { IUnleashConfig } from '../types/option';
import type {
    FeatureToggle,
    IEnvironment,
    IFeatureEnvironment,
    IFeatureStrategy,
    IImportData,
    IImportFile,
    IProject,
    ISegment,
    IStrategyConfig,
    ITag,
} from '../types/model';
import type { Logger } from '../logger';
import type {
    IFeatureTag,
    IFeatureTagStore,
} from '../types/stores/feature-tag-store';
import type { IProjectStore } from '../features/project/project-store-type';
import type {
    ITagType,
    ITagTypeStore,
} from '../features/tag-type/tag-type-store-type';
import type { ITagStore } from '../types/stores/tag-store';
import type { IStrategy, IStrategyStore } from '../types/stores/strategy-store';
import type { IFeatureToggleStore } from '../features/feature-toggle/types/feature-toggle-store-type';
import type { IFeatureStrategiesStore } from '../features/feature-toggle/types/feature-toggle-strategies-store-type';
import type { IEnvironmentStore } from '../features/project-environments/environment-store-type';
import type { IFeatureEnvironmentStore } from '../types/stores/feature-environment-store';
import type { IUnleashStores } from '../types/stores';
import { DEFAULT_ENV } from '../util/constants';
import { GLOBAL_ENV } from '../types/environment';
import type { ISegmentStore } from '../features/segment/segment-store-type';
import type { PartialSome } from '../types/partial';
import type EventService from '../features/events/event-service';
import type { IAuditUser } from '../server-impl';

export interface IBackupOption {
    includeFeatureToggles: boolean;
    includeStrategies: boolean;
    includeProjects: boolean;
    includeTags: boolean;
}

interface IExportIncludeOptions {
    includeFeatureToggles?: boolean;
    includeStrategies?: boolean;
    includeProjects?: boolean;
    includeTags?: boolean;
    includeEnvironments?: boolean;
    includeSegments?: boolean;
}

export default class StateService {
    private logger: Logger;

    private toggleStore: IFeatureToggleStore;

    private featureStrategiesStore: IFeatureStrategiesStore;

    private strategyStore: IStrategyStore;

    private eventService: EventService;

    private tagStore: ITagStore;

    private tagTypeStore: ITagTypeStore;

    private projectStore: IProjectStore;

    private featureEnvironmentStore: IFeatureEnvironmentStore;

    private featureTagStore: IFeatureTagStore;

    private environmentStore: IEnvironmentStore;

    private segmentStore: ISegmentStore;

    constructor(
        stores: IUnleashStores,
        { getLogger }: Pick<IUnleashConfig, 'getLogger'>,
        eventService: EventService,
    ) {
        this.eventService = eventService;
        this.toggleStore = stores.featureToggleStore;
        this.strategyStore = stores.strategyStore;
        this.tagStore = stores.tagStore;
        this.featureStrategiesStore = stores.featureStrategiesStore;
        this.featureEnvironmentStore = stores.featureEnvironmentStore;
        this.tagTypeStore = stores.tagTypeStore;
        this.projectStore = stores.projectStore;
        this.featureTagStore = stores.featureTagStore;
        this.environmentStore = stores.environmentStore;
        this.segmentStore = stores.segmentStore;
        this.logger = getLogger('services/state-service.js');
    }

    async importFile({
        file,
        dropBeforeImport = false,
        auditUser,
        keepExisting = true,
    }: IImportFile): Promise<void> {
        return readFile(file)
            .then((data) => parseFile(file, data))
            .then((data) =>
                this.import({
                    data,
                    auditUser,
                    dropBeforeImport,
                    keepExisting,
                }),
            );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    replaceGlobalEnvWithDefaultEnv(data: any) {
        data.environments?.forEach((e) => {
            if (e.name === GLOBAL_ENV) {
                e.name = DEFAULT_ENV;
            }
        });
        data.featureEnvironments?.forEach((fe) => {
            if (fe.environment === GLOBAL_ENV) {
                // eslint-disable-next-line no-param-reassign
                fe.environment = DEFAULT_ENV;
            }
        });
        data.featureStrategies?.forEach((fs) => {
            if (fs.environment === GLOBAL_ENV) {
                // eslint-disable-next-line no-param-reassign
                fs.environment = DEFAULT_ENV;
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    moveVariantsToFeatureEnvironments(data: any) {
        data.featureEnvironments?.forEach((featureEnvironment) => {
            const feature = data.features?.find(
                (f) => f.name === featureEnvironment.featureName,
            );
            if (feature) {
                featureEnvironment.variants = feature.variants || [];
            }
        });
    }

    async import({
        data,
        auditUser,
        dropBeforeImport = false,
        keepExisting = true,
    }: IImportData): Promise<void> {
        if (data.version === 2) {
            this.replaceGlobalEnvWithDefaultEnv(data);
        }
        if (!data.version || data.version < 4) {
            this.moveVariantsToFeatureEnvironments(data);
        }
        const importData = await stateSchema.validateAsync(data);

        let importedEnvironments: IEnvironment[] = [];
        if (importData.environments) {
            importedEnvironments = await this.importEnvironments({
                environments: data.environments,
                dropBeforeImport,
                keepExisting,
                auditUser,
            });
        }

        if (importData.projects) {
            await this.importProjects({
                projects: data.projects,
                importedEnvironments,
                dropBeforeImport,
                keepExisting,
                auditUser,
            });
        }

        if (importData.features) {
            // biome-ignore lint/suspicious/noImplicitAnyLet: too many formats to consider here. Allowing this to be any
            let projectData;
            if (!importData.version || importData.version === 1) {
                projectData = await this.convertLegacyFeatures(importData);
            } else {
                projectData = importData;
            }
            const { features, featureStrategies, featureEnvironments } =
                projectData;

            await this.importFeatures({
                features,
                dropBeforeImport,
                keepExisting,
                featureEnvironments,
                auditUser,
            });

            if (featureEnvironments) {
                await this.importFeatureEnvironments({
                    featureEnvironments,
                });
            }

            await this.importFeatureStrategies({
                featureStrategies,
                dropBeforeImport,
                keepExisting,
            });
        }

        if (importData.strategies) {
            await this.importStrategies({
                strategies: data.strategies,
                dropBeforeImport,
                keepExisting,
                auditUser,
            });
        }

        if (importData.tagTypes && importData.tags) {
            await this.importTagData({
                tagTypes: data.tagTypes,
                tags: data.tags,
                featureTags:
                    (data.featureTags || [])
                        .filter((t) =>
                            (data.features || []).some(
                                (f) => f.name === t.featureName,
                            ),
                        )
                        .map((t) => ({
                            featureName: t.featureName,
                            tagValue: t.tagValue || t.value,
                            tagType: t.tagType || t.type,
                        })) || [],
                dropBeforeImport,
                keepExisting,
                auditUser,
            });
        }

        if (importData.segments) {
            await this.importSegments(
                data.segments,
                auditUser,
                dropBeforeImport,
            );
        }

        if (importData.featureStrategySegments) {
            await this.importFeatureStrategySegments(
                data.featureStrategySegments,
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    enabledIn(feature: string, env) {
        const config = {};
        env.filter((e) => e.featureName === feature).forEach((e) => {
            config[e.environment] = e.enabled || false;
        });
        return config;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importFeatureEnvironments({ featureEnvironments }): Promise<void> {
        await Promise.all(
            featureEnvironments
                .filter(async (env) => {
                    await this.environmentStore.exists(env.environment);
                })
                .map(async (featureEnvironment) =>
                    this.featureEnvironmentStore.addFeatureEnvironment(
                        featureEnvironment,
                    ),
                ),
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importFeatureStrategies({
        featureStrategies,
        dropBeforeImport,
        keepExisting,
    }): Promise<void> {
        const oldFeatureStrategies = dropBeforeImport
            ? []
            : await this.featureStrategiesStore.getAll();
        if (dropBeforeImport) {
            this.logger.info('Dropping existing strategies for feature flags');
            await this.featureStrategiesStore.deleteAll();
        }
        const strategiesToImport = keepExisting
            ? featureStrategies.filter(
                  (s) => !oldFeatureStrategies.some((o) => o.id === s.id),
              )
            : featureStrategies;
        await Promise.all(
            strategiesToImport.map((featureStrategy) =>
                this.featureStrategiesStore.createStrategyFeatureEnv(
                    featureStrategy,
                ),
            ),
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async convertLegacyFeatures({
        features,
    }): Promise<{ features; featureStrategies; featureEnvironments }> {
        const strategies = features.flatMap((f) =>
            f.strategies.map((strategy: IStrategyConfig) => ({
                featureName: f.name,
                projectId: f.project,
                constraints: strategy.constraints || [],
                parameters: strategy.parameters || {},
                environment: DEFAULT_ENV,
                strategyName: strategy.name,
            })),
        );
        const newFeatures = features;
        const featureEnvironments = features.map((feature) => ({
            featureName: feature.name,
            environment: DEFAULT_ENV,
            enabled: feature.enabled,
            variants: feature.variants || [],
        }));
        return {
            features: newFeatures,
            featureStrategies: strategies,
            featureEnvironments,
        };
    }

    async importFeatures({
        features,
        dropBeforeImport,
        keepExisting,
        featureEnvironments,
        auditUser,
    }): Promise<void> {
        this.logger.info(`Importing ${features.length} feature flags`);
        const oldToggles = dropBeforeImport
            ? []
            : await this.toggleStore.getAll();

        if (dropBeforeImport) {
            this.logger.info('Dropping existing feature flags');
            await this.toggleStore.deleteAll();
            await this.eventService.storeEvent(
                new DropFeaturesEvent({ auditUser }),
            );
        }

        await Promise.all(
            features
                .filter(filterExisting(keepExisting, oldToggles))
                .filter(filterEqual(oldToggles))
                .map(async (feature) => {
                    await this.toggleStore.create(feature.project, {
                        createdByUserId: auditUser.id,
                        ...feature,
                    });
                    await this.featureEnvironmentStore.connectFeatureToEnvironmentsForProject(
                        feature.name,
                        feature.project,
                        this.enabledIn(feature.name, featureEnvironments),
                    );
                    await this.eventService.storeEvent(
                        new FeatureImport({
                            feature,
                            auditUser,
                        }),
                    );
                }),
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importStrategies({
        strategies,
        dropBeforeImport,
        keepExisting,
        auditUser,
    }): Promise<void> {
        this.logger.info(`Importing ${strategies.length} strategies`);
        const oldStrategies = dropBeforeImport
            ? []
            : await this.strategyStore.getAll();

        if (dropBeforeImport) {
            this.logger.info('Dropping existing strategies');
            await this.strategyStore.dropCustomStrategies();
            await this.eventService.storeEvent(
                new DropStrategiesEvent({ auditUser }),
            );
        }

        await Promise.all(
            strategies
                .filter(filterExisting(keepExisting, oldStrategies))
                .filter(filterEqual(oldStrategies))
                .map((strategy) =>
                    this.strategyStore.importStrategy(strategy).then(() => {
                        this.eventService.storeEvent(
                            new StrategyImport({ strategy, auditUser }),
                        );
                    }),
                ),
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importEnvironments({
        environments,
        auditUser,
        dropBeforeImport,
        keepExisting,
    }): Promise<IEnvironment[]> {
        this.logger.info(`Import ${environments.length} projects`);
        const oldEnvs = dropBeforeImport
            ? []
            : await this.environmentStore.getAll();
        if (dropBeforeImport) {
            this.logger.info('Dropping existing environments');
            await this.environmentStore.deleteAll();
            await this.eventService.storeEvent(
                new DropEnvironmentsEvent({ auditUser }),
            );
        }
        const envsImport = environments.filter((env) =>
            keepExisting ? !oldEnvs.some((old) => old.name === env.name) : true,
        );
        let importedEnvs: IEnvironment[] = [];
        if (envsImport.length > 0) {
            importedEnvs =
                await this.environmentStore.importEnvironments(envsImport);
            const importedEnvironmentEvents = importedEnvs.map(
                (env) => new EnvironmentImport({ auditUser, env }),
            );
            await this.eventService.storeEvents(importedEnvironmentEvents);
        }
        return importedEnvs;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importProjects({
        projects,
        importedEnvironments,
        auditUser,
        dropBeforeImport,
        keepExisting,
    }): Promise<void> {
        this.logger.info(`Import ${projects.length} projects`);
        const oldProjects = dropBeforeImport
            ? []
            : await this.projectStore.getAll();
        if (dropBeforeImport) {
            this.logger.info('Dropping existing projects');
            await this.projectStore.deleteAll();
            await this.eventService.storeEvent(
                new DropProjectsEvent({ auditUser }),
            );
        }
        const projectsToImport = projects.filter((project) =>
            keepExisting
                ? !oldProjects.some((old) => old.id === project.id)
                : true,
        );
        if (projectsToImport.length > 0) {
            const importedProjects = await this.projectStore.importProjects(
                projectsToImport,
                importedEnvironments,
            );
            const importedProjectEvents = importedProjects.map(
                (project) => new ProjectImport({ project, auditUser }),
            );
            await this.eventService.storeEvents(importedProjectEvents);
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async importTagData({
        tagTypes,
        tags,
        featureTags,
        auditUser,
        dropBeforeImport,
        keepExisting,
    }): Promise<void> {
        this.logger.info(
            `Importing ${tagTypes.length} tagtypes, ${tags.length} tags and ${featureTags.length} feature tags`,
        );
        const oldTagTypes = dropBeforeImport
            ? []
            : await this.tagTypeStore.getAll();
        const oldTags = dropBeforeImport ? [] : await this.tagStore.getAll();
        const oldFeatureTags = dropBeforeImport
            ? []
            : await this.featureTagStore.getAll();
        if (dropBeforeImport) {
            this.logger.info(
                'Dropping all existing featuretags, tags and tagtypes',
            );
            await this.featureTagStore.deleteAll();
            await this.tagStore.deleteAll();
            await this.tagTypeStore.deleteAll();
            await this.eventService.storeEvents([
                new DropFeatureTagsEvent({ auditUser }),
                new DropTagsEvent({ auditUser }),
                new DropTagTypesEvent({ auditUser }),
            ]);
        }
        await this.importTagTypes(
            tagTypes,
            keepExisting,
            oldTagTypes,
            auditUser,
        );
        await this.importTags(tags, keepExisting, oldTags, auditUser);
        await this.importFeatureTags(
            featureTags,
            keepExisting,
            oldFeatureTags,
            auditUser,
        );
    }

    compareFeatureTags: (old: IFeatureTag, tag: IFeatureTag) => boolean = (
        old,
        tag,
    ) =>
        old.featureName === tag.featureName &&
        old.tagValue === tag.tagValue &&
        old.tagType === tag.tagType;

    async importFeatureTags(
        featureTags: IFeatureTag[],
        keepExisting: boolean,
        oldFeatureTags: IFeatureTag[],
        auditUser: IAuditUser,
    ): Promise<void> {
        const featureTagsToInsert = featureTags
            .filter((tag) =>
                keepExisting
                    ? !oldFeatureTags.some((old) =>
                          this.compareFeatureTags(old, tag),
                      )
                    : true,
            )
            .map((tag) => ({
                createdByUserId: auditUser.id,
                ...tag,
            }));
        if (featureTagsToInsert.length > 0) {
            const importedFeatureTags =
                await this.featureTagStore.tagFeatures(featureTagsToInsert);
            const importedFeatureTagEvents = importedFeatureTags.map(
                (featureTag) => new FeatureTagImport({ featureTag, auditUser }),
            );
            await this.eventService.storeEvents(importedFeatureTagEvents);
        }
    }

    compareTags = (old: ITag, tag: ITag): boolean =>
        old.type === tag.type && old.value === tag.value;

    async importTags(
        tags: ITag[],
        keepExisting: boolean,
        oldTags: ITag[],
        auditUser: IAuditUser,
    ): Promise<void> {
        const tagsToInsert = tags.filter((tag) =>
            keepExisting
                ? !oldTags.some((old) => this.compareTags(old, tag))
                : true,
        );
        if (tagsToInsert.length > 0) {
            const importedTags = await this.tagStore.bulkImport(tagsToInsert);
            const importedTagEvents = importedTags.map(
                (tag) => new TagImport({ tag, auditUser }),
            );
            await this.eventService.storeEvents(importedTagEvents);
        }
    }

    async importTagTypes(
        tagTypes: ITagType[],
        keepExisting: boolean,
        oldTagTypes: ITagType[],
        auditUser: IAuditUser,
    ): Promise<void> {
        const tagTypesToInsert = tagTypes.filter((tagType) =>
            keepExisting
                ? !oldTagTypes.some((t) => t.name === tagType.name)
                : true,
        );
        if (tagTypesToInsert.length > 0) {
            const importedTagTypes =
                await this.tagTypeStore.bulkImport(tagTypesToInsert);
            const importedTagTypeEvents = importedTagTypes.map(
                (tagType) => new TagTypeImport({ tagType, auditUser }),
            );
            await this.eventService.storeEvents(importedTagTypeEvents);
        }
    }

    async importSegments(
        segments: PartialSome<ISegment, 'id'>[],
        auditUser: IAuditUser,
        dropBeforeImport: boolean,
    ): Promise<void> {
        if (dropBeforeImport) {
            await this.segmentStore.deleteAll();
        }

        await Promise.all(
            segments.map((segment) =>
                this.segmentStore.create(segment, {
                    username: auditUser.username,
                }),
            ),
        );
    }

    async importFeatureStrategySegments(
        featureStrategySegments: {
            featureStrategyId: string;
            segmentId: number;
        }[],
    ): Promise<void> {
        await Promise.all(
            featureStrategySegments.map(({ featureStrategyId, segmentId }) =>
                this.segmentStore.addToStrategy(segmentId, featureStrategyId),
            ),
        );
    }

    async export(opts: IExportIncludeOptions): Promise<{
        features: FeatureToggle[];
        strategies: IStrategy[];
        version: number;
        projects: IProject[];
        tagTypes: ITagType[];
        tags: ITag[];
        featureTags: IFeatureTag[];
        featureStrategies: IFeatureStrategy[];
        environments: IEnvironment[];
        featureEnvironments: IFeatureEnvironment[];
    }> {
        return this.exportV4(opts);
    }

    async exportV4({
        includeFeatureToggles = true,
        includeStrategies = true,
        includeProjects = true,
        includeTags = true,
        includeEnvironments = true,
        includeSegments = true,
    }: IExportIncludeOptions): Promise<{
        features: FeatureToggle[];
        strategies: IStrategy[];
        version: number;
        projects: IProject[];
        tagTypes: ITagType[];
        tags: ITag[];
        featureTags: IFeatureTag[];
        featureStrategies: IFeatureStrategy[];
        environments: IEnvironment[];
        featureEnvironments: IFeatureEnvironment[];
    }> {
        return Promise.all([
            includeFeatureToggles
                ? this.toggleStore.getAll({ archived: false })
                : Promise.resolve([]),
            includeStrategies
                ? this.strategyStore.getEditableStrategies()
                : Promise.resolve([]),
            this.projectStore && includeProjects
                ? this.projectStore.getAll()
                : Promise.resolve([]),
            includeTags ? this.tagTypeStore.getAll() : Promise.resolve([]),
            includeTags ? this.tagStore.getAll() : Promise.resolve([]),
            includeTags && includeFeatureToggles
                ? this.featureTagStore.getAll()
                : Promise.resolve([]),
            includeFeatureToggles
                ? this.featureStrategiesStore.getAll()
                : Promise.resolve([]),
            includeEnvironments
                ? this.environmentStore.getAll()
                : Promise.resolve([]),
            includeFeatureToggles
                ? this.featureEnvironmentStore.getAll()
                : Promise.resolve([]),
            includeSegments ? this.segmentStore.getAll() : Promise.resolve([]),
            includeSegments
                ? this.segmentStore.getAllFeatureStrategySegments()
                : Promise.resolve([]),
        ]).then(
            ([
                features,
                strategies,
                projects,
                tagTypes,
                tags,
                featureTags,
                featureStrategies,
                environments,
                featureEnvironments,
                segments,
                featureStrategySegments,
            ]) => ({
                version: 4,
                features,
                strategies,
                projects,
                tagTypes,
                tags,
                featureTags,
                featureStrategies: featureStrategies.filter((fS) =>
                    features.some((f) => fS.featureName === f.name),
                ),
                environments,
                featureEnvironments: featureEnvironments.filter((fE) =>
                    features.some((f) => fE.featureName === f.name),
                ),
                segments,
                featureStrategySegments,
            }),
        );
    }
}

module.exports = StateService;
