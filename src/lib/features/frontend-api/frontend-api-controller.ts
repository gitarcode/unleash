import type { Request } from 'express';
import Controller from '../../routes/controller';
import { type IUnleashConfig, type IUnleashServices, NONE } from '../../types';
import type { Logger } from '../../logger';
import type { IApiUser } from '../../types/api-user';
import {
    createRequestSchema,
    createResponseSchema,
    emptyResponse,
    getStandardResponses,
} from '../../openapi';
import { corsOriginMiddleware } from '../../middleware';
import rateLimit from 'express-rate-limit';
import { minutesToMilliseconds } from 'date-fns';
import metricsHelper from '../../util/metrics-helper';
import { FUNCTION_TIME } from '../../metric-events';

interface ApiUserRequest<
    PARAM = any,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
> extends Request<PARAM, ResBody, ReqBody, ReqQuery> {
    user: IApiUser;
}

type Services = Pick<
    IUnleashServices,
    'settingService' | 'frontendApiService' | 'openApiService'
>;

export default class FrontendAPIController extends Controller {
    private readonly logger: Logger;

    private services: Services;

    private timer: Function;

    constructor(config: IUnleashConfig, services: Services) {
        super(config);
        this.logger = config.getLogger('frontend-api-controller.ts');
        this.services = services;

        this.timer = (functionName) =>
            metricsHelper.wrapTimer(config.eventBus, FUNCTION_TIME, {
                className: 'FrontendAPIController',
                functionName,
            });

        // Support CORS requests for the frontend endpoints.
        // Preflight requests are handled in `app.ts`.
        this.app.use(corsOriginMiddleware(services, config));

        this.route({
            method: 'get',
            path: '',
            handler: this.getFrontendApiFeatures,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    operationId: 'getFrontendFeatures',
                    responses: {
                        200: createResponseSchema('frontendApiFeaturesSchema'),
                        ...getStandardResponses(401, 404),
                    },
                    summary:
                        'Retrieve enabled feature flags for the provided context.',
                    description:
                        'This endpoint returns the list of feature flags that the frontend API evaluates to enabled for the given context. Context values are provided as query parameters. If the Frontend API is disabled 404 is returned.',
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '',
            handler: FrontendAPIController.endpointNotImplemented,
            permission: NONE,
        });

        this.route({
            method: 'get',
            path: '/client/features',
            handler: FrontendAPIController.endpointNotImplemented,
            permission: NONE,
        });

        this.route({
            method: 'post',
            path: '/client/metrics',
            handler: this.registerFrontendApiMetrics,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    summary: 'Register client usage metrics',
                    description: `Registers usage metrics. Stores information about how many times each flag was evaluated to enabled and disabled within a time frame. If provided, this operation will also store data on how many times each feature flag's variants were displayed to the end user. If the Frontend API is disabled 404 is returned.`,
                    operationId: 'registerFrontendMetrics',
                    requestBody: createRequestSchema('clientMetricsSchema'),
                    responses: {
                        200: emptyResponse,
                        204: emptyResponse,
                        ...getStandardResponses(400, 401, 404),
                    },
                }),
                rateLimit({
                    windowMs: minutesToMilliseconds(1),
                    max: config.metricsRateLimiting.frontendMetricsMaxPerMinute,
                    validate: false,
                    standardHeaders: true,
                    legacyHeaders: false,
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '/client/register',
            handler: this.registerFrontendApiClient,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    summary: 'Register a client SDK',
                    description:
                        'This is for future use. Currently Frontend client registration is not supported. Returning 200 for clients that expect this status code. If the Frontend API is disabled 404 is returned.',
                    operationId: 'registerFrontendClient',
                    requestBody: createRequestSchema('frontendApiClientSchema'),
                    responses: {
                        200: emptyResponse,
                        ...getStandardResponses(400, 401, 404),
                    },
                }),
                rateLimit({
                    windowMs: minutesToMilliseconds(1),
                    max: config.metricsRateLimiting
                        .frontendRegisterMaxPerMinute,
                    validate: false,
                    standardHeaders: true,
                    legacyHeaders: false,
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/health',
            handler: FrontendAPIController.endpointNotImplemented,
            permission: NONE,
        });

        this.route({
            method: 'get',
            path: '/internal-backstage/prometheus',
            handler: FrontendAPIController.endpointNotImplemented,
            permission: NONE,
        });
    }
}
