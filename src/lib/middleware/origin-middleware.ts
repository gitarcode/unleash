import type { Request, Response, NextFunction } from 'express';
import type { IUnleashConfig } from '../types';

export const originMiddleware = ({
    getLogger,
}: Pick<IUnleashConfig, 'getLogger' | 'eventBus' | 'flagResolver'>) => {
    const logger = getLogger('/middleware/origin-middleware.ts');
    logger.debug('Enabling origin middleware');

    return (req: Request, _: Response, next: NextFunction) => {
        return next();
    };
};
