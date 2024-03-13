import { Request, Response } from 'express';
import Controller from '../controller';
import { IUnleashConfig, IUnleashServices, NONE } from '../../types';
import { Logger } from '../../logger';
import { IApiUser } from '../../types/api-user';
import {
    ClientMetricsSchema,
    createRequestSchema,
    createResponseSchema,
    emptyResponse,
    getStandardResponses,
    ProxyClientSchema,
    ProxyFeaturesSchema,
} from '../../openapi';
import { Context } from 'unleash-client';
import { enrichContextWithIp } from '../../proxy';
import { corsOriginMiddleware } from '../../middleware';
import NotImplementedError from '../../error/not-implemented-error';
import NotFoundError from '../../error/notfound-error';
import rateLimit from 'express-rate-limit';
import { minutesToMilliseconds } from 'date-fns';

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
    'settingService' | 'proxyService' | 'openApiService'
>;

export default class FrontendAPIController extends Controller {
    private readonly logger: Logger;

    private services: Services;

    constructor(config: IUnleashConfig, services: Services) {
        super(config);
        this.logger = config.getLogger('proxy-api/index.ts');
        this.services = services;

        // Support CORS requests for the frontend endpoints.
        // Preflight requests are handled in `app.ts`.
        this.app.use(corsOriginMiddleware(services, config));

        this.route({
            method: 'get',
            path: '',
            handler: this.getProxyFeatures,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    operationId: 'getFrontendFeatures',
                    responses: {
                        200: createResponseSchema('proxyFeaturesSchema'),
                        ...getStandardResponses(401, 404),
                    },
                    summary:
                        'Retrieve enabled feature toggles for the provided context.',
                    description:
                        'This endpoint returns the list of feature toggles that the proxy evaluates to enabled for the given context. Context values are provided as query parameters. If the Frontend API is disabled 404 is returned.',
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
            handler: this.registerProxyMetrics,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    summary: 'Register client usage metrics',
                    description: `Registers usage metrics. Stores information about how many times each toggle was evaluated to enabled and disabled within a time frame. If provided, this operation will also store data on how many times each feature toggle's variants were displayed to the end user. If the Frontend API is disabled 404 is returned.`,
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
            handler: this.registerProxyClient,
            permission: NONE,
            middleware: [
                this.services.openApiService.validPath({
                    tags: ['Frontend API'],
                    summary: 'Register a client SDK',
                    description:
                        'This is for future use. Currently Frontend client registration is not supported. Returning 200 for clients that expect this status code. If the Frontend API is disabled 404 is returned.',
                    operationId: 'registerFrontendClient',
                    requestBody: createRequestSchema('proxyClientSchema'),
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

    private static async endpointNotImplemented(
        req: ApiUserRequest,
        res: Response,
    ) {
        const error = new NotImplementedError(
            'The frontend API does not support this endpoint.',
        );
        res.status(error.statusCode).json(error);
    }

    private async getProxyFeatures(
        req: ApiUserRequest,
        res: Response<ProxyFeaturesSchema>,
    ) {
        throw new NotFoundError();
    }

    private async registerProxyMetrics(
        req: ApiUserRequest<unknown, unknown, ClientMetricsSchema>,
        res: Response,
    ) {
        throw new NotFoundError();
    }

    private async registerProxyClient(
        req: ApiUserRequest<unknown, unknown, ProxyClientSchema>,
        res: Response<string>,
    ) {
        throw new NotFoundError();
    }

    private static createContext(req: ApiUserRequest): Context {
        const { query } = req;
        return enrichContextWithIp(query, req.ip);
    }
}
